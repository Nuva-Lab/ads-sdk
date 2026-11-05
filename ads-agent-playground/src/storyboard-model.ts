/**
 * Storyboard data for the workspace views: what a Storyboard is checked against, how its shot tokens read, and the
 * edits the editor makes. No DOM here; the views live in storyboard.ts.
 */
import {
  CHARACTER_VOICE,
  LINE_ID,
  MAX_CLIPS,
  MAX_CLIP_MS,
  MIN_CLIP_MS,
  NARRATOR,
  PRODUCT,
  namesAsset,
  scriptLines,
  storyboardIssues,
  storyboardTokens,
} from "@nuva/sdk/internal";
import type {
  CastEntry,
  ScriptContent,
  StoryboardContent,
  StoryboardContext,
  StoryboardToken,
} from "@nuva/sdk/internal";
import type { Character, NuvaClient, Product, Script } from "@nuva/sdk";
import { msg, translate, UiError, type UiLabel } from "./i18n.js";

/** A file a view can show: its download URL and what its uploader said it shows. */
export interface MediaInfo {
  id: string;
  url?: string;
  kind?: string;
  label?: string | null;
  description?: string | null;
}
type AssetLike = {
  id?: string;
  kind?: string;
  download_url?: string;
  label?: string | null;
  description?: string | null;
};
/** Everything a Storyboard of one v3 Script is read and checked with. */
export interface StoryboardMaterial {
  scriptId: string;
  script: ScriptContent;
  /** The Script's Product at the revision it was written from, when the Script is linked to one. */
  product?: Pick<Product, "id" | "version"> & { name: string };
  /** The Product's image asset IDs in order; the first is its default image. */
  productImages: string[];
  /** Cast (and castable) Characters by ID. */
  characters: Record<string, Character>;
  media: Record<string, MediaInfo>;
}

/** An Asset's own label, which the deployed DTO types do not list but the backend returns. */
export function assetText(asset: unknown): {
  label: string | null;
  description: string | null;
} {
  const value = (asset ?? {}) as AssetLike;
  return {
    label: typeof value.label === "string" && value.label.trim() ? value.label : null,
    description:
      typeof value.description === "string" && value.description.trim()
        ? value.description
        : null,
  };
}
function addMedia(
  media: Record<string, MediaInfo>,
  assets: Record<string, unknown> | undefined,
) {
  for (const [id, raw] of Object.entries(assets ?? {})) {
    const asset = raw as AssetLike;
    media[id] = {
      id,
      ...(asset.download_url ? { url: asset.download_url } : {}),
      ...(asset.kind ? { kind: asset.kind } : {}),
      ...assetText(asset),
    };
  }
}
/** The Product a Script was written from: its `based_on` Product revision, as the service reads it. */
export function scriptProduct(
  script: Pick<Script, "relationships" | "entities">,
): { id: string; version: number } | undefined {
  const link = script.relationships.find(
    (relationship) =>
      relationship.type === "based_on" &&
      relationship.target.kind === "product",
  );
  const entity = link ? script.entities[link.target.id] : undefined;
  return entity && entity.kind === "product"
    ? { id: entity.id, version: entity.version }
    : undefined;
}
/** The Characters a Storyboard's cast names. */
export function castCharacters(content: Pick<StoryboardContent, "cast">) {
  return [
    ...new Set(
      Object.values(content.cast).flatMap((entry) =>
        entry.character === undefined ? [] : [entry.character],
      ),
    ),
  ];
}
/** The Assets a Storyboard names with `{{asset:<id>}}`, in its shots and direction. */
export function assetTokenIds(
  content: Pick<StoryboardContent, "direction" | "clips">,
  script: Pick<ScriptContent, "roles">,
) {
  return [
    ...new Set(
      [content.direction, ...content.clips.flatMap((clip) => clip.shots)].flatMap((text) =>
        storyboardTokens(text).flatMap((token) =>
          namesAsset(token, script) && token.asset !== undefined ? [token.asset] : [],
        ),
      ),
    ),
  ];
}
/**
 * Reads an Asset a Storyboard names. Only NOT_FOUND means the user may not use it (the checks then report it);
 * any other failure is raised as an error the user can retry.
 */
export async function readNamedAsset(sdk: Pick<NuvaClient, "assets">, id: string): Promise<unknown> {
  try {
    return await sdk.assets.get(id);
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === "NOT_FOUND") return undefined;
    throw new UiError(msg("File {p0} could not be read. Try again.", { p0: id }));
  }
}
/** Adds Assets the caller read (files a Storyboard names with `{{asset:<id>}}`) to the material. */
export function withAssets(material: StoryboardMaterial, assets: readonly unknown[]): StoryboardMaterial {
  const media = { ...material.media };
  addMedia(media, Object.fromEntries(assets.flatMap((asset) => {
    const id = (asset as AssetLike | undefined)?.id;
    return id === undefined ? [] : [[id, asset]];
  })));
  return { ...material, media };
}
/** Adds a Character, and its images and voice, to the material it can be cast from. */
export function withCharacter(
  material: StoryboardMaterial,
  character: Character,
): StoryboardMaterial {
  const media = { ...material.media };
  addMedia(media, character.assets);
  return {
    ...material,
    characters: { ...material.characters, [character.id]: character },
    media,
  };
}
/**
 * Reads what a Storyboard of `script` is checked against, as the service does: the Script's linked Product at its
 * revision (or, for a Script without a Product link, the images it saved), each Character named, and each Asset
 * named with `{{asset:<id>}}`. A Character or Asset that cannot be read is left out, so the checks report it.
 */
export async function loadMaterial(
  sdk: Pick<NuvaClient, "products" | "characters"> & Partial<Pick<NuvaClient, "assets">>,
  script: Script & { format: 3 },
  characterIds: readonly string[],
  assetIds: readonly string[] = [],
): Promise<StoryboardMaterial> {
  const media: Record<string, MediaInfo> = {};
  for (const image of script.content.images)
    media[image.asset_id] = { id: image.asset_id, url: image.url, kind: "image", label: null, description: null };
  addMedia(media, script.assets);
  let material: StoryboardMaterial = {
    scriptId: script.id,
    script: script.content,
    productImages: script.content.images.map((image) => image.asset_id),
    characters: {},
    media,
  };
  const linked = scriptProduct(script);
  if (linked) {
    const product = await sdk.products.get(linked.id, { version: linked.version });
    addMedia(media, product.assets);
    material = {
      ...material,
      product: { id: product.id, version: product.version, name: product.data.name },
      productImages: [...(product.data.images ?? [])],
    };
  }
  const characters = await Promise.all(
    [...new Set(characterIds)].map((id) =>
      sdk.characters.get(id).catch(() => undefined),
    ),
  );
  for (const character of characters)
    if (character) material = withCharacter(material, character);
  const assets = sdk.assets === undefined ? [] : await Promise.all([...new Set(assetIds)].map((id) => readNamedAsset(sdk as Pick<NuvaClient, "assets">, id)));
  return withAssets(material, assets.filter((asset) => asset !== undefined));
}
const FILE_KINDS = ["image", "video", "audio"] as const;
export function storyboardContext(
  material: Pick<StoryboardMaterial, "script" | "productImages" | "characters"> &
    Partial<Pick<StoryboardMaterial, "media">>,
): StoryboardContext {
  // Every file the playground could read is one the user may use.
  const assets: NonNullable<StoryboardContext["assets"]> = Object.fromEntries(
    Object.values(material.media ?? {}).flatMap((file) =>
      FILE_KINDS.includes(file.kind as (typeof FILE_KINDS)[number])
        ? [[file.id, { kind: file.kind as (typeof FILE_KINDS)[number], label: file.label ?? null, description: file.description ?? null }]]
        : [],
    ),
  );
  return {
    script: material.script,
    productImages: material.productImages,
    assets,
    characters: Object.fromEntries(
      Object.entries(material.characters).map(([id, character]) => [
        id,
        {
          images: character.data.image_asset_ids,
          voice: character.data.voice_asset_id ?? null,
        },
      ]),
    ),
  };
}

// ── Checks ──────────────────────────────────────────────────────────────

/** One problem and the part of the Storyboard it names: `cast`, `cast.<role>`, `direction`, `clips`, `C01`, `C01 shot 2`. */
export interface PlacedIssue {
  where: string;
  message: string;
}
export function placeIssue(issue: string): PlacedIssue {
  const at = issue.indexOf(": ");
  return at < 0
    ? { where: "", message: issue }
    : { where: issue.slice(0, at), message: issue.slice(at + 2) };
}
const clipId = (index: number) => `C${String(index + 1).padStart(2, "0")}`;
/** Limits the service's schema enforces that `storyboardIssues` does not check, in the same `where: message` form. */
export function shapeIssues(content: StoryboardContent): string[] {
  const problems: string[] = [];
  if (!content.clips.length) problems.push("clips: A Storyboard needs at least one clip.");
  if (content.clips.length > MAX_CLIPS)
    problems.push(`clips: At most ${MAX_CLIPS} clips.`);
  if (content.direction.length > 8000)
    problems.push("direction: The direction is longer than 8000 characters.");
  for (const [key, entry] of Object.entries(content.cast)) {
    if ((entry.look?.length ?? 0) > 2000)
      problems.push(`cast.${key}: The look is longer than 2000 characters.`);
    if ((entry.voice?.length ?? 0) > 2000)
      problems.push(`cast.${key}: The voice is longer than 2000 characters.`);
  }
  content.clips.forEach((clip, index) => {
    const where = clip.id || clipId(index);
    if (
      !Number.isInteger(clip.duration_ms) ||
      clip.duration_ms < MIN_CLIP_MS ||
      clip.duration_ms > MAX_CLIP_MS
    )
      problems.push(
        `${where}: A clip is ${MIN_CLIP_MS / 1000}–${MAX_CLIP_MS / 1000} seconds long, in whole milliseconds.`,
      );
    if (!clip.shots.length) problems.push(`${where}: A clip needs at least one shot.`);
    if (clip.shots.length > 20) problems.push(`${where}: At most 20 shots in a clip.`);
    clip.shots.forEach((shot, s) => {
      if (!shot.trim()) problems.push(`${where} shot ${s + 1}: Write the shot or remove it.`);
      if (shot.length > 3000)
        problems.push(`${where} shot ${s + 1}: A shot is at most 3000 characters.`);
    });
  });
  return problems;
}
/** Every problem with a Storyboard, as the service reports them; empty when it would be accepted. */
export function allIssues(
  content: StoryboardContent,
  material: StoryboardMaterial,
): string[] {
  return [...shapeIssues(content), ...storyboardIssues(content, storyboardContext(material))];
}

// ── Cast ────────────────────────────────────────────────────────────────

export const narrated = (script: Pick<ScriptContent, "panels">) =>
  scriptLines(script).some((line) => line.speaker === NARRATOR);
/** The cast entries a Storyboard of `script` has: one per role, the narrator when it speaks, and any others it holds. */
export function castKeys(
  script: Pick<ScriptContent, "roles" | "panels">,
  cast: StoryboardContent["cast"] = {},
) {
  const keys = script.roles.map((role) => role.id);
  if (narrated(script)) keys.push(NARRATOR);
  for (const key of Object.keys(cast)) if (!keys.includes(key)) keys.push(key);
  return keys;
}
/** What the cast editor shows for one entry. */
export interface CastChoice {
  /** The Character who plays the role, or none for a described person (or an unseen narrator). */
  character?: string;
  look: string;
  /** Use the Character's own voice file. */
  characterVoice: boolean;
  /** A described voice. */
  voice: string;
}
export function castChoice(entry: CastEntry | undefined): CastChoice {
  return {
    ...(entry?.character === undefined ? {} : { character: entry.character }),
    look: entry?.look ?? "",
    characterVoice: entry?.voice === CHARACTER_VOICE,
    voice: entry?.voice === undefined || entry.voice === CHARACTER_VOICE ? "" : entry.voice,
  };
}
/**
 * The cast entry an editor choice makes. A described person keeps its look; a role that speaks gets the
 * Character's voice when chosen and available, otherwise the described voice; a silent role gets no voice.
 */
export function castEntry(
  choice: CastChoice,
  role: { speaks: boolean; narrator: boolean; characterHasVoice: boolean },
): CastEntry {
  const entry: CastEntry = {};
  if (choice.character !== undefined) entry.character = choice.character;
  else if (!role.narrator && choice.look.trim()) entry.look = choice.look.trim();
  if (role.speaks) {
    if (choice.characterVoice && choice.character !== undefined && role.characterHasVoice)
      entry.voice = CHARACTER_VOICE;
    else if (choice.voice.trim()) entry.voice = choice.voice.trim();
  }
  return entry;
}

// ── Clips and shots ─────────────────────────────────────────────────────

/** Clip IDs follow their order: C01, C02, ... */
export function renumber(content: StoryboardContent): StoryboardContent {
  return {
    ...content,
    clips: content.clips.map((clip, index) => ({ ...clip, id: clipId(index) })),
  };
}
export function move<T>(list: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}
export const totalMs = (content: Pick<StoryboardContent, "clips">) =>
  content.clips.reduce((sum, clip) => sum + clip.duration_ms, 0);
/** `token` written in place of the selection. */
export function insertToken(value: string, start: number, end: number, token: string) {
  return { value: value.slice(0, start) + token + value.slice(end), caret: start + token.length };
}
/** A shot's text in order: plain text and tokens. */
export function shotSegments(
  shot: string,
): ({ text: string } | { token: StoryboardToken })[] {
  const parts: ({ text: string } | { token: StoryboardToken })[] = [];
  let last = 0;
  for (const token of storyboardTokens(shot)) {
    if (token.index > last) parts.push({ text: shot.slice(last, token.index) });
    parts.push({ token });
    last = token.index + token.raw.length;
  }
  if (last < shot.length) parts.push({ text: shot.slice(last) });
  return parts;
}

// ── How tokens read ─────────────────────────────────────────────────────

export type TokenView =
  | { kind: "person"; role: string; label: string; image?: MediaInfo; described: boolean }
  | { kind: "image"; owner: string; label: string; image?: MediaInfo }
  | { kind: "product"; label: string; image?: MediaInfo }
  | { kind: "file"; label: string; file?: MediaInfo }
  | { kind: "line"; id: string; text: string; speaker: string }
  | { kind: "unknown"; raw: string };
/** A role's display name: the Script's name for it, or "Narrator". */
export function speakerName(script: Pick<ScriptContent, "roles">, id: string) {
  return id === NARRATOR
    ? translate("Narrator")
    : (script.roles.find((role) => role.id === id)?.name ?? id);
}
/** Who plays a role: its cast Character, if any. */
export function castCharacter(
  content: Pick<StoryboardContent, "cast">,
  material: Pick<StoryboardMaterial, "characters">,
  role: string,
) {
  const id = content.cast[role]?.character;
  return id === undefined ? undefined : material.characters[id];
}
export function describeToken(
  token: StoryboardToken,
  content: Pick<StoryboardContent, "cast">,
  material: StoryboardMaterial,
): TokenView {
  const unknown = { kind: "unknown", raw: token.raw } as const;
  if (!token.name) return unknown;
  if (LINE_ID.test(token.name)) {
    const line = scriptLines(material.script).find((item) => item.id === token.name);
    return line
      ? { kind: "line", id: line.id, text: line.text, speaker: speakerName(material.script, line.speaker) }
      : unknown;
  }
  if (namesAsset(token, material.script)) {
    const file = token.asset === undefined ? undefined : material.media[token.asset];
    const kind = file?.kind === "video" ? "Video" : file?.kind === "audio" ? "Audio" : "Image";
    return file ? { kind: "file", label: file.label ?? translate(kind), file } : unknown;
  }
  if (token.name === PRODUCT) {
    const name = material.product?.name ?? translate("Product");
    if (token.asset !== undefined) {
      const image = material.media[token.asset];
      return {
        kind: "image",
        owner: PRODUCT,
        label: image?.label ?? name,
        ...(image ? { image } : {}),
      };
    }
    const first = material.productImages[0];
    const image = first === undefined ? undefined : material.media[first];
    return { kind: "product", label: name, ...(image ? { image } : {}) };
  }
  const role = material.script.roles.find((item) => item.id === token.name);
  if (!role) return unknown;
  const character = castCharacter(content, material, role.id);
  if (token.asset !== undefined) {
    const image = material.media[token.asset];
    const who = character?.data.name ?? role.name;
    return {
      kind: "image",
      owner: role.id,
      label: image?.label ? `${who} · ${image.label}` : who,
      ...(image ? { image } : {}),
    };
  }
  const first = character?.data.image_asset_ids[0];
  const image = first === undefined ? undefined : material.media[first];
  return {
    kind: "person",
    role: role.id,
    label: character?.data.name ?? role.name,
    described: character === undefined,
    ...(image ? { image } : {}),
  };
}

/** What the shot editor's Insert menu offers, in groups. */
export interface InsertGroup {
  label: UiLabel;
  options: { token: string; label: string }[];
}
const excerpt = (text: string, length = 48) =>
  text.length > length ? text.slice(0, length).trimEnd() + "…" : text;
export function insertGroups(
  content: Pick<StoryboardContent, "cast">,
  material: StoryboardMaterial,
): InsertGroup[] {
  const groups: InsertGroup[] = [];
  const roles = material.script.roles;
  if (roles.length)
    groups.push({
      label: msg("People"),
      options: roles.map((role) => {
        const character = castCharacter(content, material, role.id);
        return {
          token: `{{${role.id}}}`,
          label: character ? `${role.name} · ${character.data.name}` : role.name,
        };
      }),
    });
  for (const role of roles) {
    const character = castCharacter(content, material, role.id);
    if (!character?.data.image_asset_ids.length) continue;
    groups.push({
      label: msg("{p0}'s images", { p0: character.data.name }),
      options: character.data.image_asset_ids.map((id, index) => ({
        token: `{{${role.id}:${id}}}`,
        label: material.media[id]?.label ?? `${character.data.name} ${index + 1}`,
      })),
    });
  }
  if (material.productImages.length) {
    const name = material.product?.name ?? translate("Product");
    groups.push({
      label: msg("Product images"),
      options: [
        { token: "{{product}}", label: name },
        ...material.productImages.map((id, index) => ({
          token: `{{product:${id}}}`,
          label: material.media[id]?.label ?? `${name} ${index + 1}`,
        })),
      ],
    });
  }
  const lines = scriptLines(material.script);
  if (lines.length)
    groups.push({
      label: msg("Script lines"),
      options: lines.map((line) => ({
        token: `{{${line.id}}}`,
        label: `${line.id} · ${speakerName(material.script, line.speaker)}: ${excerpt(line.text)}`,
      })),
    });
  return groups;
}
