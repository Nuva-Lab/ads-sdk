/**
 * Characters: the people a Storyboard can cast. Each has a name, a description, one or more images (the first is
 * the default) and optionally a voice file. Lists, reviews, creates and edits them.
 */
import type { Character, NuvaClient, ResourceLink } from "@nuva/sdk";
import { msg, setAttribute, setText, UiError } from "./i18n.js";
import { icon } from "./icons.js";
import { assetText } from "./storyboard-model.js";
import {
  action,
  button,
  details,
  field,
  media,
  modal,
  node,
  notice,
  setButtonText,
  setViewRefresh,
  showError,
} from "./ui.js";

/** The backend's limit: a Character has 1–10 images. */
export const MAX_CHARACTER_IMAGES = 10;
/** Every Character the user can cast, up to 500. */
export async function listCharacters(sdk: Pick<NuvaClient, "characters">): Promise<Character[]> {
  const items: Character[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 5; page++) {
    const result = await sdk.characters.list({ limit: 100, ...(cursor ? { cursor } : {}) });
    items.push(...result.items);
    cursor = result.nextCursor;
    if (!cursor) break;
  }
  return items;
}
const excerpt = (text: string | null | undefined, length = 120) =>
  !text ? "" : text.length > length ? text.slice(0, length).trimEnd() + "…" : text;
function image(character: Character, id: string) {
  const asset = character.assets[id];
  if (!asset) return node("span", msg("Image access unavailable"), "media-placeholder");
  const element = media(asset.download_url, "image");
  element.setAttribute("alt", assetText(asset).label ?? character.data.name);
  return element;
}

/** The Characters gallery and a Character's review, in the workspace. */
export async function renderCharacters(
  container: HTMLElement,
  sdk: NuvaClient,
  options: {
    selected?: string;
    openSelected?: boolean;
    attach(record: ResourceLink): void;
    changed?(characters: Character[]): void;
  },
) {
  container.replaceChildren(node("p", msg("Loading Characters…"), "muted"));
  const first = await sdk.characters.list({ limit: 100 });
  if (!container.isConnected) return;
  let characters = first.items.slice(),
    cursor = first.nextCursor;
  container.replaceChildren();
  const toolbar = node("div", "", "gallery-toolbar");
  const create = button(msg("New Character"), () => edit(), "secondary", "plus");
  create.dataset.write = "";
  toolbar.append(create);
  const gallery = node("div", "", "resource-grid character-gallery");
  const more = button(msg("More Characters"), () =>
    action(async () => {
      if (!cursor) return;
      more.disabled = true;
      try {
        const next = await sdk.characters.list({ cursor, limit: 100 });
        for (const character of next.items)
          characters = [...characters.filter((c) => c.id !== character.id), character];
        cursor = next.nextCursor;
        draw();
      } finally {
        more.disabled = false;
      }
    }),
  );
  container.append(toolbar, gallery, more);
  let review: HTMLElement | undefined;
  function upsert(character: Character) {
    characters = characters.some((c) => c.id === character.id)
      ? characters.map((c) => (c.id === character.id ? character : c))
      : [character, ...characters];
    draw();
  }
  function draw() {
    if (!gallery.isConnected) return;
    gallery.replaceChildren();
    for (const character of characters) {
      const card = button("", () => void action(() => show(character.id)), "gallery-card character-tile");
      setAttribute(card, "aria-label", msg("View {p0}", { p0: character.data.name }));
      card.dataset.resourceId = character.id;
      const visual = node("div", "", "gallery-visual");
      const id = character.data.image_asset_ids[0];
      visual.append(id ? image(character, id) : node("span", msg("No image"), "media-placeholder"));
      const info = node("div", "", "gallery-info");
      info.append(node("h3", character.data.name));
      if (character.data.description)
        info.append(node("p", excerpt(character.data.description), "muted character-excerpt"));
      const badges = node("div", "", "character-badges");
      badges.append(
        node("span", msg(character.data.image_asset_ids.length === 1 ? "{count} image" : "{count} images", { count: character.data.image_asset_ids.length }), "badge"),
      );
      if (character.data.voice_asset_id) badges.append(node("span", msg("Voice"), "badge"));
      info.append(badges);
      card.append(visual, info);
      gallery.append(card);
    }
    if (!characters.length) gallery.append(node("p", msg("No Characters yet."), "empty"));
    more.hidden = Boolean(review?.isConnected) || !cursor;
    options.changed?.(characters.slice());
  }
  async function show(id: string) {
    review?.remove();
    const current = node("section", "", "product-review character-review");
    review = current;
    const close = () => {
      current.remove();
      gallery.hidden = toolbar.hidden = false;
      more.hidden = !cursor;
    };
    const header = node("header", "", "resource-heading");
    const title = node("div", "", "resource-title");
    const heading = node("h2", msg("Character"));
    title.append(heading);
    const controls = node("div", "", "resource-actions");
    header.append(title, controls);
    const body = node("div", "", "review-body");
    body.append(node("p", msg("Loading…"), "muted"));
    current.append(button(msg("Characters"), close, "back-to-gallery", "back"), header, body);
    setViewRefresh(current, () => show(id));
    gallery.hidden = toolbar.hidden = more.hidden = true;
    container.append(current);
    try {
      const character = await sdk.characters.get(id);
      if (!body.isConnected) return;
      upsert(character);
      setText(heading, character.data.name);
      body.replaceChildren();
      const editButton = button(msg("Edit character"), () => edit(character), "", "edit");
      editButton.dataset.write = "";
      controls.append(button(msg("Attach to chat"), () => options.attach(character), "", "attach"), editButton);
      const images = node("div", "", "character-images");
      character.data.image_asset_ids.forEach((assetId, index) => {
        const figure = node("figure", "", "character-image");
        figure.append(image(character, assetId));
        const caption = node("figcaption");
        const text = assetText(character.assets[assetId]);
        caption.append(node("strong", text.label ?? msg("Image {p0}", { p0: index + 1 })));
        if (index === 0) caption.append(node("span", msg("Default"), "badge"));
        if (text.description) caption.append(node("span", text.description, "muted"));
        figure.append(caption);
        images.append(figure);
      });
      body.append(images);
      if (character.data.description) body.append(node("h3", msg("Description")), node("p", character.data.description, "character-description"));
      body.append(node("h3", msg("Voice")));
      const voiceId = character.data.voice_asset_id;
      const voice = voiceId ? character.assets[voiceId] : undefined;
      if (voice) {
        const audio = node("audio");
        audio.controls = true;
        audio.src = voice.download_url;
        body.append(audio);
      } else body.append(node("p", voiceId ? msg("Voice access unavailable") : msg("No voice file. Storyboards describe this Character's voice instead."), "muted"));
      body.append(details(msg("Character details"), { id: character.id, version: character.version }));
    } catch (error) {
      close();
      throw error;
    }
  }
  function edit(base?: Character) {
    const popup = modal(container, base ? msg("Edit {p0}", { p0: base.data.name }) : msg("New Character"));
    characterForm(popup.body, {
      sdk,
      ...(base ? { base } : {}),
      saved: async (character) => {
        upsert(character);
        popup.close();
        notice(msg("Character saved."));
        await show(character.id);
      },
    });
  }
  draw();
  if (options.openSelected && options.selected) await show(options.selected);
}

type ImageItem =
  | { kind: "saved"; id: string; url?: string; label: string | null; description: string | null }
  | { kind: "new"; file: File; url: string; label: string; description: string; uploaded?: string };

/**
 * Creates or edits a Character. New images upload with their optional label and description when saved; the image
 * order is the Character's (the first is its default). The voice can be added, replaced or removed.
 */
export function characterForm(
  body: HTMLElement,
  options: { sdk: Pick<NuvaClient, "assets" | "characters">; base?: Character; saved(character: Character): unknown },
) {
  const { sdk, base } = options;
  const form = node("form", "", "form-stack character-form");
  const name = field(msg("Name"), base?.data.name ?? "");
  name.input.name = "name";
  name.input.required = true;
  const description = field(msg("Description · looks, persona, speaking style and language"), base?.data.description ?? "", true);
  description.input.name = "description";
  let items: ImageItem[] = (base?.data.image_asset_ids ?? []).map((id) => {
    const asset = base!.assets[id];
    return { kind: "saved", id, ...(asset ? { url: asset.download_url } : {}), ...assetText(asset) };
  });
  const list = node("ol", "", "character-image-list");
  const fileInput = node("input");
  fileInput.type = "file";
  fileInput.accept = "image/png,image/jpeg,image/webp";
  fileInput.multiple = true;
  fileInput.hidden = true;
  fileInput.name = "images";
  setAttribute(fileInput, "aria-label", msg("Add images"));
  const addImages = button(msg("Add images"), () => fileInput.click(), "", "plus");
  fileInput.onchange = () => {
    for (const file of Array.from(fileInput.files ?? []))
      items.push({ kind: "new", file, url: URL.createObjectURL(file), label: "", description: "" });
    fileInput.value = "";
    drawImages();
  };
  function drawImages() {
    list.replaceChildren();
    items.forEach((item, index) => {
      const row = node("li", "", "character-image-row");
      const visual = node("span", "", "character-image-thumb");
      if (item.url) {
        const img = node("img");
        img.src = item.url;
        img.alt = "";
        visual.append(img);
      } else visual.append(icon("image"));
      const text = node("div", "", "character-image-text");
      if (item.kind === "saved") {
        text.append(node("strong", item.label ?? msg("No label")));
        if (item.description) text.append(node("span", item.description, "muted"));
      } else {
        const label = field(msg("Label (optional)"), item.label);
        label.input.name = `image-label-${index}`;
        label.input.oninput = () => (item.label = label.input.value);
        const about = field(msg("Description (optional)"), item.description);
        about.input.name = `image-description-${index}`;
        about.input.oninput = () => (item.description = about.input.value);
        text.append(node("span", item.file.name, "resource-id"), label.wrapper, about.wrapper);
      }
      if (index === 0) text.prepend(node("span", msg("Default"), "badge"));
      const tools = node("div", "", "storyboard-tools");
      const up = button(msg("Move image up"), () => reorder(index, index - 1), "icon-button", "up", true);
      const down = button(msg("Move image down"), () => reorder(index, index + 1), "icon-button", "down", true);
      up.disabled = index === 0;
      down.disabled = index === items.length - 1;
      tools.append(
        up,
        down,
        button(msg("Remove image"), () => {
          items = items.filter((_, i) => i !== index);
          drawImages();
        }, "icon-button", "trash", true),
      );
      row.append(visual, text, tools);
      list.append(row);
    });
    if (!items.length) list.append(node("li", msg("Add at least one image. The first is the default."), "muted"));
    addImages.disabled = items.length >= MAX_CHARACTER_IMAGES;
  }
  function reorder(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    items = next;
    drawImages();
  }
  // Voice: the saved one, a new file, or none.
  let voiceId: string | null = base?.data.voice_asset_id ?? null;
  let voiceFile: File | undefined;
  const voiceInput = node("input");
  voiceInput.type = "file";
  voiceInput.accept = "audio/*";
  voiceInput.hidden = true;
  voiceInput.name = "voice";
  setAttribute(voiceInput, "aria-label", msg("Voice file"));
  const voice = node("div", "", "character-voice");
  voiceInput.onchange = () => {
    voiceFile = voiceInput.files?.[0] ?? voiceFile;
    voiceInput.value = "";
    drawVoice();
  };
  function drawVoice() {
    voice.replaceChildren();
    const saved = voiceId && base ? base.assets[voiceId] : undefined;
    if (voiceFile) voice.append(node("span", voiceFile.name, "resource-id"));
    else if (saved) {
      const audio = node("audio");
      audio.controls = true;
      audio.src = saved.download_url;
      voice.append(audio);
    } else voice.append(node("span", voiceId ? msg("Voice access unavailable") : msg("No voice file"), "muted"));
    const row = node("div", "", "row");
    row.append(button(voiceFile || voiceId ? msg("Replace voice") : msg("Add voice"), () => voiceInput.click(), "", "audio"));
    if (voiceFile || voiceId)
      row.append(
        button(msg("Remove voice"), () => {
          voiceFile = undefined;
          voiceId = null;
          drawVoice();
        }, "", "trash"),
      );
    voice.append(row);
  }
  const failure = node("div", "", "storyboard-error");
  failure.hidden = true;
  const actions = node("div", "", "form-actions");
  const save = node("button", base ? msg("Save changes") : msg("Create Character"), "primary button-with-icon");
  save.type = "submit";
  save.prepend(icon("check"));
  actions.append(save);
  const imagesHead = node("div", "", "character-form-head");
  imagesHead.append(node("h4", msg("Images")), node("span", msg("The first image is the default. Up to 10."), "field-help"));
  const voiceHead = node("h4", msg("Voice"));
  form.append(name.wrapper, description.wrapper, imagesHead, list, addImages, fileInput, voiceHead, voice, voiceInput, failure, actions);
  body.replaceChildren(form);
  drawImages();
  drawVoice();
  form.onsubmit = (event) => {
    event.preventDefault();
    void action(async () => {
      const text = name.input.value.trim();
      if (!text) throw new UiError(msg("Character name is required."));
      if (!items.length) throw new UiError(msg("Add at least one image. The first is the default."));
      if (items.length > MAX_CHARACTER_IMAGES) throw new UiError(msg("A Character has at most 10 images."));
      save.disabled = true;
      failure.hidden = true;
      setButtonText(save, msg("Saving…"));
      try {
        const ids: string[] = [];
        for (const item of items) {
          if (item.kind === "saved") {
            ids.push(item.id);
            continue;
          }
          // An upload that already succeeded is reused when saving is retried.
          if (!item.uploaded) {
            const label = item.label.trim(),
              about = item.description.trim();
            const asset = await sdk.assets.upload(item.file, {
              kind: "image",
              ...(label ? { label } : {}),
              ...(about ? { description: about } : {}),
            });
            item.uploaded = asset.id;
          }
          ids.push(item.uploaded);
        }
        if (voiceFile) {
          voiceId = (await sdk.assets.upload(voiceFile, { kind: "audio" })).id;
          voiceFile = undefined;
        }
        const data = {
          name: text,
          description: description.input.value.trim() || null,
          image_asset_ids: ids,
          voice_asset_id: voiceId,
        };
        let saved: Character;
        if (!base) saved = await sdk.characters.create({ data });
        else {
          // An edit sends only what changed, from the version read; nothing changed saves nothing.
          const changes = characterChanges(base, data);
          saved = Object.keys(changes).length ? await sdk.characters.update(base, { data: changes }) : base;
        }
        await options.saved(saved);
      } catch (error) {
        showError(failure, error);
        throw error;
      } finally {
        save.disabled = false;
        setButtonText(save, base ? msg("Save changes") : msg("Create Character"));
      }
    });
  };
  return form;
}

type CharacterData = Character["data"];
/** Only the fields that differ from `base`; `update` keeps the rest as saved. The image list is sent whole. */
export function characterChanges(base: Character, data: CharacterData): Partial<CharacterData> {
  const changes: Partial<CharacterData> = {};
  if (data.name !== base.data.name) changes.name = data.name;
  if ((data.description ?? null) !== (base.data.description ?? null)) changes.description = data.description ?? null;
  if (data.image_asset_ids.join("\n") !== base.data.image_asset_ids.join("\n")) changes.image_asset_ids = data.image_asset_ids;
  if ((data.voice_asset_id ?? null) !== (base.data.voice_asset_id ?? null)) changes.voice_asset_id = data.voice_asset_id ?? null;
  return changes;
}
