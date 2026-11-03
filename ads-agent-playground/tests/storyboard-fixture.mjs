/** Shared jsdom setup and Script v3 / Storyboard fixtures for the Storyboard and Character view tests. */
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** A browser-like global environment; call the returned function to restore the previous globals. */
export function browser() {
  const dom = new JSDOM(
    '<!doctype html><html lang="en"><body><div id="notice" hidden></div><main id="root"></main></body></html>',
    { url: "https://playground.test/" },
  );
  const { window } = dom;
  window.HTMLDialogElement.prototype.showModal ??= function () {
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close ??= function () {
    this.open = false;
    this.dispatchEvent(new window.Event("close"));
  };
  const names = ["window", "document", "localStorage", "Event", "HTMLElement", "Node", "File"];
  const previous = Object.fromEntries(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const name of names)
    Object.defineProperty(globalThis, name, { value: name === "window" ? window : window[name], configurable: true, writable: true });
  const createObjectURL = URL.createObjectURL;
  URL.createObjectURL = () => "blob:https://playground.test/preview";
  return {
    window,
    root: window.document.getElementById("root"),
    restore() {
      URL.createObjectURL = createObjectURL;
      for (const name of names) {
        if (previous[name]) Object.defineProperty(globalThis, name, previous[name]);
        else delete globalThis[name];
      }
      dom.window.close();
    },
  };
}

/** Bundles the playground modules the tests use into one ESM file. */
export async function bundle(prefix, contents) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  await build({
    stdin: { contents, resolveDir: new URL("..", import.meta.url).pathname, loader: "ts" },
    outfile: join(directory, "bundle.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
  });
  return { module: await import(pathToFileURL(join(directory, "bundle.mjs"))), cleanup: () => rm(directory, { recursive: true, force: true }) };
}

const uuid = (n) => `${String(n).padStart(8, "0")}-2222-4222-8222-222222222222`;
export const ids = {
  script: uuid(1),
  storyboard: uuid(2),
  product: uuid(3),
  productRevision: uuid(4),
  productFront: uuid(5),
  productBack: uuid(6),
  mia: uuid(7),
  miaFront: uuid(8),
  miaSide: uuid(9),
  miaVoice: uuid(10),
  leo: uuid(11),
  leoFront: uuid(12),
};
const asset = (id, kind, label = null, description = null) => ({
  id,
  kind,
  mime: kind === "image" ? "image/png" : "audio/wav",
  source: "uploaded",
  size_bytes: 1000,
  metadata: {},
  label,
  description,
  created_at: "2026-11-01T09:00:00Z",
  download_url: `https://media.playground.test/${id}`,
  download_url_expires_at: "2099-01-01T00:00:00Z",
});
export const scriptContent = {
  schema_version: 3,
  concept: {
    name: "Still warm at noon",
    category: "other",
    purchase_task: "Choose a travel cup",
    proposition: "Coffee poured at seven is still warm at your noon meeting.",
    route: "Presenter to camera with product close-ups",
    route_reason: "The steam has to be seen.",
    speaker_relation: "A colleague recommending it",
  },
  duration_ms: 10000,
  beats: [{ id: "B01", purpose: "Show the cup keeping coffee warm", fact_ids: [] }],
  roles: [
    { id: "host", name: "Host", description: "A woman in her twenties, short hair", speaks: true },
    { id: "friend", name: "Friend", description: "Her colleague, listening", speaks: false },
  ],
  panels: [
    {
      id: "P01",
      beat_id: "B01",
      on_screen: ["host", "friend", "product"],
      action: "The host opens the cup; steam rises.",
      fact_ids: [],
      lines: [
        { id: "L01", speaker: "host", mode: "on_camera", text: "Still warm at noon." },
        { id: "L02", speaker: "narrator", mode: "voiceover", text: "Morrow. Warm all day." },
      ],
      notes: "Show the logo on the lid.",
    },
  ],
  facts: [],
  images: [{ asset_id: ids.productFront, role: "product_appearance", mime_type: "image/png", url: `https://media.playground.test/${ids.productFront}` }],
};
export const script = {
  id: ids.script,
  kind: "script",
  ref: { kind: "script", id: ids.script },
  label: "Still warm at noon",
  format: 3,
  content: scriptContent,
  lineage_id: ids.script,
  base_id: null,
  batch_id: null,
  schema_version: 1,
  created_at: "2026-11-01T09:00:00Z",
  data: { text: "{}" },
  relationships: [{ type: "based_on", target: { kind: "product", id: ids.productRevision } }],
  entities: { [ids.productRevision]: { kind: "product", id: ids.product, version: 2 } },
  assets: {},
  skills: {},
};
export const product = {
  id: ids.product,
  ref: { kind: "product", id: ids.product },
  label: "Morrow Cup",
  version: 2,
  revision: ids.productRevision,
  brand_id: uuid(20),
  schema_version: 1,
  created_at: "2026-11-01T09:00:00Z",
  data: { name: "Morrow Cup", images: [ids.productFront, ids.productBack] },
  assets: { [ids.productFront]: asset(ids.productFront, "image", "Front"), [ids.productBack]: asset(ids.productBack, "image", "Back of the box") },
};
const character = (id, name, images, voice) => ({
  id,
  ref: { kind: "character", id },
  label: name,
  version: 1,
  revision: uuid(30 + images.length),
  schema_version: 1,
  created_at: "2026-11-01T09:00:00Z",
  data: { name, description: `${name}, as seen in every clip.`, image_asset_ids: images.map(([image]) => image), voice_asset_id: voice ?? null },
  assets: Object.fromEntries([
    ...images.map(([image, label]) => [image, asset(image, "image", label)]),
    ...(voice ? [[voice, asset(voice, "audio")]] : []),
  ]),
});
export const mia = character(ids.mia, "Mia", [[ids.miaFront, "Front"], [ids.miaSide, "Side"]], ids.miaVoice);
export const leo = character(ids.leo, "Leo", [[ids.leoFront, null]]);
export const storyboardContent = {
  script: ids.script,
  cast: {
    host: { character: ids.mia, voice: "character" },
    friend: { look: "A tall man in a grey coat" },
    narrator: { voice: "A warm, low female voice" },
  },
  direction: "Bright kitchen, morning light. Keep the {{product}} label readable.",
  clips: [
    {
      id: "C01",
      duration_ms: 10000,
      shots: [`Close on {{host:${ids.miaSide}}} lifting {{product:${ids.productBack}}}. {{L01}}`, "{{friend}} smiles at her. {{L02}}"],
    },
  ],
};
/** The parts of the SDK the views read. */
export function fakeSdk(extra = {}) {
  const characters = { [ids.mia]: mia, [ids.leo]: leo };
  return {
    products: { get: async (id, query) => (id === ids.product && query?.version === 2 ? product : Promise.reject(new Error("Unexpected Product read"))) },
    characters: {
      get: async (id) => characters[id] ?? Promise.reject(new Error("Character not found")),
      list: async () => ({ items: [mia, leo], next_cursor: null }),
    },
    scripts: { get: async () => script },
    ...extra,
  };
}
