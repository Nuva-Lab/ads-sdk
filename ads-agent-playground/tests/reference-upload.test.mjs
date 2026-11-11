import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { browser, bundle } from "./storyboard-fixture.mjs";

const built = await bundle(
  "playground-reference-upload-",
  `export { referencePicker, referenceKind, REFERENCE_ACCEPT } from './src/reference-upload.ts';
   export { setLocale } from './src/i18n.ts';`,
);
after(built.cleanup);
const { referencePicker, referenceKind, REFERENCE_ACCEPT, setLocale } = built.module;
let env;
before(() => {
  env = browser();
  setLocale("en", false);
});
after(() => env.restore());

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const file = (name, type) => new env.window.File([name], name, { type });
function choose(input, files) {
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new env.window.Event("change"));
}
function type(input, value) {
  input.value = value;
  input.dispatchEvent(new env.window.Event("input"));
}
const submit = (dialog) => dialog.querySelector("form").dispatchEvent(new env.window.Event("submit", { cancelable: true }));
function uploads(fail = () => false, known = {}) {
  const calls = [];
  let next = 1;
  return {
    calls,
    assets: {
      upload: async (value, options) => {
        calls.push([value.name, options]);
        if (fail(value)) throw Object.assign(new Error("The file is larger than 10000000 bytes."), { code: "INVALID_INPUT" });
        // Like the service: a file uploaded before is the same Asset, and omitted text keeps its earlier text.
        if (known[value.name]) return { ...known[value.name], label: options.label ?? known[value.name].label };
        const id = `asset-${next++}`;
        return { id, kind: options.kind, label: options.label ?? null, ref: { kind: "asset", id } };
      },
    },
  };
}
function deferredUploads() {
  const calls = [];
  const pending = [];
  return {
    calls,
    release: () => pending.shift()(),
    assets: {
      upload: (value, options) =>
        new Promise((resolve) => {
          calls.push(value.name);
          pending.push(() => resolve({ id: `asset-${value.name}`, kind: options.kind, label: options.label ?? null, ref: { kind: "asset", id: `asset-${value.name}` } }));
        }),
    },
  };
}
function picker(sdk) {
  const root = env.root;
  root.replaceChildren();
  return referencePicker({ sdk, container: () => root, multiple: true, title: "Upload reference files" });
}

test("a file's kind comes from its MIME type, or its extension when the browser gives none", () => {
  assert.equal(referenceKind({ name: "scene.png", type: "image/png" }), "image");
  assert.equal(referenceKind({ name: "walk.mp4", type: "video/mp4" }), "video");
  assert.equal(referenceKind({ name: "bgm.wav", type: "audio/x-wav" }), "audio");
  assert.equal(referenceKind({ name: "voice.m4a", type: "" }), "audio");
  assert.equal(referenceKind({ name: "bgm.MP3", type: "application/octet-stream" }), "audio");
  assert.equal(referenceKind({ name: "clip.mov", type: "video/quicktime" }), undefined);
  assert.equal(referenceKind({ name: "look.gif", type: "image/gif" }), undefined);
  assert.equal(referenceKind({ name: "notes", type: "" }), undefined);
  for (const accepted of ["image/png", "video/mp4", "audio/mpeg", ".m4a"]) assert.ok(REFERENCE_ACCEPT.split(",").includes(accepted));
});

test("chosen files upload in order with their own kind, label and description, then are handed back", async () => {
  const sdk = uploads();
  const pick = picker(sdk);
  let result;
  pick.open((uploaded) => (result = uploaded));
  assert.ok(pick.input.isConnected, "The file input is in the page when it is opened.");
  assert.equal(pick.input.multiple, true);
  choose(pick.input, [file("store.jpg", "image/jpeg"), file("walk.mp4", "video/mp4"), file("bgm.mp3", "audio/mpeg")]);
  const dialog = env.root.querySelector("dialog.reference-upload");
  assert.deepEqual([...dialog.querySelectorAll(".reference-upload-row")].map((row) => row.dataset.kind), ["image", "video", "audio"]);
  type(dialog.querySelector('input[name="reference-label-0"]'), "  Store interior ");
  type(dialog.querySelector('textarea[name="reference-description-0"]'), "Wooden shelves, warm light");
  type(dialog.querySelector('input[name="reference-label-2"]'), "Morning music");
  submit(dialog);
  await settle();
  assert.deepEqual(sdk.calls, [
    ["store.jpg", { kind: "image", label: "Store interior", description: "Wooden shelves, warm light" }],
    ["walk.mp4", { kind: "video" }],
    ["bgm.mp3", { kind: "audio", label: "Morning music" }],
  ]);
  assert.deepEqual(result.map((item) => [item.asset.id, item.label]), [
    ["asset-1", "Store interior"],
    ["asset-2", "walk.mp4"],
    ["asset-3", "Morning music"],
  ]);
  assert.equal(dialog.isConnected, false, "The dialog closes after uploading.");
});

test("an unsupported file is refused inside the dialog; the rest can be removed before uploading", async () => {
  const sdk = uploads();
  const pick = picker(sdk);
  let result;
  env.window.document.getElementById("notice").textContent = "";
  pick.open((uploaded) => (result = uploaded));
  choose(pick.input, [file("look.gif", "image/gif"), file("a.png", "image/png"), file("b.png", "image/png")]);
  const dialog = env.root.querySelector("dialog.reference-upload");
  // An open dialog covers the page's notice, so the dialog says it.
  assert.match(dialog.querySelector(".reference-upload-refused").textContent, /Not a supported file: look\.gif/);
  assert.equal(env.window.document.getElementById("notice").textContent, "");
  dialog.querySelector('button[aria-label="Remove a.png"]').click();
  assert.equal(dialog.querySelectorAll(".reference-upload-row").length, 1);
  submit(dialog);
  await settle();
  assert.deepEqual(sdk.calls.map((call) => call[0]), ["b.png"]);
  assert.deepEqual(result.map((item) => item.file.name), ["b.png"]);

  // Only unsupported files: no dialog, so the page's notice says it.
  pick.open(() => assert.fail("Nothing was uploaded."));
  choose(pick.input, [file("clip.mov", "video/quicktime")]);
  assert.equal(env.root.querySelector("dialog.reference-upload"), null);
  assert.match(env.window.document.getElementById("notice").textContent, /Not a supported file: clip\.mov/);
});

test("a failed upload shows the service's error; retrying uploads only the files not yet uploaded", async () => {
  let failing = true;
  const sdk = uploads((value) => failing && value.name === "big.mp4");
  const pick = picker(sdk);
  let result;
  pick.open((uploaded) => (result = uploaded));
  choose(pick.input, [file("scene.png", "image/png"), file("big.mp4", "video/mp4")]);
  const dialog = env.root.querySelector("dialog.reference-upload");
  submit(dialog);
  await settle();
  assert.match(dialog.querySelector(".storyboard-error").textContent, /larger than 10000000 bytes/);
  assert.equal(result, undefined);
  assert.equal(dialog.querySelector('input[name="reference-label-0"]').disabled, true, "An uploaded file's text is fixed.");
  failing = false;
  submit(dialog);
  await settle();
  assert.deepEqual(sdk.calls.map((call) => call[0]), ["scene.png", "big.mp4", "big.mp4"]);
  assert.deepEqual(result.map((item) => item.asset.id), ["asset-1", "asset-2"]);
});

test("closing the dialog hands nothing back, even when an upload was still running", async () => {
  let release;
  const sdk = {
    assets: {
      upload: (value, options) => new Promise((resolve) => (release = () => resolve({ id: "asset-late", kind: options.kind, ref: { kind: "asset", id: "asset-late" } }))),
    },
  };
  const pick = picker(sdk);
  pick.open(() => assert.fail("A closed dialog hands nothing back."));
  choose(pick.input, [file("scene.png", "image/png")]);
  const dialog = env.root.querySelector("dialog.reference-upload");
  submit(dialog);
  dialog.close();
  release();
  await settle();
  assert.equal(dialog.isConnected, false);
});

test("while files upload, none can be removed and no text changes; every chosen file is uploaded and handed back", async () => {
  const sdk = deferredUploads();
  const pick = picker(sdk);
  let result;
  pick.open((uploaded) => (result = uploaded));
  choose(pick.input, [file("a.png", "image/png"), file("b.png", "image/png")]);
  const dialog = env.root.querySelector("dialog.reference-upload");
  type(dialog.querySelector('input[name="reference-label-0"]'), "Front");
  submit(dialog);
  assert.deepEqual(sdk.calls, ["a.png"]);
  const remove = dialog.querySelector('button[aria-label="Remove a.png"]');
  assert.equal(remove.disabled, true, "The file being uploaded can't be removed.");
  assert.equal(dialog.querySelector('button[aria-label="Remove b.png"]').disabled, true, "Nor can one waiting its turn.");
  assert.equal(dialog.querySelector('input[name="reference-label-0"]').disabled, true);
  assert.equal(dialog.querySelector('input[name="reference-label-1"]').disabled, true);
  remove.click();
  submit(dialog);
  assert.equal(dialog.querySelectorAll(".reference-upload-row").length, 2);
  assert.deepEqual(sdk.calls, ["a.png"], "A second submit does not start another upload.");
  sdk.release();
  await settle();
  assert.deepEqual(sdk.calls, ["a.png", "b.png"]);
  sdk.release();
  await settle();
  assert.deepEqual(result.map((item) => [item.asset.id, item.label]), [["asset-a.png", "Front"], ["asset-b.png", "b.png"]]);
});

test("a file uploaded before with no new text comes back as its Asset, labelled as the Asset is", async () => {
  const earlier = { id: "asset-earlier", kind: "image", label: "Store interior", ref: { kind: "asset", id: "asset-earlier" } };
  const sdk = uploads(() => false, { "store.png": earlier });
  const pick = picker(sdk);
  let result;
  pick.open((uploaded) => (result = uploaded));
  choose(pick.input, [file("store.png", "image/png")]);
  submit(env.root.querySelector("dialog.reference-upload"));
  await settle();
  assert.deepEqual(sdk.calls, [["store.png", { kind: "image" }]], "No text is sent, so the Asset keeps its own.");
  assert.deepEqual(result.map((item) => [item.asset.id, item.label]), [["asset-earlier", "Store interior"]]);
});
