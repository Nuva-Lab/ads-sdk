/**
 * Script v3 and Storyboard views: reading a Script, starting a Storyboard for it, reading a Storyboard with its
 * cast, direction and clips (shot tokens shown as chips), editing it with live checks, and rendering its clips.
 */
import { NARRATOR, clipReferences } from "@nuva/sdk/schemas";
import type { ScriptContent, StoryboardContent } from "@nuva/sdk/schemas";
import type { Character, ResourceLink, Script, Storyboard } from "@nuva/sdk";
import { msg, resolveLabel, setText, translate, UiError, type UiLabel } from "./i18n.js";
import { icon, type IconName } from "./icons.js";
import { keyed } from "./requests.js";
import type { ResourceHost } from "./resources.js";
import { listCharacters } from "./characters.js";
import {
  action,
  button,
  details,
  field,
  modal,
  node,
  notice,
  option,
  setButtonText,
  showError,
} from "./ui.js";
import {
  allIssues,
  castCharacters,
  castChoice,
  castEntry,
  castKeys,
  describeToken,
  insertGroups,
  insertToken,
  loadMaterial,
  move,
  placeIssue,
  renumber,
  shotSegments,
  speakerName,
  storyboardContext,
  totalMs,
  withCharacter,
  type MediaInfo,
  type StoryboardMaterial,
  type TokenView,
} from "./storyboard-model.js";

type V3Script = Script & { format: 3 };
const MODES: Record<string, string> = {
  on_camera: "On camera",
  dialogue: "Dialogue",
  voiceover: "Voiceover",
};
const seconds = (ms: number) => msg("{seconds}s", { seconds: Number((ms / 1000).toFixed(1)) });
function pill(label: string, value: UiLabel) {
  const element = node("span", "", "config-pill");
  element.append(node("span", msg(label), "config-label"), node("strong", value));
  return element;
}
function section(title: string, className = "") {
  const element = node("section", "", `storyboard-section ${className}`.trim());
  element.append(node("h3", msg(title), "storyboard-section-title"));
  return element;
}
/** Marks a control that writes (`data-write`), so a host can hide it in a read-only view. */
function writes<T extends HTMLElement>(element: T): T {
  element.dataset.write = "";
  return element;
}
function thumb(image: MediaInfo | undefined, fallback: IconName) {
  const visual = node("span", "", "reference-thumb");
  if (image?.url && /^https?:/.test(image.url)) {
    const img = node("img");
    img.src = image.url;
    img.alt = "";
    img.loading = "lazy";
    visual.append(img);
  } else visual.append(icon(fallback));
  return visual;
}

// ── Script v3 ───────────────────────────────────────────────────────────

/** A v3 Script: concept, length, beats, roles and its panels in order with their lines and notes. */
export function renderScriptContent(card: HTMLElement, content: ScriptContent) {
  const concept = node("section", "", "script-concept");
  concept.append(node("p", content.concept.proposition, "script-proposition"));
  const facts = node("div", "", "config-pills");
  facts.append(
    pill("Length", seconds(content.duration_ms)),
    pill("Category", content.concept.category),
    pill("Purchase task", content.concept.purchase_task),
  );
  concept.append(facts);
  const route = node("dl", "", "script-facts");
  for (const [label, value] of [
    ["Route", content.concept.route],
    ["Why this route", content.concept.route_reason],
    ["Speaker relation", content.concept.speaker_relation],
  ] as const)
    if (value.trim()) route.append(node("dt", msg(label)), node("dd", value));
  if (route.childElementCount) concept.append(route);
  card.append(concept);

  const beats = section("Beats");
  const beatList = node("ol", "", "script-beats");
  for (const beat of content.beats) {
    const item = node("li");
    item.append(node("span", beat.id, "shot-chip"), node("span", beat.purpose));
    beatList.append(item);
  }
  beats.append(beatList);
  card.append(beats);

  const roles = section("Roles");
  if (!content.roles.length) roles.append(node("p", msg("This Script has no roles."), "muted"));
  for (const role of content.roles) {
    const row = node("div", "", "script-role");
    const head = node("div", "", "script-role-head");
    head.append(
      node("strong", role.name),
      node("code", role.id, "role-id"),
      node("span", msg(role.speaks ? "Speaks" : "Silent"), "badge"),
    );
    row.append(head, node("p", role.description));
    roles.append(row);
  }
  card.append(roles);

  const panels = section("Panels");
  for (const panel of content.panels) {
    const element = node("article", "", "script-panel");
    element.dataset.panel = panel.id;
    const head = node("header", "", "script-panel-head");
    head.append(node("h4", panel.id), node("span", panel.beat_id, "badge"));
    const seen = node("span", "", "script-on-screen");
    for (const who of panel.on_screen)
      seen.append(node("span", who === "product" ? msg("Product") : speakerName(content, who), "on-screen-chip"));
    head.append(seen);
    element.append(head, node("p", panel.action, "script-action"));
    for (const line of panel.lines) {
      const row = node("div", "", "script-line");
      row.dataset.line = line.id;
      const meta = node("div", "", "script-line-meta");
      meta.append(
        node("span", line.id, "shot-chip line-id"),
        node("strong", speakerName(content, line.speaker)),
        node("span", msg(MODES[line.mode] ?? line.mode), "badge"),
      );
      row.append(meta, node("p", `“${line.text}”`, "script-line-text"));
      element.append(row);
    }
    if (panel.notes.trim())
      element.append(node("p", msg("Notes: {p0}", { p0: panel.notes }), "script-notes"));
    panels.append(element);
  }
  card.append(panels);
}

/** The New Storyboard form: a Character (or the writer) for each role, and an optional instruction. */
export function newStoryboardForm(
  body: HTMLElement,
  options: {
    script: V3Script;
    characters: readonly Character[];
    submit(input: { script: string; cast?: Record<string, string>; instruction?: string }): Promise<void>;
  },
) {
  const form = node("form", "", "form-stack new-storyboard");
  form.append(
    node("p", msg("Choose who plays each role, or leave a role for the writer to cast."), "muted"),
  );
  const choices = new Map<string, HTMLSelectElement>();
  for (const role of options.script.content.roles) {
    const wrapper = node("label", "", "field");
    const select = node("select");
    select.name = `cast-${role.id}`;
    select.append(option(msg("Leave it to the writer"), ""));
    for (const character of options.characters)
      select.append(
        option(
          character.data.voice_asset_id
            ? msg("{p0} · has a voice", { p0: character.data.name })
            : character.data.name,
          character.id,
        ),
      );
    choices.set(role.id, select);
    wrapper.append(node("span", role.name), select, node("span", role.description, "field-help"));
    form.append(wrapper);
  }
  if (!options.script.content.roles.length)
    form.append(node("p", msg("This Script has no roles to cast."), "muted"));
  if (!options.characters.length && options.script.content.roles.length)
    form.append(node("p", msg("No Characters yet. Create them under Characters to cast them here."), "muted"));
  const instruction = field(msg("Instruction (optional)"), "", true);
  instruction.input.name = "instruction";
  form.append(instruction.wrapper);
  const failure = node("div", "", "storyboard-error");
  failure.hidden = true;
  const actions = node("div", "", "form-actions");
  const submit = node("button", msg("Write Storyboard"), "primary button-with-icon");
  submit.type = "submit";
  submit.prepend(icon("spark"));
  actions.append(submit);
  form.append(failure, actions);
  body.replaceChildren(form);
  form.onsubmit = (event) => {
    event.preventDefault();
    void action(async () => {
      const cast = Object.fromEntries(
        [...choices].filter(([, select]) => select.value).map(([role, select]) => [role, select.value]),
      );
      const chosen = Object.values(cast);
      if (new Set(chosen).size !== chosen.length)
        throw new UiError(msg("A Character can play only one role."));
      const text = instruction.input.value.trim();
      submit.disabled = true;
      failure.hidden = true;
      setButtonText(submit, msg("Writing…"));
      try {
        await options.submit({
          script: options.script.id,
          ...(chosen.length ? { cast } : {}),
          ...(text ? { instruction: text } : {}),
        });
      } catch (error) {
        showError(failure, error);
        throw error;
      } finally {
        submit.disabled = false;
        setButtonText(submit, msg("Write Storyboard"));
      }
    });
  };
  return form;
}

/** Opens the New Storyboard form for a v3 Script; the written Storyboard opens when it is saved. */
export function openNewStoryboard(
  container: HTMLElement,
  script: V3Script,
  host: ResourceHost,
  opened: (record: ResourceLink) => Promise<unknown>,
) {
  const popup = modal(container, msg("New Storyboard"));
  popup.body.append(node("p", msg("Loading Characters…"), "muted"));
  void action(async () => {
    const characters = await listCharacters(host.sdk);
    if (!popup.dialog.isConnected) return;
    newStoryboardForm(popup.body, {
      script,
      characters,
      submit: async (input) => {
        const saved = await keyed(host, "storyboard", input, (key) =>
          host.sdk.storyboards.generate(input, { idempotencyKey: key }),
        );
        const record = storyboardRecord(saved.id);
        host.remember(record);
        notice(msg("Storyboard written."));
        if (!popup.dialog.isConnected) return;
        popup.close();
        await opened(record);
      },
    });
  });
}
const storyboardRecord = (id: string): ResourceLink => ({ ref: { kind: "storyboard", id }, label: "Storyboard" });

// ── Errors from the service ─────────────────────────────────────────────

/** Lines of a rejection that name a part of the Storyboard (`C02 shot 1: ...`), so they can be shown beside it. */
function serviceIssues(error: unknown): string[] {
  const value = error as { message?: string; details?: { path: string; message: string }[] | null };
  const lines = (value.message ?? "").split("\n").filter((line) => /^(cast(\.[\w]+)?|direction|clips|C\d{2}( shot \d+)?): /.test(line));
  for (const detail of value.details ?? [])
    if (/^(cast(\.[\w]+)?|direction|clips|C\d{2}( shot \d+)?): /.test(detail.message)) lines.push(detail.message);
  return lines;
}

// ── Token chips and references ──────────────────────────────────────────

export function tokenChip(view: TokenView, raw: string) {
  const chip = node("span", "", "reference-chip token-chip");
  chip.title = raw;
  chip.dataset.tokenKind = view.kind;
  if (view.kind === "person") {
    chip.dataset.color = "0";
    chip.append(thumb(view.image, "subject"), node("span", view.label));
    if (view.described) chip.classList.add("token-described");
  } else if (view.kind === "image") {
    chip.dataset.color = "1";
    chip.append(thumb(view.image, "image"), node("span", view.label));
  } else if (view.kind === "product") {
    chip.dataset.color = "3";
    chip.append(thumb(view.image, "layers"), node("span", view.label));
  } else if (view.kind === "line") {
    chip.className = "line-chip";
    chip.append(
      node("span", view.id, "line-chip-id"),
      node("q", view.text, "line-chip-text"),
      node("span", view.speaker, "line-chip-speaker"),
    );
  } else {
    chip.className = "token-unknown";
    chip.textContent = view.raw;
  }
  return chip;
}
/** Shot or direction text with its tokens as chips. */
export function tokenText(
  text: string,
  content: Pick<StoryboardContent, "cast">,
  material: StoryboardMaterial,
  className = "shot-text",
) {
  const element = node("div", "", className);
  for (const part of shotSegments(text))
    element.append(
      "text" in part
        ? document.createTextNode(part.text)
        : tokenChip(describeToken(part.token, content, material), part.token.raw),
    );
  return element;
}
/** The images and voice files one clip renders with, from its tokens. */
export function referenceStrip(
  content: StoryboardContent,
  clip: number,
  material: StoryboardMaterial,
) {
  const strip = node("div", "", "reference-strip storyboard-references");
  const references = clipReferences(content, clip, storyboardContext(material));
  const owners = new Map<string, string>();
  for (const character of Object.values(material.characters)) {
    for (const id of character.data.image_asset_ids) owners.set(id, character.data.name);
    if (character.data.voice_asset_id) owners.set(character.data.voice_asset_id, character.data.name);
  }
  for (const id of references.images) {
    const image = material.media[id];
    const chip = node("span", "", "reference-chip");
    chip.title = id;
    const owner = owners.get(id);
    const name = owner && image?.label ? `${owner} · ${image.label}` : (image?.label ?? owner ?? material.product?.name ?? translate("Image"));
    chip.append(thumb(image, "image"), node("span", name));
    strip.append(chip);
  }
  for (const id of references.audio) {
    const chip = node("span", "", "reference-chip");
    chip.dataset.color = "2";
    chip.title = id;
    const visual = node("span", "", "reference-thumb");
    visual.append(icon("audio"));
    chip.append(visual, node("span", msg("{p0}'s voice", { p0: owners.get(id) ?? id })));
    strip.append(chip);
  }
  if (!strip.childElementCount) strip.append(node("span", msg("No references yet."), "muted"));
  return strip;
}

// ── Storyboard view ─────────────────────────────────────────────────────

function castSummary(content: StoryboardContent, material: StoryboardMaterial) {
  const list = node("div", "", "cast-list");
  for (const key of castKeys(material.script, content.cast)) {
    const entry = content.cast[key];
    const role = material.script.roles.find((item) => item.id === key);
    const row = node("div", "", "cast-row");
    row.dataset.role = key;
    const who = node("div", "", "cast-role");
    who.append(node("strong", speakerName(material.script, key)), node("code", key, "role-id"));
    who.append(
      node(
        "p",
        role?.description ?? (key === NARRATOR ? msg("Unseen narrator, heard only.") : msg("Not a role of this Script.")),
        "muted",
      ),
    );
    const plays = node("div", "", "cast-player");
    plays.append(node("span", msg("Played by"), "config-label"));
    const character = entry?.character === undefined ? undefined : material.characters[entry.character];
    if (character) {
      const first = character.data.image_asset_ids[0];
      const chip = node("span", "", "reference-chip");
      chip.append(thumb(first ? material.media[first] : undefined, "subject"), node("span", character.data.name));
      plays.append(chip);
    } else if (entry?.character !== undefined) plays.append(node("p", msg("Character {p0} is not available.", { p0: entry.character }), "cast-missing"));
    else if (entry?.look) plays.append(node("p", entry.look, "cast-look"));
    else plays.append(node("p", key === NARRATOR ? "—" : msg("Not cast"), key === NARRATOR ? "muted" : "cast-missing"));
    const voice = node("div", "", "cast-voice");
    voice.append(node("span", msg("Voice"), "config-label"));
    if (entry?.voice === "character") {
      const chip = node("span", "", "reference-chip");
      chip.dataset.color = "2";
      const visual = node("span", "", "reference-thumb");
      visual.append(icon("audio"));
      chip.append(visual, node("span", msg("Character voice")));
      voice.append(chip);
    } else if (entry?.voice) voice.append(node("p", entry.voice, "cast-look"));
    else voice.append(node("p", role && !role.speaks ? msg("Does not speak") : msg("No voice"), "muted"));
    row.append(who, plays, voice);
    list.append(row);
  }
  return list;
}

/** A Storyboard as written: its Script, cast, direction and clips with their shots and references. */
export function renderStoryboardContent(
  container: HTMLElement,
  content: StoryboardContent,
  material: StoryboardMaterial,
  options: { openScript?(): void; renderClip?(clip: string, trigger: HTMLButtonElement, status: HTMLElement): void } = {},
) {
  const summary = node("div", "", "config-pills storyboard-summary");
  const scriptPill = node("span", "", "config-pill");
  scriptPill.append(node("span", msg("Script"), "config-label"));
  if (options.openScript) scriptPill.append(button(material.script.concept.name, () => options.openScript!(), "link-button"));
  else scriptPill.append(node("strong", material.script.concept.name));
  const total = totalMs(content);
  summary.append(
    scriptPill,
    pill("Clips", String(content.clips.length)),
    pill("Length", msg("{p0} · Script {p1}", { p0: seconds(total), p1: seconds(material.script.duration_ms) })),
  );
  container.append(summary);

  const cast = section("Cast");
  cast.append(castSummary(content, material));
  container.append(cast);

  const direction = section("Direction");
  direction.append(
    content.direction.trim()
      ? tokenText(content.direction, content, material, "storyboard-direction")
      : node("p", msg("No direction."), "muted"),
  );
  container.append(direction);

  const clips = section("Clips");
  content.clips.forEach((clip, index) => {
    const card = node("article", "", "storyboard-clip");
    card.dataset.clip = clip.id;
    const head = node("header", "", "storyboard-clip-head");
    head.append(node("h4", clip.id), node("span", seconds(clip.duration_ms), "badge"));
    const status = node("span", "", "storyboard-clip-status");
    head.append(status);
    if (options.renderClip) {
      const render: HTMLButtonElement = writes(button(msg("Render clip"), () => options.renderClip!(clip.id, render, status), "", "video"));
      head.append(render);
    }
    card.append(head);
    const shots = node("ol", "", "storyboard-shots");
    for (const shot of clip.shots) {
      const item = node("li");
      item.append(tokenText(shot, content, material));
      shots.append(item);
    }
    card.append(shots, node("h5", msg("References"), "storyboard-label"), referenceStrip(content, index, material));
    clips.append(card);
  });
  container.append(clips);
}

/** Opens a Storyboard: reads its Script, Product and Characters, then shows it with its actions. */
export async function renderStoryboard(
  card: HTMLElement,
  controls: HTMLElement,
  storyboard: Storyboard,
  host: ResourceHost,
  navigation: { alive(): boolean; show(record: ResourceLink): Promise<unknown> },
) {
  const body = node("div", "", "storyboard");
  body.append(node("p", msg("Loading…"), "muted"));
  card.append(body);
  const script = await host.sdk.scripts.get({ kind: "script", id: storyboard.content.script });
  if (!navigation.alive()) return;
  if (script.format !== 3) {
    body.replaceChildren(node("p", msg("This Storyboard's Script is a legacy Script."), "empty"));
    return;
  }
  let material = await loadMaterial(host.sdk, script as V3Script, castCharacters(storyboard.content));
  if (!navigation.alive()) return;
  const scriptLink: ResourceLink = { ref: { kind: "script", id: script.id }, label: script.content.concept.name };
  const go = (record: ResourceLink) => (host.open ? host.open(record) : navigation.show(record));
  const renderClip = (clip: string, trigger: HTMLButtonElement, status: HTMLElement) =>
    void action(async () => {
      trigger.disabled = true;
      setText(status, msg("Starting…"));
      try {
        const input = { storyboard: { id: storyboard.id, clip } };
        const job = await keyed(host, "video", input, (key) => host.sdk.videos.generate(input, { idempotencyKey: key }));
        const record: ResourceLink = { ref: { kind: "job", id: job.id }, label: `${clip} · ${script.content.concept.name}` };
        host.remember(record);
        status.replaceChildren(
          node("span", msg(job.status)),
          button(msg("Open"), () => void action(async () => go(record)), "link-button"),
        );
        notice(msg("Clip {p0} is rendering. It appears under Clips.", { p0: clip }));
      } catch (error) {
        status.replaceChildren();
        throw error;
      } finally {
        trigger.disabled = false;
      }
    });
  const view = () => {
    body.replaceChildren();
    renderStoryboardContent(body, storyboard.content, material, { openScript: () => void action(async () => go(scriptLink)), renderClip });
    body.append(
      details(msg("Details"), { id: storyboard.id, script: storyboard.content.script, batch_id: storyboard.batch_id, lineage_id: storyboard.lineage_id }),
    );
    edit.hidden = revise.hidden = false;
  };
  const edit = writes(
    button(msg("Edit"), () =>
      void action(async () => {
        edit.disabled = true;
        try {
          const characters = await listCharacters(host.sdk);
          for (const character of characters) material = withCharacter(material, character);
          edit.hidden = revise.hidden = true;
          storyboardEditor(body, {
            content: storyboard.content,
            material,
            characters,
            cancel: view,
            save: async (content) => {
              const input = { base: storyboard.id, content };
              const saved = await keyed(host, "storyboard-edit", input, (key) =>
                host.sdk.storyboards.generate(input, { idempotencyKey: key }),
              );
              const record = storyboardRecord(saved.id);
              host.remember(record);
              notice(msg("Storyboard saved."));
              await navigation.show(record);
            },
          });
        } finally {
          edit.disabled = false;
        }
      }),
    "", "edit"),
  );
  const revise = writes(
    button(msg("Revise with instruction"), () => {
      const popup = modal(card, msg("Revise Storyboard"));
      const form = node("form", "", "form-stack");
      const instruction = field(msg("What should change?"), "", true);
      instruction.input.required = true;
      const failure = node("div", "", "storyboard-error");
      failure.hidden = true;
      const actions = node("div", "", "form-actions");
      const submit = node("button", msg("Revise"), "primary");
      submit.type = "submit";
      actions.append(submit);
      form.append(instruction.wrapper, failure, actions);
      popup.body.append(form);
      form.onsubmit = (event) => {
        event.preventDefault();
        void action(async () => {
          const text = instruction.input.value.trim();
          if (!text) throw new UiError(msg("Say what should change."));
          const input = { base: storyboard.id, instruction: text };
          submit.disabled = true;
          failure.hidden = true;
          setButtonText(submit, msg("Revising…"));
          try {
            const saved = await keyed(host, "storyboard-revision", input, (key) =>
              host.sdk.storyboards.generate(input, { idempotencyKey: key }),
            );
            const record = storyboardRecord(saved.id);
            host.remember(record);
            notice(msg("Storyboard revised."));
            if (!popup.dialog.isConnected) return;
            popup.close();
            await navigation.show(record);
          } catch (error) {
            showError(failure, error);
            throw error;
          } finally {
            submit.disabled = false;
            setButtonText(submit, msg("Revise"));
          }
        });
      };
    }, "", "spark"),
  );
  controls.append(edit, revise);
  if (storyboard.base_id)
    controls.append(
      button(msg("Previous revision"), () =>
        void action(async () => {
          const record = storyboardRecord(storyboard.base_id!);
          host.remember(record);
          await navigation.show(record);
        }), "", "back"),
    );
  view();
}

// ── Storyboard editor ───────────────────────────────────────────────────

export interface StoryboardEditor {
  /** The edited Storyboard as it would be saved. */
  content(): StoryboardContent;
  /** Its current problems, as `where: message`. */
  issues(): string[];
}
/**
 * Edits a Storyboard in place: cast, direction, clip lengths and shots (raw tokens, with an Insert menu), adding,
 * removing and reordering shots and clips. Every change is checked at once with the service's own checks, and each
 * problem is shown beside the part it names. Save is offered only when there are none.
 */
export function storyboardEditor(
  root: HTMLElement,
  options: {
    content: StoryboardContent;
    material: StoryboardMaterial;
    characters: readonly Character[];
    save(content: StoryboardContent): Promise<void>;
    cancel(): void;
  },
): StoryboardEditor {
  let draft: StoryboardContent = structuredClone(options.content);
  let material = options.material;
  let current: string[] = [];
  let rejected: string[] = [];
  let saving = false;
  const slots = new Map<string, HTMLElement>();
  const previews: (() => void)[] = [];
  const editor = node("div", "", "storyboard-editor");
  const summary = node("div", "", "storyboard-issue-summary");
  summary.setAttribute("role", "status");
  const general = node("ul", "", "storyboard-issues");
  const failure = node("div", "", "storyboard-error");
  failure.hidden = true;
  const slot = (where: string, parent: HTMLElement) => {
    const list = node("ul", "", "storyboard-issues");
    list.dataset.where = where;
    slots.set(where, list);
    parent.append(list);
  };
  const characterById = (id: string) =>
    options.characters.find((character) => character.id === id) ?? material.characters[id];

  function validate() {
    current = [...allIssues(draft, material), ...rejected];
    for (const list of slots.values()) list.replaceChildren();
    general.replaceChildren();
    for (const issue of current) {
      const placed = placeIssue(issue);
      const list = slots.get(placed.where);
      (list ?? general).append(node("li", list ? placed.message : issue));
    }
    setText(
      summary,
      current.length
        ? msg(current.length === 1 ? "1 issue to fix before saving." : "{count} issues to fix before saving.", { count: current.length })
        : msg("No issues. Ready to save."),
    );
    summary.dataset.state = current.length ? "issues" : "ok";
    save.disabled = saving || current.length > 0;
    setText(totals, msg("{p0} in total · Script {p1}", { p0: seconds(totalMs(draft)), p1: seconds(material.script.duration_ms) }));
  }
  /** After any edit: the service's last rejection no longer describes this draft. */
  function changed() {
    rejected = [];
    failure.hidden = true;
    for (const refresh of previews) refresh();
    validate();
  }

  // Cast
  const cast = section("Cast", "storyboard-cast-edit");
  slot("cast", cast);
  function drawCast() {
    for (const element of Array.from(cast.querySelectorAll(".cast-edit-row"))) element.remove();
    for (const key of [...slots.keys()]) if (key.startsWith("cast.")) slots.delete(key);
    for (const key of castKeys(material.script, draft.cast)) cast.append(castRow(key));
  }
  function castRow(key: string) {
    const narrator = key === NARRATOR;
    const role = material.script.roles.find((item) => item.id === key);
    const row = node("div", "", "cast-edit-row");
    row.dataset.role = key;
    const head = node("div", "", "cast-role");
    head.append(node("strong", speakerName(material.script, key)), node("code", key, "role-id"));
    head.append(
      node("p", role?.description ?? (narrator ? msg("Unseen narrator, heard only.") : msg("Not a role of this Script.")), "muted"),
    );
    row.append(head);
    if (!role && !narrator) {
      row.append(
        button(msg("Remove"), () => {
          delete draft.cast[key];
          drawCast();
          changed();
        }, "", "trash"),
      );
      slot(`cast.${key}`, row);
      return row;
    }
    const speaks = narrator || role!.speaks;
    const choice = castChoice(draft.cast[key]);
    const controls = node("div", "", "cast-edit-controls");
    const who = node("select");
    who.name = `cast-${key}`;
    who.append(option(narrator ? msg("No Character") : msg("Described person"), ""));
    const listed = new Set<string>();
    for (const character of options.characters) {
      listed.add(character.id);
      who.append(option(character.data.name, character.id));
    }
    if (choice.character !== undefined && !listed.has(choice.character))
      who.append(option(material.characters[choice.character]?.data.name ?? choice.character, choice.character));
    who.value = choice.character ?? "";
    const whoField = node("label", "", "field");
    whoField.append(node("span", narrator ? msg("Voice from a Character") : msg("Played by")), who);
    const look = field(msg("Look"), choice.look, true);
    look.input.name = `look-${key}`;
    controls.append(whoField, look.wrapper);
    const voiceMode = node("select");
    voiceMode.name = `voice-mode-${key}`;
    voiceMode.append(option(msg("Character voice"), "character"), option(msg("Describe the voice"), "described"));
    voiceMode.value = choice.characterVoice ? "character" : "described";
    const modeField = node("label", "", "field");
    modeField.append(node("span", msg("Voice")), voiceMode);
    const voice = field(msg("Voice description"), choice.voice);
    voice.input.name = `voice-${key}`;
    if (speaks) controls.append(modeField, voice.wrapper);
    row.append(controls);
    const sync = () => {
      const character = choice.character === undefined ? undefined : characterById(choice.character);
      const hasVoice = Boolean(character?.data.voice_asset_id);
      look.wrapper.hidden = narrator || choice.character !== undefined;
      modeField.hidden = !hasVoice;
      voice.wrapper.hidden = hasVoice && choice.characterVoice;
      if (character) material = withCharacter(material, character);
      draft.cast[key] = castEntry(choice, { speaks, narrator, characterHasVoice: hasVoice });
    };
    who.onchange = () => {
      if (who.value) choice.character = who.value;
      else delete choice.character;
      const character = choice.character === undefined ? undefined : characterById(choice.character);
      // A Character with its own voice speaks with it unless a voice is described.
      choice.characterVoice = Boolean(character?.data.voice_asset_id) && !choice.voice.trim();
      voiceMode.value = choice.characterVoice ? "character" : "described";
      sync();
      changed();
    };
    look.input.oninput = () => {
      choice.look = look.input.value;
      sync();
      changed();
    };
    voiceMode.onchange = () => {
      choice.characterVoice = voiceMode.value === "character";
      sync();
      changed();
    };
    voice.input.oninput = () => {
      choice.voice = voice.input.value;
      sync();
      changed();
    };
    look.wrapper.hidden = narrator || choice.character !== undefined;
    const character = choice.character === undefined ? undefined : characterById(choice.character);
    modeField.hidden = !character?.data.voice_asset_id;
    voice.wrapper.hidden = Boolean(character?.data.voice_asset_id) && choice.characterVoice;
    slot(`cast.${key}`, row);
    return row;
  }
  drawCast();

  // Direction
  const direction = section("Direction");
  const directionField = field(msg("What holds for the whole video: look, setting, sound, music, on-screen text"), draft.direction, true);
  directionField.input.name = "direction";
  const directionPreview = node("div");
  const drawDirection = () =>
    directionPreview.replaceChildren(
      draft.direction.trim() ? tokenText(draft.direction, draft, material, "storyboard-direction shot-preview") : "",
    );
  directionField.input.oninput = () => {
    draft.direction = directionField.input.value;
    changed();
  };
  direction.append(directionField.wrapper, directionPreview);
  slot("direction", direction);

  // Clips
  const clips = section("Clips");
  const totals = node("p", "", "muted storyboard-total");
  const clipList = node("div", "", "storyboard-clip-list");
  clips.append(totals);
  slot("clips", clips);
  clips.append(clipList);
  const restructure = (next: StoryboardContent["clips"]) => {
    draft = renumber({ ...draft, clips: next });
    drawClips();
    changed();
  };
  function drawClips() {
    for (const key of [...slots.keys()]) if (/^C\d{2}/.test(key)) slots.delete(key);
    previews.length = 0;
    previews.push(drawDirection);
    clipList.replaceChildren(...draft.clips.map((clip, index) => clipEditor(clip, index)));
    clipList.append(
      button(msg("Add clip"), () => restructure([...draft.clips, { id: "", duration_ms: 5000, shots: [""] }]), "", "plus"),
    );
  }
  function clipEditor(clip: StoryboardContent["clips"][number], index: number) {
    const card = node("article", "", "storyboard-clip editing");
    card.dataset.clip = clip.id;
    const head = node("header", "", "storyboard-clip-head");
    const length = node("input");
    length.type = "number";
    length.min = "5";
    length.max = "15";
    length.step = "0.1";
    length.name = `duration-${clip.id}`;
    length.value = String(clip.duration_ms / 1000);
    const lengthField = node("label", "", "field storyboard-duration");
    lengthField.append(node("span", msg("Length (seconds)")), length);
    length.oninput = () => {
      const value = Number(length.value);
      draft.clips[index]!.duration_ms = length.value.trim() && Number.isFinite(value) ? Math.round(value * 1000) : Number.NaN;
      changed();
    };
    const tools = node("div", "", "storyboard-tools");
    tools.append(
      button(msg("Move clip up"), () => restructure(move(draft.clips, index, index - 1)), "icon-button", "up", true),
      button(msg("Move clip down"), () => restructure(move(draft.clips, index, index + 1)), "icon-button", "down", true),
      button(msg("Remove clip"), () => restructure(draft.clips.filter((_, i) => i !== index)), "icon-button", "trash", true),
    );
    (tools.children[0] as HTMLButtonElement).disabled = index === 0;
    (tools.children[1] as HTMLButtonElement).disabled = index === draft.clips.length - 1;
    head.append(node("h4", clip.id), lengthField, tools);
    card.append(head);
    slot(clip.id, card);
    const shots = node("ol", "", "storyboard-shots");
    clip.shots.forEach((shot, s) => shots.append(shotEditor(index, s)));
    card.append(shots);
    card.append(
      button(msg("Add shot"), () => {
        draft.clips[index]!.shots.push("");
        drawClips();
        changed();
      }, "", "plus"),
    );
    const references = node("div");
    const drawReferences = () => references.replaceChildren(referenceStrip(draft, index, material));
    previews.push(drawReferences);
    card.append(node("h5", msg("References"), "storyboard-label"), references);
    return card;
  }
  function shotEditor(clip: number, shot: number) {
    const id = draft.clips[clip]!.id;
    const item = node("li", "", "shot-edit");
    const text = node("textarea");
    text.name = `shot-${id}-${shot + 1}`;
    text.rows = 3;
    text.value = draft.clips[clip]!.shots[shot]!;
    text.setAttribute("aria-label", translate("{p0} shot {p1}", { p0: id, p1: shot + 1 }));
    const preview = node("div");
    const drawPreview = () =>
      preview.replaceChildren(text.value.trim() ? tokenText(text.value, draft, material, "shot-text shot-preview") : "");
    previews.push(drawPreview);
    text.oninput = () => {
      draft.clips[clip]!.shots[shot] = text.value;
      changed();
    };
    const insert = node("select", "", "storyboard-insert");
    insert.name = `insert-${id}-${shot + 1}`;
    insert.setAttribute("aria-label", translate("Insert into {p0} shot {p1}", { p0: id, p1: shot + 1 }));
    const fill = () => {
      insert.replaceChildren(option(msg("Insert…"), ""));
      for (const group of insertGroups(draft, material)) {
        const element = node("optgroup");
        element.label = resolveLabel(group.label);
        for (const entry of group.options) element.append(option(entry.label, entry.token));
        insert.append(element);
      }
    };
    fill();
    insert.onfocus = fill;
    insert.onchange = () => {
      const token = insert.value;
      if (!token) return;
      const start = text.selectionStart ?? text.value.length;
      const end = text.selectionEnd ?? start;
      const next = insertToken(text.value, start, end, token);
      text.value = next.value;
      insert.value = "";
      text.focus();
      text.setSelectionRange(next.caret, next.caret);
      text.dispatchEvent(new Event("input"));
    };
    const shots = draft.clips[clip]!.shots;
    const restructureShots = (next: string[]) => {
      draft.clips[clip]!.shots = next;
      drawClips();
      changed();
    };
    const tools = node("div", "", "storyboard-tools");
    const up = button(msg("Move shot up"), () => restructureShots(move(shots, shot, shot - 1)), "icon-button", "up", true);
    const down = button(msg("Move shot down"), () => restructureShots(move(shots, shot, shot + 1)), "icon-button", "down", true);
    up.disabled = shot === 0;
    down.disabled = shot === shots.length - 1;
    tools.append(
      insert,
      up,
      down,
      button(msg("Remove shot"), () => restructureShots(shots.filter((_, i) => i !== shot)), "icon-button", "trash", true),
    );
    const head = node("div", "", "shot-edit-head");
    head.append(node("span", msg("Shot {p0}", { p0: shot + 1 }), "shot-chip"), tools);
    item.append(head, text, preview);
    slot(`${id} shot ${shot + 1}`, item);
    return item;
  }

  const actions = node("div", "", "form-actions");
  const save = node("button", msg("Save Storyboard"), "primary button-with-icon");
  save.type = "button";
  save.prepend(icon("check"));
  actions.append(button(msg("Cancel"), () => options.cancel()), save);
  save.onclick = () =>
    void action(async () => {
      if (current.length) return;
      saving = true;
      save.disabled = true;
      failure.hidden = true;
      setButtonText(save, msg("Saving…"));
      try {
        await options.save(renumber(draft));
      } catch (error) {
        const value = error as { code?: string; saved?: { storyboard?: { id: string } } };
        showError(failure, error);
        rejected = serviceIssues(error);
        if (value.code === "PARTIAL_CREATION" && value.saved?.storyboard)
          failure.append(node("p", msg("The Storyboard was saved as {p0}, but not all of its clips were compiled.", { p0: value.saved.storyboard.id }), "muted"));
        throw error;
      } finally {
        saving = false;
        setButtonText(save, msg("Save Storyboard"));
        validate();
      }
    });

  editor.append(summary, general, cast, direction, clips, failure, actions);
  root.replaceChildren(editor);
  drawClips();
  for (const refresh of previews) refresh();
  validate();
  return { content: () => structuredClone(renumber(draft)), issues: () => [...current] };
}
