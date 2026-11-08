import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { browser, bundle, ids, mia, product } from "./storyboard-fixture.mjs";

const built = await bundle(
  "playground-characters-",
  `export { characterForm } from './src/characters.ts';
   export { uploadProductImage, uploadProductVideo, removeProductVideo } from './src/product.ts';
   export { setLocale } from './src/i18n.ts';`,
);
after(built.cleanup);
const { characterForm, uploadProductImage, uploadProductVideo, removeProductVideo, setLocale } = built.module;
let env;
before(() => {
  env = browser();
  setLocale("en", false);
});
after(() => env.restore());

function choose(input, files) {
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new env.window.Event("change"));
}
function type(input, value) {
  input.value = value;
  input.dispatchEvent(new env.window.Event("input"));
}
function sdk() {
  const calls = { uploads: [], created: [], updated: [] };
  let next = 100;
  return {
    calls,
    assets: {
      upload: async (file, options) => {
        calls.uploads.push([file.name, options]);
        return { id: `asset-${next++}`, kind: options.kind };
      },
    },
    characters: {
      create: async (input) => {
        calls.created.push(input);
        return { id: "character-new", version: 1, data: input.data, assets: {} };
      },
      update: async (ref, changes) => {
        calls.updated.push([ref, changes]);
        return { ...ref, version: ref.version + 1, data: { ...ref.data, ...changes.data } };
      },
    },
  };
}
function saved() {
  let resolve;
  const done = new Promise((r) => (resolve = r));
  return { done, saved: (character) => resolve(character) };
}

test("creating a Character uploads each image with its label and description, then the voice, in order", async () => {
  const client = sdk();
  const result = saved();
  const body = env.window.document.getElementById("root");
  const form = characterForm(body, { sdk: client, saved: result.saved });
  type(form.querySelector('input[name="name"]'), "  Mia  ");
  type(form.querySelector('textarea[name="description"]'), "Twenties, short hair, speaks Mandarin.");
  const front = new env.window.File(["front"], "front.png", { type: "image/png" });
  const side = new env.window.File(["side"], "side.png", { type: "image/png" });
  choose(form.querySelector('input[name="images"]'), [front, side]);
  assert.equal(form.querySelectorAll(".character-image-row").length, 2);
  assert.equal(form.querySelector(".character-image-row .badge").textContent, "Default");
  type(form.querySelector('input[name="image-label-0"]'), "Front");
  type(form.querySelector('input[name="image-description-0"]'), "Facing the camera, neutral light");
  choose(form.querySelector('input[name="voice"]'), [new env.window.File(["voice"], "mia.wav", { type: "audio/wav" })]);
  assert.match(form.querySelector(".character-voice").textContent, /mia\.wav/);
  form.dispatchEvent(new env.window.Event("submit", { cancelable: true }));
  const character = await result.done;
  assert.deepEqual(client.calls.uploads, [
    ["front.png", { kind: "image", label: "Front", description: "Facing the camera, neutral light" }],
    ["side.png", { kind: "image" }],
    ["mia.wav", { kind: "audio" }],
  ]);
  assert.deepEqual(client.calls.created, [
    {
      data: {
        name: "Mia",
        description: "Twenties, short hair, speaks Mandarin.",
        image_asset_ids: ["asset-100", "asset-101"],
        voice_asset_id: "asset-102",
      },
    },
  ]);
  assert.equal(character.id, "character-new");
});

test("a Character without images is not saved", async () => {
  const client = sdk();
  const body = env.window.document.getElementById("root");
  const form = characterForm(body, { sdk: client, saved: () => assert.fail("Must not save.") });
  type(form.querySelector('input[name="name"]'), "Nobody");
  form.dispatchEvent(new env.window.Event("submit", { cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(client.calls.created.length, 0);
  assert.match(env.window.document.getElementById("notice").textContent, /Add at least one image/);
});

test("editing a Character keeps its base, reorders its images (the first is the default) and removes its voice", async () => {
  const client = sdk();
  const result = saved();
  const body = env.window.document.getElementById("root");
  const form = characterForm(body, { sdk: client, base: mia, saved: result.saved });
  assert.deepEqual([...form.querySelectorAll(".character-image-row strong")].map((label) => label.textContent), ["Front", "Side"]);
  form.querySelector('.character-image-row button[aria-label="Move image down"]').click();
  assert.deepEqual([...form.querySelectorAll(".character-image-row strong")].map((label) => label.textContent), ["Side", "Front"]);
  [...form.querySelectorAll(".character-voice button")].find((button) => button.textContent.includes("Remove voice")).click();
  form.dispatchEvent(new env.window.Event("submit", { cancelable: true }));
  await result.done;
  assert.equal(client.calls.uploads.length, 0);
  assert.equal(client.calls.updated.length, 1);
  const [ref, changes] = client.calls.updated[0];
  assert.equal(ref, mia, "The update names the version that was read.");
  // Only the changed fields are sent; the name and description keep their saved values.
  assert.deepEqual(changes, { data: { image_asset_ids: [ids.miaSide, ids.miaFront], voice_asset_id: null } });
});

test("saving a Character with no changes saves nothing", async () => {
  const client = sdk();
  const result = saved();
  const body = env.window.document.getElementById("root");
  const form = characterForm(body, { sdk: client, base: mia, saved: result.saved });
  form.dispatchEvent(new env.window.Event("submit", { cancelable: true }));
  assert.equal(await result.done, mia);
  assert.equal(client.calls.updated.length, 0);
});

test("a Product image uploads as an Asset with its label, then is added to the Product's images", async () => {
  const calls = [];
  const client = {
    assets: { upload: async (file, options) => (calls.push(["upload", file.name, options]), { id: "asset-label", kind: "image" }) },
    products: { update: async (ref, changes) => (calls.push(["update", ref, changes]), { ...ref, data: { ...ref.data, ...changes.data } }) },
  };
  const file = new env.window.File(["box"], "box.png", { type: "image/png" });
  const images = [...product.data.image_asset_ids, "asset-label"];
  const updated = await uploadProductImage(client, product, file, { label: "Back of the box", description: "" });
  assert.deepEqual(calls, [
    ["upload", "box.png", { kind: "image", label: "Back of the box" }],
    ["update", product, { data: { image_asset_ids: images } }],
  ]);
  assert.deepEqual(updated.data.image_asset_ids, images);
  calls.length = 0;
  await uploadProductImage(client, product, file, { label: "", description: "" });
  assert.deepEqual(calls[0], ["upload", "box.png", { kind: "image" }], "Without a label the upload sends none.");
  // The same file again is the same Asset: nothing is added.
  calls.length = 0;
  assert.equal(await uploadProductImage(client, updated, file, { label: "", description: "" }), updated);
  assert.deepEqual(calls.map((call) => call[0]), ["upload"]);
  const full = { ...product, data: { ...product.data, image_asset_ids: Array.from({ length: 20 }, (_, i) => `i${i}`) } };
  calls.length = 0;
  await assert.rejects(uploadProductImage(client, full, file, { label: "", description: "" }), /already has 20 images/);
  assert.equal(calls.length, 0, "A full Product uploads nothing.");
});

test("a Product video uploads with its label, is added to the Product's videos, and can be removed", async () => {
  const calls = [];
  const client = {
    assets: { upload: async (file, options) => (calls.push(["upload", file.name, options]), { id: "asset-video", kind: "video" }) },
    products: { update: async (ref, changes) => (calls.push(["update", ref, changes]), { ...ref, data: { ...ref.data, ...changes.data } }) },
  };
  const file = new env.window.File(["clip"], "demo.mp4", { type: "video/mp4" });
  const updated = await uploadProductVideo(client, product, file, { label: "Unboxing", description: "" });
  assert.deepEqual(calls, [
    ["upload", "demo.mp4", { kind: "video", label: "Unboxing" }],
    ["update", product, { data: { video_asset_ids: ["asset-video"] } }],
  ]);
  assert.deepEqual(updated.data.video_asset_ids, ["asset-video"]);
  const removed = await removeProductVideo(client, updated, "asset-video");
  assert.deepEqual(calls.at(-1), ["update", updated, { data: { video_asset_ids: [] } }]);
  assert.deepEqual(removed.data.video_asset_ids, []);
  const full = { ...product, data: { ...product.data, video_asset_ids: ["a", "b", "c", "d", "e"] } };
  await assert.rejects(uploadProductVideo(client, full, file, { label: "", description: "" }), /already has 5 videos/);
});
