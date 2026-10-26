import { icon } from "./icons.js";
import { onLocaleChange, msg, setAttribute } from "./i18n.js";
import { indexedTitle } from "./resource-index.js";
import type { ResourceLink } from "@nuva/sdk";
import {
  resourcePresentation,
  type ResourcePresentation,
} from "./resource-presentation.js";
import { node } from "./ui.js";
interface Entry {
  data?: unknown;
  pending?: Promise<unknown>;
}
interface Slot {
  record: ResourceLink;
  element: HTMLElement;
  compact: boolean;
  loaded: boolean;
  visible: boolean;
}
/** Names and previews are hydrated in place; network completion never reorders message parts. */
export class ResourceCards {
  private cache = new Map<string, Entry>();
  private slots = new Map<HTMLElement, Slot>();
  private queue: (() => void)[] = [];
  private active = 0;
  private disposed = false;
  private jobs = new Map<string, () => void>();
  private observer?: IntersectionObserver;
  private stopLocale?: () => void;
  constructor(
    private options: {
      root: HTMLElement;
      indexLabel?(record: ResourceLink): string | undefined;
      read(record: ResourceLink): Promise<unknown>;
      watchJob?(id: string, receive: (value: unknown) => void): () => void;
      open(record: ResourceLink): void;
      layout(change: () => void): void;
    },
  ) {
    this.stopLocale = onLocaleChange(() =>
      this.options.layout(() => {
        for (const slot of this.slots.values())
          if (slot.element.isConnected) {
            const data = this.cache.get(
              `${slot.record.ref.kind}:${slot.record.ref.id}`,
            )?.data;
            this.paint(
              slot,
              resourcePresentation(slot.record, data),
              data === undefined
                ? ((slot.element.dataset.previewState as "loading" | "error") ??
                    "loading")
                : "ready",
            );
          }
      }),
    );
    if (typeof IntersectionObserver !== "undefined")
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const slot = this.slots.get(entry.target as HTMLElement);
            if (!slot) continue;
            slot.visible = entry.isIntersecting;
            if (entry.isIntersecting && !slot.loaded) {
              slot.loaded = true;
              void this.hydrate(slot);
            } else if (entry.isIntersecting && slot.record.ref.kind === "job")
              this.watch(slot.record.ref.id);
            else if (!entry.isIntersecting) this.stopHiddenJobs();
          }
        },
        { root: options.root, rootMargin: "180px" },
      );
  }
  create(record: ResourceLink, compact = false) {
    const element = node(
        "div",
        "",
        `resource-preview${compact ? " resource-attachment" : ""}`,
      ),
      slot = {
        record,
        element,
        compact,
        loaded: false,
        visible: !this.observer,
      };
    element.dataset.resourceKind = record.ref.kind;
    if (!compact && ["prompt", "batch", "ad", "job"].includes(record.ref.kind))
      element.classList.add("resource-compact");
    element.dataset.resourceId = record.ref.id;
    this.slots.set(element, slot);
    this.paint(slot, resourcePresentation(record), "loading");
    if (this.observer) this.observer.observe(element);
    else {
      slot.loaded = true;
      queueMicrotask(() => void this.hydrate(slot));
    }
    return element;
  }
  label(record: ResourceLink): ResourceLink {
    const data = this.cache.get(`${record.ref.kind}:${record.ref.id}`)?.data;
    const view = resourcePresentation(record, data),
      index = this.options.indexLabel?.(record),
      title = indexedTitle(record.ref.kind, view.title, index);
    return {
      ...record,
      label: index && title !== index ? `${index} · ${title}` : title,
    };
  }
  private load(record: ResourceLink): Promise<unknown> {
    const key = `${record.ref.kind}:${record.ref.id}`,
      entry = this.cache.get(key);
    if (entry?.pending) return entry.pending;
    const mutable = ["product", "brand", "character", "job", "batch"].includes(
      record.ref.kind,
    );
    if (entry?.data !== undefined && !mutable)
      return Promise.resolve(entry.data);
    const next: Entry = {};
    next.pending = new Promise((resolve, reject) => {
      this.queue.push(() => {
        this.active++;
        Promise.resolve()
          .then(() => this.options.read(record))
          .then((value) => {
            next.data = value;
            resolve(value);
          }, reject)
          .finally(() => {
            next.pending = undefined;
            this.active--;
            this.drain();
          });
      });
    });
    this.cache.set(key, next);
    while (this.cache.size > 150) {
      const oldest = this.cache.keys().next().value as string;
      if (this.cache.get(oldest)?.pending) break;
      this.cache.delete(oldest);
    }
    this.drain();
    return next.pending;
  }
  private drain() {
    while (!this.disposed && this.active < 4 && this.queue.length)
      this.queue.shift()!();
  }
  private async hydrate(slot: Slot) {
    try {
      const value = await this.load(slot.record);
      if (this.disposed || !slot.element.isConnected) return;
      const view = resourcePresentation(slot.record, value);
      this.options.layout(() => this.paint(slot, view, "ready"));
      if (
        slot.record.ref.kind === "job" &&
        ["queued", "running"].includes(view.status ?? "") &&
        slot.visible
      )
        this.watch(slot.record.ref.id);
    } catch {
      if (!this.disposed && slot.element.isConnected)
        this.options.layout(() =>
          this.paint(slot, resourcePresentation(slot.record), "error"),
        );
    }
  }
  private paint(
    slot: Slot,
    view: ResourcePresentation,
    state: "loading" | "ready" | "error",
  ) {
    const element = slot.element;
    element.dataset.previewState = state;
    element.dataset.previewKind = view.kind.toLowerCase();
    const index = this.options.indexLabel?.(slot.record),
      compactRow = element.classList.contains("resource-compact");
    const title = indexedTitle(slot.record.ref.kind, view.title, index);
    const primary = compactRow && index ? index : title;
    const open = node("button", "", "resource-preview-open");
    open.type = "button";
    setAttribute(
      open,
      "aria-label",
      msg("Open {p0}: {p1}", { p0: index ?? msg(view.kind), p1: title }),
    );
    open.onclick = () =>
      this.options.open({ ...slot.record, label: view.title });
    const visual = node("span", "", "resource-preview-visual");
    visual.append(icon(view.icon));
    if (view.image) {
      visual.classList.add("has-image");
      const image = node("img");
      image.src = view.image;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.onerror = () => {
        visual.replaceChildren(icon(view.icon));
      };
      visual.replaceChildren(image);
    }
    const content = node("span", "", "resource-preview-copy");
    content.append(
      node(
        "span",
        index && primary !== index ? index : msg(view.kind),
        "resource-preview-kind",
      ),
      node("strong", primary, "resource-preview-title"),
    );
    if (compactRow && title !== primary)
      content.append(node("span", title, "resource-compact-description"));
    if (view.summary && !slot.compact && !compactRow)
      content.append(
        node(
          "span",
          view.summary.length > 280
            ? view.summary.slice(0, 280).trimEnd() + "…"
            : view.summary,
          "resource-preview-summary",
        ),
      );
    if (
      view.meta &&
      !(compactRow && slot.record.ref.kind === "batch" && title !== primary)
    )
      content.append(node("span", view.meta, "resource-preview-meta"));
    if (state === "loading")
      content.append(
        node("span", msg("Loading preview…"), "resource-preview-meta"),
      );
    if (state === "error")
      content.append(
        node("span", msg("Preview unavailable"), "resource-preview-meta"),
      );
    if (view.status) element.dataset.jobStatus = view.status;
    open.append(visual, content);
    element.replaceChildren(open);
    if (state === "error") {
      const retry = node(
        "button",
        msg("Retry preview"),
        "resource-preview-retry",
      );
      retry.type = "button";
      retry.onclick = () => {
        this.paint(slot, view, "loading");
        void this.hydrate(slot);
      };
      element.append(retry);
    }
  }
  private watch(id: string) {
    if (this.disposed || this.jobs.has(id) || !this.options.watchJob) return;
    const cached = this.cache.get(`job:${id}`)?.data as
      | { status?: string }
      | undefined;
    if (!cached || !["queued", "running"].includes(cached.status ?? "")) return;
    let finished = false;
    const stop = this.options.watchJob(id, (value) => {
      if (this.disposed) return;
      const entry = this.cache.get(`job:${id}`);
      if (entry) entry.data = value;
      for (const slot of this.slots.values())
        if (
          slot.element.isConnected &&
          slot.record.ref.kind === "job" &&
          slot.record.ref.id === id
        )
          this.options.layout(() =>
            this.paint(slot, resourcePresentation(slot.record, value), "ready"),
          );
      const status = (value as { status?: string }).status;
      if (!["queued", "running"].includes(status ?? "")) {
        finished = true;
        this.jobs.get(id)?.();
        this.jobs.delete(id);
      }
    });
    if (finished) stop();
    else this.jobs.set(id, stop);
  }
  private stopHiddenJobs() {
    for (const [id, stop] of this.jobs)
      if (
        ![...this.slots.values()].some(
          (slot) =>
            slot.visible &&
            slot.element.isConnected &&
            slot.record.ref.kind === "job" &&
            slot.record.ref.id === id,
        )
      ) {
        stop();
        this.jobs.delete(id);
      }
  }
  prune() {
    for (const [element] of this.slots)
      if (!element.isConnected) {
        this.observer?.unobserve(element);
        this.slots.delete(element);
      }
    this.stopHiddenJobs();
  }
  dispose() {
    this.disposed = true;
    this.stopLocale?.();
    this.observer?.disconnect();
    for (const stop of this.jobs.values()) stop();
    this.jobs.clear();
    this.slots.clear();
    this.cache.clear();
    this.queue = [];
  }
}
