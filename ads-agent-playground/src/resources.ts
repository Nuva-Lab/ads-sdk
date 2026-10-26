import type {
  NuvaClient,
  Product,
  ResourceLink,
  Script,
  Asset,
} from "@nuva/sdk";
import {
  generateScriptSchema,
  generatePromptSchema,
  assembleVideoSchema,
} from "@nuva/sdk/schemas";
import { action, button, details, field, media, node, notice } from "./ui.js";
import { secondsToMs, type KnownResource } from "./workspace.js";
export type ResourceTab = "script" | "prompt" | "job" | "asset";
export interface ResourceHost {
  videoSubmissionEnabled: boolean;
  sdk: NuvaClient;
  sessionId: string;
  scope: string;
  records: KnownResource[];
  product?: Product;
  remember(
    record: ResourceLink,
    extra?: { sourceScriptId?: string; order?: number },
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
    throw new Error(
      `A previous ${operation} request remains unresolved. Restore its exact input and retry to reuse its operation key.`,
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
      details(`Unfinished ${operation} request`, JSON.parse(saved.input)),
    );
    panel.append(
      button(`Start a separate ${operation} request`, () => {
        if (
          !confirm(
            "The previous request may already have created a resource. Starting a separate request can duplicate that work. Keep the previous request record and allow a new one?",
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
          "The previous request has been saved. You can start another request.",
        );
      }),
    );
  }
  const prior = localStorage.getItem(
    `${host.scope}:previous-intents:${host.sessionId}`,
  );
  if (prior)
    panel.append(details("Previous unfinished requests", JSON.parse(prior)));
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
export function refreshResourceList(
  container: HTMLElement,
  host: ResourceHost,
) {
  const list = container.querySelector<HTMLElement>(".known-resources");
  if (!list) return;
  const records = host.records.filter((r) =>
    list.dataset.tab === "asset"
      ? ["asset", "ad"].includes(r.ref.kind)
      : r.ref.kind === list.dataset.tab,
  );
  list.replaceChildren(
    ...records.map((record) =>
      resourceButton(
        record,
        () => void action(() => openResource(container, record, host)),
      ),
    ),
  );
  if (!records.length)
    list.append(
      node("p", "Your saved results will appear here as you create.", "empty"),
    );
}
export async function renderResources(
  container: HTMLElement,
  tab: ResourceTab,
  host: ResourceHost,
) {
  container.replaceChildren();
  const list = node("div", "", "known-resources");
  list.dataset.tab = tab;
  container.append(list);
  refreshResourceList(container, host);
  pendingRequests(container, host);
  const lookup = field("Open a saved resource by ID");
  const open = button("Open ID", () =>
    action(async () => {
      const record = reference(tab, lookup.input.value.trim(), `Saved ${tab}`);
      await readResource(host.sdk, record);
      host.remember(record);
      await openResource(container, record, host);
    }),
  );
  const lookupRow = node("div", "", "row");
  lookupRow.append(lookup.wrapper, open);
  container.append(lookupRow);
  if (tab === "script") scriptGenerator(container, host);
  if (tab === "asset") await assemblyEditor(container, host);
}
function scriptGenerator(
  container: HTMLElement,
  host: ResourceHost,
  base?: Script,
) {
  const panel = node("section", "", "card");
  panel.append(
    node("h3", base ? "Write a new Script revision" : "Write a script"),
  );
  panel.append(
    node(
      "p",
      base
        ? "Describe the changes you want to make."
        : "Start from your selected product, or ask the Agent for help.",
      "muted",
    ),
  );
  const instruction = field("Instructions", "", true),
    min = field("Minimum seconds", "5"),
    max = field("Maximum seconds", "15");
  const grid = node("div", "", "grid");
  grid.append(min.wrapper, max.wrapper);
  panel.append(instruction.wrapper, grid);
  const create = button(
    base ? "Generate revision" : "Generate Script",
    () =>
      action(async () => {
        const source = base?.data.product
          ? base.entities[base.data.product]
          : undefined;
        const productId = base ? source?.id : host.product?.id;
        if (!productId)
          throw new Error(
            base
              ? "This Script has no resolvable Product source."
              : "Select and save a Product first.",
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
          await openResource(container, result, host);
          notice("Script saved.");
        } finally {
          create.disabled = false;
          pendingRequests(panel, host);
        }
      }),
    "primary",
  );
  panel.append(create);
  container.append(panel);
}
export async function openResource(
  container: HTMLElement,
  record: ResourceLink,
  host: ResourceHost,
) {
  const readId = crypto.randomUUID();
  container.dataset.readId = readId;
  container.replaceChildren(node("p", "Opening…", "muted"));
  const value = await readResource(host.sdk, record);
  if (!container.isConnected || container.dataset.readId !== readId) return;
  container.replaceChildren();
  pendingRequests(container, host);
  const card = node("section", "", "card");
  card.append(
    node("h2", record.label),
    node("p", `${record.ref.kind}`, "resource-id"),
  );
  const controls = node("div", "", "row");
  controls.append(
    button("Refresh saved resource", () =>
      action(() => openResource(container, record, host)),
    ),
    button("Attach to chat", () => host.attach(record)),
  );
  card.append(controls);
  container.append(card);
  if (record.ref.kind === "script") {
    const script = value as Script,
      content = script.content;
    card.append(
      node("h3", content.concept.name),
      node("p", content.concept.proposition),
      node("p", content.concept.route, "muted"),
    );
    for (const clip of content.clips) {
      const section = node("div", "", "clip");
      section.append(node("h3", `${clip.id} · ${clip.duration_ms / 1000}s`));
      for (const shot of clip.shots) {
        const row = node("div", "", "shot");
        row.append(
          node(
            "span",
            `${shot.id} · ${shot.start_ms / 1000}–${shot.end_ms / 1000}s`,
            "badge",
          ),
          node("p", shot.scene),
          node("p", shot.action),
          node("p", `Camera: ${shot.camera}`, "muted"),
        );
        for (const speech of shot.speech)
          row.append(node("p", `“${speech.text}”`));
        section.append(row);
      }
      card.append(section);
    }
    if (script.base_id)
      controls.append(
        button("Previous revision", () =>
          action(async () => {
            const parent = await host.sdk.scripts.get({
              kind: "script",
              id: script.base_id!,
            });
            host.remember(parent);
            await openResource(container, parent, host);
          }),
        ),
      );
    card.append(
      node(
        "p",
        `Batch ${script.batch_id ?? "not assigned"} · lineage ${script.lineage_id}`,
        "resource-id",
      ),
    );
    const prompts = button(
      "Generate Prompts from this Script",
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
            notice(`${result.prompts.length} independent Prompts saved.`);
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
                  "Partial result: saved Prompts are retained. The full request did not finish; retry uses the same operation key.",
                ),
              );
              for (const p of partial.saved.prompts)
                saved.append(
                  resourceButton(
                    reference("prompt", p.id, "Saved partial Prompt"),
                    () =>
                      void action(() =>
                        openResource(
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
    card.append(prompts);
    scriptGenerator(container, host, script);
  } else if (record.ref.kind === "prompt") {
    const prompt = value as Awaited<ReturnType<NuvaClient["prompts"]["get"]>>;
    card.append(
      node("p", prompt.data.prompt, "body"),
      node(
        "p",
        `Duration: ${prompt.data.seconds ?? "unspecified"}s · ratio: ${prompt.data.ratio ?? "unspecified"}`,
        "muted",
      ),
    );
    const mapping = host.records.find((r) => r.ref.id === record.ref.id);
    if (mapping?.sourceScriptId)
      card.append(node("p", `Clip ${(mapping.order ?? 0) + 1}`, "resource-id"));
    const generate = button(
      "Generate video",
      () =>
        action(async () => {
          if (!host.videoSubmissionEnabled)
            throw new Error("Video generation is unavailable.");
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
            await openResource(container, ref, host);
          } finally {
            generate.disabled = false;
            pendingRequests(card, host);
          }
        }),
      "primary",
    );
    generate.disabled = !host.videoSubmissionEnabled;
    card.append(generate);
  } else if (record.ref.kind === "job") {
    const job = value as Awaited<ReturnType<NuvaClient["jobs"]["get"]>>;
    const phase = node("p", job.status, "badge"),
      output = node("div");
    card.append(phase, output);
    const render = (state: typeof job) => {
      phase.textContent = state.status;
      output.replaceChildren();
      if (state.asset) {
        output.append(media(state.asset.download_url, "video"));
        host.remember(reference("asset", state.asset.id, "Generated clip"));
      }
      if (state.error) output.append(details("Job failure", state.error));
    };
    render(job);
    if (["queued", "running"].includes(job.status)) {
      let unsubscribe: (() => void) | undefined;
      const poll = button("Watch status", () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = undefined;
          poll.textContent = "Watch status";
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
              poll.textContent = "Finished";
            }
          },
          (error) => notice(error.message, true),
        );
        poll.textContent = "Pause status updates";
      });
      card.append(
        poll,
        button("Cancel Job", () =>
          action(async () => {
            render(await host.sdk.jobs.cancel(job.id));
          }),
        ),
      );
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
  if (!["script", "prompt", "job", "asset", "ad"].includes(record.ref.kind))
    card.append(details("Details", value));
}
async function assemblyEditor(container: HTMLElement, host: ResourceHost) {
  const panel = node("section", "", "card");
  panel.append(
    node("h3", "Assemble saved clips"),
    node("p", "Choose clips in the order you want them to appear.", "muted"),
  );
  container.append(panel);
  const candidates = host.records.filter((r) => r.ref.kind === "asset");
  if (!candidates.length) {
    panel.append(node("p", "Completed Job Assets will appear here.", "muted"));
    return;
  }
  const batch = field("Batch ID"),
    width = field("Width", "720"),
    height = field("Height", "1280"),
    fps = field("Frames per second", "24");
  const audio = node("select");
  audio.setAttribute("aria-label", "Audio");
  audio.append(
    new Option("Preserve audio", "preserve"),
    new Option("Mute", "mute"),
  );
  const rows = node("div"),
    selected: {
      id: string;
      enabled: HTMLInputElement;
      start: HTMLInputElement | HTMLTextAreaElement;
      end: HTMLInputElement | HTMLTextAreaElement;
      element: HTMLElement;
    }[] = [];
  for (const ref of candidates) {
    const row = node("div", "", "clip"),
      check = node("input");
    check.type = "checkbox";
    check.style.width = "auto";
    check.setAttribute("aria-label", `Include ${ref.label}`);
    const start = field("Start (seconds)", "0"),
      end = field("End (seconds; required)");
    const item = {
      id: ref.ref.id,
      enabled: check,
      start: start.input,
      end: end.input,
      element: row,
    };
    selected.push(item);
    const move = (delta: number) => {
      const from = selected.indexOf(item),
        to = from + delta;
      if (to < 0 || to >= selected.length) return;
      selected.splice(from, 1);
      selected.splice(to, 0, item);
      rows.replaceChildren(...selected.map((r) => r.element));
    };
    const top = node("div", "", "row");
    top.append(
      check,
      node("code", ref.ref.id),
      button("↑", () => move(-1)),
      button("↓", () => move(1)),
    );
    const trims = node("div", "", "grid");
    trims.append(start.wrapper, end.wrapper);
    row.append(top, trims);
    rows.append(row);
  }
  const grid = node("div", "", "grid");
  grid.append(width.wrapper, height.wrapper, fps.wrapper);
  panel.append(batch.wrapper, rows, grid, audio);
  const submit = button(
    "Assemble final video",
    () =>
      action(async () => {
        const input = {
          batch_id: batch.input.value.trim(),
          composition: {
            version: 1 as const,
            clips: selected
              .filter((r) => r.enabled.checked)
              .map((r) => ({
                asset_id: r.id,
                start_ms: secondsToMs(r.start.value),
                end_ms: secondsToMs(r.end.value),
              })),
            width: Number(width.input.value),
            height: Number(height.input.value),
            fps: Number(fps.input.value),
            audio: audio.value as "preserve" | "mute",
          },
        };
        assembleVideoSchema.parse(input);
        submit.disabled = true;
        try {
          const result = await keyed(host, "assembly", input, (key) =>
            host.sdk.videos.assemble(input, { idempotencyKey: key }),
          );
          const ref = reference(
            "asset",
            result.assetId,
            "Final assembled video",
          );
          host.remember(ref);
          const ads = await host.sdk.ads.list({
            batch_id: input.batch_id,
            limit: 100,
          });
          ads.items
            .filter((ad) => ad.asset.id === result.assetId)
            .forEach((ad) => host.remember(ad));
          await openResource(container, ref, host);
        } finally {
          submit.disabled = false;
          pendingRequests(panel, host);
        }
      }),
    "primary",
  );
  panel.append(submit);
}
