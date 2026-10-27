import {
  msg,
  setText,
  setAttribute,
  resolveLabel,
  type UiLabel,
  UiError,
} from "./i18n.js";
import { icon, type IconName } from "./icons.js";
/** DOM helpers deliberately render service/model data as text, never HTML. */
export function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text: UiLabel = "",
  className = "",
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (typeof text === "string") element.textContent = text;
  else setText(element, text);
  element.className = className;
  return element;
}
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new UiError(msg("Missing UI element: {p0}", { p0: id }));
  return element as T;
}
export function button(
  label: UiLabel,
  action: () => unknown,
  className = "",
  name?: IconName,
  iconOnly = false,
) {
  const element = node("button", label, className);
  element.type = "button";
  element.onclick = () => void action();
  if (name) {
    element.classList.add(iconOnly ? "icon-button" : "button-with-icon");
    if (iconOnly) {
      element.textContent = "";
      setAttribute(element, "aria-label", label);
      setAttribute(element, "title", label);
    }
    element.prepend(icon(name));
  }
  return element;
}
export function field(label: UiLabel, value = "", multiline = false) {
  const wrapper = node("label", "", "field");
  const input = multiline ? node("textarea") : node("input");
  input.value = value;
  wrapper.append(node("span", label), input);
  return { wrapper, input };
}
export function details(
  title: UiLabel,
  value: unknown,
  key = typeof title === "string" ? title : JSON.stringify(title),
) {
  const element = node("details");
  element.dataset.disclosureKey = key;
  element.append(
    node("summary", title),
    node("pre", JSON.stringify(value, null, 2)),
  );
  return element;
}
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let noticeKey: string | undefined;
export function dismissNotice(key?: string) {
  if (key !== undefined && key !== noticeKey) return;
  clearTimeout(noticeTimer);
  noticeTimer = undefined;
  noticeKey = undefined;
  byId("notice").hidden = true;
}
export function notice(message: UiLabel, error = false, options: { key?: string; durationMs?: number; replace?: boolean } = {}) {
  const el = byId("notice");
  if (options.replace === false && !el.hidden && noticeKey !== options.key) return;
  clearTimeout(noticeTimer);
  noticeKey = options.key;
  setText(el, message);
  el.className = error ? "notice error" : "notice";
  el.hidden = false;
  noticeTimer = options.durationMs === undefined ? undefined : setTimeout(() => dismissNotice(options.key), options.durationMs);
}
export function report(error: unknown) {
  if (error instanceof UiError) {
    notice(error.uiMessage, true);
    return;
  }
  const value = error as {
    code?: string;
    message?: string;
    asset?: { id?: string };
  };
  notice(
    `${value.code ? value.code + ": " : ""}${value.message ?? String(error)}${value.asset?.id ? ` Uploaded Asset retained: ${value.asset.id}.` : ""}`,
    true,
  );
}
export async function action<T>(run: () => Promise<T>): Promise<T | undefined> {
  try {
    return await run();
  } catch (error) {
    report(error);
    return undefined;
  }
}
export function media(url: string, kind: "image"): HTMLImageElement;
export function media(url: string, kind: "video"): HTMLVideoElement;
export function media(
  url: string,
  kind: "image" | "video",
): HTMLImageElement | HTMLVideoElement;
export function media(url: string, kind: "image" | "video") {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new UiError(msg("Unsupported media URL."));
  if (kind === "image") {
    const image = node("img");
    image.src = url;
    setAttribute(image, "alt", msg("Product reference"));
    image.onerror = () => {
      setAttribute(image, "alt", msg("Image unavailable. Refresh to reload."));
    };
    image.loading = "lazy";
    return image;
  }
  const video = node("video");
  video.src = url;
  video.controls = true;
  video.preload = "metadata";
  return video;
}

/** Snapshot before a synchronous redraw; restore by identity, never by list position or repeated title. */
export function preserveDisclosures(
  container: Pick<HTMLElement, "querySelectorAll">,
): () => void {
  const states = new Map(
    Array.from(
      container.querySelectorAll<HTMLDetailsElement>(
        "details[data-disclosure-key]",
      ),
    ).map((element) => [element.dataset.disclosureKey!, element.open]),
  );
  return () => {
    for (const element of Array.from(
      container.querySelectorAll<HTMLDetailsElement>(
        "details[data-disclosure-key]",
      ),
    )) {
      const state = states.get(element.dataset.disclosureKey!);
      if (state !== undefined) element.open = state;
    }
  };
}

export function showPane(view: "workspace" | "chat") {
  document.body.dataset.mobileView = view;
  for (const kind of ["workspace", "chat"]) {
    const button = document.getElementById(`mobile-${kind}`);
    button?.classList.toggle("active", view === kind);
    button?.setAttribute("aria-pressed", String(view === kind));
  }
}

/** Dialogs belong to the current workspace view and disappear when that view is replaced. */
export function modal(container: HTMLElement, title: UiLabel) {
  const dialog = node("dialog", "", "workspace-dialog");
  const heading = node("h2", title);
  heading.id = `dialog-${crypto.randomUUID()}`;
  dialog.setAttribute("aria-labelledby", heading.id);
  const header = node("div", "", "dialog-heading");
  const close = () => dialog.close();
  const dismiss = button(msg("Close"), close, "icon-button", "close", true);
  setAttribute(dismiss, "aria-label", msg("Close"));
  header.append(heading, dismiss);
  const body = node("div", "", "dialog-body");
  dialog.append(header, body);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  container.append(dialog);
  dialog.showModal();
  return { dialog, body, heading, close };
}

const viewRefreshers = new WeakMap<HTMLElement, () => Promise<unknown>>();
export function setViewRefresh(
  element: HTMLElement,
  refresh: () => Promise<unknown>,
) {
  element.dataset.refreshView = "";
  viewRefreshers.set(element, refresh);
}
export async function refreshActiveView(
  container: HTMLElement,
): Promise<boolean> {
  const views = Array.from(
    container.querySelectorAll<HTMLElement>("[data-refresh-view]"),
  );
  const active = views
    .reverse()
    .find(
      (element) => element.isConnected && element.getClientRects().length > 0,
    );
  if (!active) return false;
  await viewRefreshers.get(active)!();
  return true;
}

export function setButtonText(element: HTMLButtonElement, label: UiLabel) {
  const glyph = element.querySelector(":scope > svg");
  element.replaceChildren(...(glyph ? [glyph] : []), node("span", label));
}

export function option(label: UiLabel, value: string) {
  const result = node("option", label);
  result.value = value;
  return result;
}
