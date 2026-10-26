import { msg, UiError, translate, setAttribute, setText } from "./i18n.js";
import { option } from "./ui.js";
import { indexedTitle, promptExcerpt } from "./resource-index.js";
import { icon } from "./icons.js";
import { renderPromptViewer } from "./prompt-view.js";
import { resourcePresentation } from "./resource-presentation.js";
import type {
  NuvaClient,
  Product,
  ResourceLink,
  Script,
  Asset,
} from "@nuva/sdk";
import { generateScriptSchema, generatePromptSchema } from "@nuva/sdk/schemas";
import {
  action,
  button,
  details,
  field,
  media,
  modal,
  node,
  notice,
  setViewRefresh,
  setButtonText,
} from "./ui.js";
import {
  secondsToMs,
  resourcesForTab,
  type KnownResource,
} from "./workspace.js";
export type ResourceTab = "script" | "prompt" | "job" | "asset";
export interface ResourceHost {
  videoSubmissionEnabled: boolean;
  sdk: NuvaClient;
  sessionId: string;
  scope: string;
  records: KnownResource[];
  indexLabel?(record: ResourceLink): string | undefined;
  product?: Product;
  products?: Product[];
  remember(
    record: ResourceLink,
    extra?: {
      sourceScriptId?: string;
      order?: number;
      purpose?: "clip" | "final";
      finalAssetId?: string;
    },
  ): void;
  attach(record: ResourceLink): void;
  changed(): void;
}
export async function readResource(
  sdk: NuvaClient,
  record: ResourceLink,
): Promise<unknown> {
  const { kind, id } = record.ref;
  switch (kind) {
    case "product":
      return sdk.products.get(id);
    case "brand":
      return sdk.brands.get(id);
    case "character":
      return sdk.characters.get(id);
    case "script":
      return sdk.scripts.get({ kind, id });
    case "prompt":
      return sdk.prompts.get({ kind, id });
    case "job":
      return sdk.jobs.get(id);
    case "asset":
      return sdk.assets.get(id);
    case "ad":
      return sdk.ads.get(id);
    case "batch":
      return sdk.batches.get(id);
    case "skill":
      return sdk.skills.get(id);
    default:
      return sdk.artifacts.get(record.ref);
  }
}
/** A failed/unknown keyed invocation remains addressable; never silently replace its key or payload. */
export async function keyed<T>(
  host: ResourceHost,
  operation: string,
  input: unknown,
  run: (key: string) => Promise<T>,
): Promise<T> {
  const slot = `${host.scope}:pending:${host.sessionId}:${operation}`;
  const prior = localStorage.getItem(slot),
    encoded = JSON.stringify(input);
  const saved = prior
    ? (JSON.parse(prior) as { key: string; input: string })
    : { key: crypto.randomUUID(), input: encoded };
  if (saved.input !== encoded)
    throw new UiError(
      msg(
        "A previous {p0} request remains unresolved. Restore its exact input and retry to reuse its operation key.",
        { p0: operation },
      ),
    );
  localStorage.setItem(slot, JSON.stringify(saved));
  try {
    const result = await run(saved.key);
    localStorage.removeItem(slot);
    return result;
  } catch (error) {
    if ((error as { acceptance?: string }).acceptance === "not_accepted")
      localStorage.removeItem(slot);
    throw error;
  }
}
function pendingRequests(container: HTMLElement, host: ResourceHost) {
  const panel = node("div", "", "card");
  for (const operation of ["script", "prompts", "video", "assembly"]) {
    const slot = `${host.scope}:pending:${host.sessionId}:${operation}`,
      raw = localStorage.getItem(slot);
    if (!raw) continue;
    const saved = JSON.parse(raw) as { key: string; input: string };
    panel.append(
      details(
        msg("Unfinished {p0} request", { p0: operation }),
        JSON.parse(saved.input),
      ),
    );
    if (operation === "assembly") {
      panel.append(
        node(
          "p",
          msg(
            "Assembly is handled by the Agent. This previous request record is preserved.",
          ),
          "muted",
        ),
      );
      continue;
    }
    panel.append(
      button(msg("Start a separate {p0} request", { p0: operation }), () => {
        if (
          !confirm(
            translate(
              "The previous request may already have created a resource. Starting a separate request can duplicate that work. Keep the previous request record and allow a new one?",
            ),
          )
        )
          return;
        const archive = `${host.scope}:previous-intents:${host.sessionId}`;
        const history = JSON.parse(
          localStorage.getItem(archive) ?? "[]",
        ) as unknown[];
        localStorage.setItem(
          archive,
          JSON.stringify([
            ...history,
            { operation, ...saved, separatedAt: new Date().toISOString() },
          ]),
        );
        localStorage.removeItem(slot);
        panel.remove();
        notice(
          msg(
            "The previous request has been saved. You can start another request.",
          ),
        );
      }),
    );
  }
  const prior = localStorage.getItem(
    `${host.scope}:previous-intents:${host.sessionId}`,
  );
  if (prior)
    panel.append(
      details(msg("Previous unfinished requests"), JSON.parse(prior)),
    );
  if (panel.children.length) container.append(panel);
}
function reference(kind: string, id: string, label: string): ResourceLink {
  return { ref: { kind, id }, label };
}
function resourceButton(record: ResourceLink, open: () => void) {
  const b = button("", open, "resource-button");
  b.append(node("strong", record.label), node("code", `${record.ref.kind}`));
  return b;
}
const galleryLabels: Record<ResourceTab, string> = {
  script: "Scripts",
  prompt: "Prompts",
  job: "Clips",
  asset: "Finals",
};
export function refreshResourceList(
  container: HTMLElement,
  host: ResourceHost,
) {
  const list = container.querySelector<HTMLElement>(".known-resources");
  if (!list) return;
  const records = resourcesForTab(
    host.records,
    list.dataset.tab as ResourceTab,
  );
  const limit = Number(list.dataset.limit || 24),
    request = crypto.randomUUID();
  list.dataset.request = request;
  list.replaceChildren();
  if (!records.length)
    list.append(
      node(
        "p",
        msg("No {p0} in this conversation.", {
          p0: msg(galleryLabels[list.dataset.tab as ResourceTab]),
        }),
        "empty",
      ),
    );
  const selected = records.slice(0, limit);
  const cards = selected.map((record) => {
    const card = node(
      "article",
      "",
      `gallery-card${record.ref.kind === "prompt" ? " prompt-gallery-card" : ""}`,
    );
    card.dataset.resourceId = record.ref.id;
    const preview = node(
      "div",
      "",
      record.ref.kind === "prompt"
        ? "prompt-card-excerpt"
        : "gallery-visual resource-preview",
    );
    preview.append(node("span", msg("Loading…"), "muted"));
    const info = node("div", "", "gallery-info");
    const generic =
      record.label === `${record.ref.kind} ${record.ref.id}` ||
      record.label === `Video Job ${record.ref.id}`;
    const label = generic
      ? (
          {
            script: "Script",
            prompt: "Prompt",
            job: "Video clip",
            asset: "Video",
            ad: "Final ad",
          } as Record<string, string>
        )[record.ref.kind]
      : record.label;
    const indexLabel = host.indexLabel?.(record);
    const title = node(
      "h3",
      generic
        ? msg("{title}", {
            title: () =>
              indexedTitle(
                record.ref.kind,
                translate(label),
                host.indexLabel?.(record),
              ),
          })
        : label,
    );
    const indexTag = node(
      "span",
      msg("{index}", { index: () => host.indexLabel?.(record) ?? "" }),
      "resource-index-label",
    );
    indexTag.hidden = !indexLabel || title.textContent === indexLabel;
    const summary = node("p", msg(record.ref.kind), "muted");
    const review = button(
      msg("Review"),
      () => void action(() => openResource(container, record, host)),
      "",
      "next",
    );
    setAttribute(
      review,
      "aria-label",
      msg("Review {p0}", {
        p0: () => host.indexLabel?.(record) ?? title.textContent ?? label,
      }),
    );
    info.append(indexTag, title, summary);
    if (record.ref.kind === "prompt") {
      card.append(info, preview, review);
    } else {
      info.append(review);
      card.append(preview, info);
    }
    list.append(card);
    return { record, card, preview, title, summary, indexLabel, indexTag };
  });
  const more = container.querySelector<HTMLButtonElement>(".gallery-more");
  if (more) {
    more.hidden = records.length <= limit;
    more.onclick = () => {
      list.dataset.limit = String(limit + 24);
      refreshResourceList(container, host);
    };
  }
  let next = 0;
  const worker = async () => {
    while (next < cards.length) {
      const view = cards[next++];
      if (!list.isConnected || list.dataset.request !== request) return;
      try {
        const value = await readResource(host.sdk, view.record);
        if (!list.isConnected || list.dataset.request !== request) return;
        view.preview.replaceChildren();
        const kind = view.record.ref.kind;
        if (kind === "script") {
          const script = value as Script;
          view.title.textContent = indexedTitle(
            kind,
            script.content.concept.name,
            view.indexLabel,
          );
          view.indexTag.hidden =
            !view.indexLabel || view.title.textContent === view.indexLabel;
          view.preview.append(
            node("p", script.content.concept.proposition, "preview-text"),
          );
          setText(
            view.summary,
            msg("{count} clips · {seconds}s", {
              count: script.content.clips.length,
              seconds:
                script.content.clips.reduce(
                  (ms, clip) => ms + clip.duration_ms,
                  0,
                ) / 1000,
            }),
          );
        } else if (kind === "prompt") {
          const prompt = value as Awaited<
            ReturnType<NuvaClient["prompts"]["get"]>
          >;
          view.preview.append(
            node("p", promptExcerpt(prompt.data.prompt), "preview-text"),
          );
          setText(
            view.summary,
            msg("{duration}{separator}{ratio}", {
              duration:
                prompt.data.seconds == null
                  ? ""
                  : msg("{seconds}s", { seconds: prompt.data.seconds }),
              separator:
                prompt.data.seconds != null && prompt.data.ratio ? " · " : "",
              ratio: prompt.data.ratio ?? "",
            }),
          );
        } else if (kind === "job") {
          const job = value as Awaited<ReturnType<NuvaClient["jobs"]["get"]>>;
          view.title.textContent = indexedTitle(
            kind,
            view.title.textContent ?? "Video clip",
            view.indexLabel,
          );
          setText(view.summary, msg(job.status));
          view.summary.dataset.state = job.status;
          if (job.asset)
            view.preview.append(media(job.asset.download_url, "video"));
          else view.preview.append(node("span", msg(job.status), "badge"));
        } else if (kind === "ad") {
          const ad = value as Awaited<ReturnType<NuvaClient["ads"]["get"]>>;
          view.preview.append(media(ad.asset.download_url, "video"));
          setText(view.summary, msg("Final video"));
          host.remember(view.record, { finalAssetId: ad.asset.id });
        } else {
          const asset = value as Asset;
          if (asset.kind === "audio") {
            const audio = node("audio");
            audio.controls = true;
            audio.src = asset.download_url;
            view.preview.append(audio);
          } else
            view.preview.append(
              media(
                asset.download_url,
                asset.kind === "image" ? "image" : "video",
              ),
            );
          setText(view.summary, msg(asset.kind));
        }
      } catch (error) {
        if (!list.isConnected || list.dataset.request !== request) return;
        view.preview.replaceChildren(
          node("p", msg("Preview unavailable"), "muted"),
        );
        view.summary.textContent = (error as Error).message;
      }
    }
  };
  for (let i = 0; i < Math.min(4, cards.length); i++) void worker();
}
export async function renderResources(
  container: HTMLElement,
  tab: ResourceTab,
  host: ResourceHost,
) {
  const browser = node("div", "", "resource-browser");
  container.replaceChildren(browser);
  const toolbar = node("div", "", "gallery-toolbar");
  const create = (
    title: string,
    draw: (body: HTMLElement) => unknown,
    iconName: import("./icons.js").IconName = "plus",
  ) =>
    button(
      msg(title),
      () => {
        const popup = modal(container, msg(title));
        void action(async () => {
          await draw(popup.body);
        });
      },
      "",
      title === "Open by ID" ? "folder" : iconName,
    );
  if (tab === "script")
    toolbar.append(create("New script", (body) => scriptGenerator(body, host)));
  if (tab === "prompt")
    toolbar.append(
      create(
        "Generate prompts",
        (body) => promptGenerator(body, host),
        "spark",
      ),
    );
  if (tab === "job")
    toolbar.append(
      create("Generate clip", (body) => clipGenerator(body, host), "video"),
    );
  toolbar.append(
    create("Open by ID", (body) => {
      const lookup = field(
        msg("{p0} ID", {
          p0:
            tab === "job"
              ? "Job"
              : tab === "asset"
                ? "Asset"
                : galleryLabels[tab].slice(0, -1),
        }),
      );
      body.append(
        lookup.wrapper,
        button(msg("Open"), () =>
          action(async () => {
            const record = reference(
              tab,
              lookup.input.value.trim(),
              `Saved ${tab}`,
            );
            const value = await readResource(host.sdk, record);
            if (tab === "asset" && (value as Asset).kind !== "video")
              throw new UiError(msg("Choose a video Asset."));
            host.remember(
              record,
              tab === "asset" ? { purpose: "final" } : undefined,
            );
            await renderResourceDetail(body, record, host);
          }),
        ),
      );
    }),
  );
  browser.append(toolbar);
  const list = node("div", "", "known-resources resource-grid");
  list.dataset.tab = tab;
  browser.append(
    list,
    button(msg("More"), () => {}, "gallery-more"),
  );
  refreshResourceList(container, host);
  const requests = node("details", "", "pending-requests");
  requests.append(node("summary", msg("Unfinished requests")));
  const pending = node("div");
  pendingRequests(pending, host);
  if (pending.childElementCount) {
    requests.append(pending);
    browser.append(requests);
  }
  if (tab === "asset") {
    for (const record of host.records.filter(
      (record) => record.ref.kind === "batch",
    )) {
      const batch = await host.sdk.batches.get(record.ref.id);
      if (!container.isConnected) return;
      for (const ad of batch.ads)
        host.remember(reference("ad", ad.id, "Final ad"), {
          finalAssetId: ad.asset_id,
        });
    }
  }
}
function sourcePicker(
  container: HTMLElement,
  kind: "script" | "prompt",
  host: ResourceHost,
) {
  const choice = node("select");
  setAttribute(choice, "aria-label", msg("Choose {p0}", { p0: msg(kind) }));
  choice.append(option(msg("Choose a saved {p0}", { p0: msg(kind) }), ""));
  for (const item of host.records.filter((r) => r.ref.kind === kind))
    choice.append(new Option(item.label, item.ref.id));
  const input = field(msg(kind === "script" ? "Script ID" : "Prompt ID"));
  choice.onchange = () => {
    input.input.value = choice.value;
  };
  container.append(choice, input.wrapper);
  return input.input;
}
function promptGenerator(container: HTMLElement, host: ResourceHost) {
  const source = sourcePicker(container, "script", host);
  const submit = button(
    msg("Generate prompts"),
    () =>
      action(async () => {
        const input = generatePromptSchema.parse({
          script: source.value.trim(),
        });
        submit.disabled = true;
        try {
          const result = await keyed(host, "prompts", input, (key) =>
            host.sdk.prompts.generate(input, { idempotencyKey: key }),
          );
          result.prompts.forEach((prompt, order) =>
            host.remember(prompt, { sourceScriptId: input.script, order }),
          );
          host.changed();
          notice(msg("{p0} Prompts saved.", { p0: result.prompts.length }));
        } catch (error) {
          const partial = error as { saved?: { prompts?: { id: string }[] } };
          partial.saved?.prompts?.forEach((prompt, order) =>
            host.remember(
              reference(
                "prompt",
                prompt.id,
                `Saved partial Prompt ${order + 1}`,
              ),
              { sourceScriptId: input.script, order },
            ),
          );
          throw error;
        } finally {
          submit.disabled = false;
          pendingRequests(container, host);
        }
      }),
    "primary",
  );
  submit.prepend(icon("spark"));
  submit.classList.add("button-with-icon");
  const footer = node("div", "", "form-actions");
  footer.append(submit);
  container.append(footer);
}
function clipGenerator(container: HTMLElement, host: ResourceHost) {
  const source = sourcePicker(container, "prompt", host);
  const submit = button(
    msg("Generate clip"),
    () =>
      action(async () => {
        if (!host.videoSubmissionEnabled)
          throw new UiError(msg("Video generation is unavailable."));
        submit.disabled = true;
        try {
          const prompt = await host.sdk.prompts.get({
            kind: "prompt",
            id: source.value.trim(),
          });
          const input = {
            prompt: prompt.id,
            ...(prompt.batch_id ? { batch_id: prompt.batch_id } : {}),
          };
          const job = await keyed(host, "video", input, (key) =>
            host.sdk.videos.generate(input, { idempotencyKey: key }),
          );
          const record = reference("job", job.id, "Video clip");
          host.remember(record);
          await renderResourceDetail(container, record, host);
        } finally {
          submit.disabled = false;
          pendingRequests(container, host);
        }
      }),
    "primary",
  );
  submit.prepend(icon("video"));
  submit.classList.add("button-with-icon");
  const footer = node("div", "", "form-actions");
  footer.append(submit);
  container.append(footer);
}
export async function openResource(
  container: HTMLElement,
  record: ResourceLink,
  host: ResourceHost,
) {
  const prior = Array.from(container.children)
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .map((el) => ({ el, hidden: el.hidden }));
  for (const { el } of prior) el.hidden = true;
  const review = node("section", "", "resource-review"),
    body = node("div");
  const kind = (
    ["script", "prompt", "job"].includes(record.ref.kind)
      ? record.ref.kind
      : "asset"
  ) as ResourceTab;
  review.append(
    button(
      msg(galleryLabels[kind]),
      () => {
        review.remove();
        for (const { el, hidden } of prior) el.hidden = hidden;
      },
      "back-to-gallery",
      "back",
    ),
    body,
  );
  container.append(review);
  try {
    await renderResourceDetail(body, record, host);
  } catch (error) {
    body.replaceChildren(node("p", (error as Error).message, "empty"));
    throw error;
  }
}
function scriptGenerator(
  container: HTMLElement,
  host: ResourceHost,
  base?: Script,
) {
  const panel = node("div", "", "form-stack");
  const product = base ? undefined : node("select");
  if (product) {
    setAttribute(product, "aria-label", msg("Product"));
    product.append(option(msg("Choose a Product"), ""));
    const available = [...(host.products ?? [])];
    if (host.product && !available.some((item) => item.id === host.product!.id))
      available.push(host.product);
    for (const item of available)
      product.append(new Option(item.data.name, item.id));
    product.value = host.product?.id ?? "";
    const label = node("label", "", "field");
    label.append(node("span", msg("Product")), product);
    panel.append(label);
  }
  const instruction = field(msg("Instructions"), "", true),
    min = field(msg("Minimum seconds"), "5"),
    max = field(msg("Maximum seconds"), "15");
  const grid = node("div", "", "grid");
  grid.append(min.wrapper, max.wrapper);
  panel.append(instruction.wrapper, grid);
  const create = button(
    base ? msg("Generate revision") : msg("Generate Script"),
    () =>
      action(async () => {
        const source = base?.data.product
          ? base.entities[base.data.product]
          : undefined;
        const productId = base ? source?.id : product!.value;
        if (!productId)
          throw new UiError(
            base
              ? msg("This Script has no resolvable Product source.")
              : msg("Select and save a Product first."),
          );
        const input = {
          product: productId,
          ...(base ? { base: base.ref.id } : {}),
          instruction: instruction.input.value,
          acceptable_duration_ms: {
            min: secondsToMs(min.input.value),
            max: secondsToMs(max.input.value),
          },
        };
        generateScriptSchema.parse(input);
        create.disabled = true;
        try {
          const result = await keyed(host, "script", input, (key) =>
            host.sdk.scripts.generate(input, { idempotencyKey: key }),
          );
          host.remember(result);
          await renderResourceDetail(container, result, host);
          notice(msg("Script saved."));
        } finally {
          create.disabled = false;
          pendingRequests(panel, host);
        }
      }),
    "primary",
  );
  create.prepend(icon("spark"));
  create.classList.add("button-with-icon");
  const footer = node("div", "", "form-actions");
  footer.append(create);
  panel.append(footer);
  container.append(panel);
}
async function renderResourceDetail(
  container: HTMLElement,
  record: ResourceLink,
  host: ResourceHost,
) {
  const readId = crypto.randomUUID();
  container.dataset.readId = readId;
  setViewRefresh(container, () =>
    renderResourceDetail(container, record, host),
  );
  container.replaceChildren(node("p", msg("Opening…"), "muted"));
  const value = await readResource(host.sdk, record);
  if (!container.isConnected || container.dataset.readId !== readId) return;
  container.replaceChildren();
  pendingRequests(container, host);
  const card = node("section", "", "card resource-detail");
  const heading = node("header", "", "resource-heading");
  const title = node("div", "", "resource-title");
  const display = resourcePresentation(record, value),
    indexLabel = host.indexLabel?.(record);
  const headingTitle = indexedTitle(record.ref.kind, display.title, indexLabel);
  if (indexLabel && headingTitle !== indexLabel)
    title.append(
      node(
        "span",
        msg("{index}", { index: () => host.indexLabel?.(record) ?? "" }),
        "resource-index-label",
      ),
    );
  title.append(
    node(
      "h2",
      msg("{title}", {
        title: () =>
          indexedTitle(
            record.ref.kind,
            resourcePresentation(record, value).title,
            host.indexLabel?.(record),
          ),
      }),
    ),
  );
  const controls = node("div", "", "resource-actions");
  controls.append(
    button(msg("Attach to chat"), () => host.attach(record), "", "attach"),
  );
  heading.append(title, controls);
  card.append(heading);
  container.append(card);
  if (record.ref.kind === "batch") {
    const batch = value as Awaited<ReturnType<NuvaClient["batches"]["get"]>>;
    const description = resourcePresentation(record, batch);
    if (description.meta)
      card.append(
        node(
          "p",
          msg("{title}", {
            title: () => resourcePresentation(record, batch).meta ?? "",
          }),
          "muted",
        ),
      );
    card.append(node("h3", msg("Ads")));
    for (const [index, ad] of batch.ads.entries())
      card.append(
        button(
          msg("Ad {p0} →", { p0: index + 1 }),
          () =>
            action(() =>
              openResource(
                container,
                { ref: { kind: "ad", id: ad.id }, label: `Ad ${index + 1}` },
                host,
              ),
            ),
          "resource-button",
        ),
      );
    if (!batch.ads.length)
      card.append(node("p", msg("No finished ads yet."), "muted"));
    const states = node("div", "", "batch-job-counts");
    for (const [state, total] of Object.entries(batch.jobs))
      if (total)
        states.append(
          node(
            "span",
            msg("{total} {state}", { total, state: msg(state) }),
            "badge",
          ),
        );
    card.append(node("h3", msg("Video jobs")), states);
    card.append(
      details(msg("Resource details"), {
        id: batch.id,
        created_at: batch.created_at,
      }),
    );
  } else if (record.ref.kind === "script") {
    const script = value as Script,
      content = script.content;
    card.append(
      node("p", content.concept.proposition),
      node("p", content.concept.route, "muted"),
    );
    for (const clip of content.clips) {
      const section = node("div", "", "clip");
      section.append(
        node(
          "h3",
          msg("{p0} · {p1}s", { p0: clip.id, p1: clip.duration_ms / 1000 }),
        ),
      );
      for (const shot of clip.shots) {
        const row = node("div", "", "shot");
        row.append(
          node(
            "span",
            msg("{p0} · {p1}–{p2}s", {
              p0: shot.id,
              p1: shot.start_ms / 1000,
              p2: shot.end_ms / 1000,
            }),
            "badge",
          ),
          node("p", shot.scene),
          node("p", shot.action),
          node("p", msg("Camera: {p0}", { p0: shot.camera }), "muted"),
        );
        for (const speech of shot.speech)
          row.append(node("p", `“${speech.text}”`));
        section.append(row);
      }
      card.append(section);
    }
    if (script.base_id)
      controls.append(
        button(
          msg("Previous revision"),
          () =>
            action(async () => {
              const parent = await host.sdk.scripts.get({
                kind: "script",
                id: script.base_id!,
              });
              host.remember(parent);
              await renderResourceDetail(container, parent, host);
            }),
          "",
          "back",
        ),
      );
    const provenance = details(msg("Details"), {
      batch_id: script.batch_id,
      lineage_id: script.lineage_id,
    });
    const prompts = button(
      msg("Create prompts"),
      () =>
        action(async () => {
          const input = generatePromptSchema.parse({ script: script.ref.id });
          prompts.disabled = true;
          try {
            const result = await keyed(host, "prompts", input, (key) =>
              host.sdk.prompts.generate(input, { idempotencyKey: key }),
            );
            result.prompts.forEach((p, order) =>
              host.remember(p, { sourceScriptId: script.ref.id, order }),
            );
            host.changed();
            notice(
              msg("{p0} independent Prompts saved.", {
                p0: result.prompts.length,
              }),
            );
          } catch (error) {
            const partial = error as { saved?: { prompts?: { id: string }[] } };
            partial.saved?.prompts?.forEach((p, order) =>
              host.remember(
                reference("prompt", p.id, `Saved partial Prompt ${order + 1}`),
                { sourceScriptId: script.ref.id, order },
              ),
            );
            if (partial.saved?.prompts?.length) {
              const saved = node("div", "", "inline-note");
              saved.append(
                node(
                  "p",
                  msg(
                    "Partial result: saved Prompts are retained. The full request did not finish; retry uses the same operation key.",
                  ),
                ),
              );
              for (const p of partial.saved.prompts)
                saved.append(
                  resourceButton(
                    reference("prompt", p.id, "Saved partial Prompt"),
                    () =>
                      void action(() =>
                        renderResourceDetail(
                          container,
                          reference("prompt", p.id, "Saved partial Prompt"),
                          host,
                        ),
                      ),
                  ),
                );
              card.append(saved);
            }
            throw error;
          } finally {
            prompts.disabled = false;
            pendingRequests(card, host);
          }
        }),
      "primary",
    );
    controls.append(
      button(
        msg("Revise script"),
        () => {
          const popup = modal(container, msg("Revise script"));
          scriptGenerator(popup.body, host, script);
        },
        "",
        "edit",
      ),
    );
    prompts.prepend(icon("spark"));
    prompts.classList.add("button-with-icon");
    controls.append(prompts);
    card.append(provenance);
  } else if (record.ref.kind === "prompt") {
    const prompt = value as Awaited<ReturnType<NuvaClient["prompts"]["get"]>>;
    const promptView = renderPromptViewer(card, prompt);
    controls.append(
      button(msg("View raw prompt"), () => promptView.showRaw(), "", "code"),
    );
    controls.append(
      button(
        msg("Copy prompt"),
        () =>
          action(async () => {
            await navigator.clipboard.writeText(prompt.data.prompt);
            notice(msg("Prompt copied."));
          }),
        "",
        "copy",
      ),
    );
    const jobs: Awaited<ReturnType<NuvaClient["jobs"]["get"]>>[] = [];
    const known = host.records.filter((item) => item.ref.kind === "job");
    let next = 0,
      incomplete = false;
    const loadJobs = async () => {
      while (
        next < known.length &&
        container.isConnected &&
        container.dataset.readId === readId
      ) {
        const ref = known[next++];
        try {
          const job = await host.sdk.jobs.get(ref.ref.id);
          if (job.prompt === record.ref.id) jobs.push(job);
        } catch {
          incomplete = true;
        }
      }
    };
    void Promise.all(
      Array.from({ length: Math.min(4, known.length) }, loadJobs),
    ).then(() => {
      jobs.sort((a, b) => a.created_at.localeCompare(b.created_at));
      promptView.setJobs(jobs, incomplete);
    });
    const generate = button(
      msg("Generate video"),
      () =>
        action(async () => {
          if (!host.videoSubmissionEnabled)
            throw new UiError(msg("Video generation is unavailable."));
          generate.disabled = true;
          const input = {
            prompt: record.ref.id,
            ...(prompt.batch_id ? { batch_id: prompt.batch_id } : {}),
          };
          try {
            const job = await keyed(host, "video", input, (key) =>
              host.sdk.videos.generate(input, { idempotencyKey: key }),
            );
            const ref = reference("job", job.id, `Video Job ${job.id}`);
            host.remember(ref);
            await renderResourceDetail(container, ref, host);
          } finally {
            generate.disabled = false;
            pendingRequests(card, host);
          }
        }),
      "primary",
    );
    generate.disabled = !host.videoSubmissionEnabled;
    generate.prepend(icon("video"));
    generate.classList.add("button-with-icon");
    controls.append(generate);
  } else if (record.ref.kind === "job") {
    const job = value as Awaited<ReturnType<NuvaClient["jobs"]["get"]>>;
    const phase = node("p", msg(job.status), "badge"),
      output = node("div");
    card.append(phase, output);
    const render = (state: typeof job) => {
      setText(phase, msg(state.status));
      output.replaceChildren();
      if (state.asset) {
        output.append(media(state.asset.download_url, "video"));
        host.remember(reference("asset", state.asset.id, "Generated clip"), {
          purpose: "clip",
        });
      }
      if (state.error) output.append(details(msg("Job failure"), state.error));
    };
    render(job);
    if (["queued", "running"].includes(job.status)) {
      let unsubscribe: (() => void) | undefined;
      card
        .closest("dialog")
        ?.addEventListener("close", () => unsubscribe?.(), { once: true });
      const poll = button(msg("Watch status"), () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = undefined;
          setButtonText(poll, msg("Watch status"));
          return;
        }
        unsubscribe = host.sdk.jobs.subscribe(
          job.id,
          (state) => {
            if (!card.isConnected) {
              unsubscribe?.();
              return;
            }
            render(state);
            if (!["queued", "running"].includes(state.status)) {
              unsubscribe?.();
              setButtonText(poll, msg("Finished"));
            }
          },
          (error) => notice(error.message, true),
        );
        setButtonText(poll, msg("Pause status updates"));
      });
      poll.prepend(icon("clock"));
      poll.classList.add("button-with-icon");
      controls.append(poll);
    }
  } else if (record.ref.kind === "asset") {
    const asset = value as Asset;
    card.append(
      media(asset.download_url, asset.kind === "image" ? "image" : "video"),
    );
  } else if (record.ref.kind === "ad") {
    const ad = value as Awaited<ReturnType<NuvaClient["ads"]["get"]>>;
    card.append(media(ad.asset.download_url, "video"));
  }
  if (
    !["script", "prompt", "job", "asset", "ad", "batch"].includes(
      record.ref.kind,
    )
  )
    card.append(details(msg("Details"), value));
}
