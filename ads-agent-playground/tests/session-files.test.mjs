import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { browser, bundle } from "./storyboard-fixture.mjs";

// session_file cards: the card preview, the detail view (image and audio playback), attach, and a fresh files.get
// once a cached signed URL has expired.
const built = await bundle(
  "session-files-",
  `export { ResourceCards } from './src/resource-cards.ts';
   export { openResource } from './src/resources.ts';
   export { setLocale } from './src/i18n.ts';`,
);
after(built.cleanup);
const { ResourceCards, openResource, setLocale } = built.module;
let env;
before(() => {
  env = browser();
  setLocale("en", false);
});
after(() => env.restore());
const id = "sf_" + "a".repeat(32);
const record = { ref: { kind: "session_file", id }, label: "Mia, front portrait" };
const file = (mime, expiresIn = 12 * 3600_000, n = 1) => ({
  id, mime, label: "Mia, front portrait",
  download_url: `https://files.example/${n}.${mime.split("/")[1]}?sig`,
  download_url_expires_at: new Date(Date.now() + expiresIn).toISOString(),
});
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
function cards(read) {
  const root = document.getElementById("root");
  return new ResourceCards({ root, read, open() {}, layout: (change) => change() });
}

test("a session_file card previews an image by mime with its download_url and label", async () => {
  const reads = [];
  const view = cards(async (value) => (reads.push(value), file("image/png")));
  const element = view.create(record);
  document.getElementById("root").append(element);
  await settle();
  assert.equal(reads.length, 1);
  assert.equal(element.dataset.previewState, "ready");
  assert.equal(element.querySelector("img").src, "https://files.example/1.png?sig");
  assert.equal(element.querySelector(".resource-preview-title").textContent, "Mia, front portrait");
  assert.match(element.textContent, /Session file/);
  view.dispose();
});
test("a cached session_file is read again once its download_url has expired, and reused before", async () => {
  let n = 0;
  let expiresIn = 12 * 3600_000;
  const view = cards(async () => file("image/png", expiresIn, ++n));
  const root = document.getElementById("root");
  const first = view.create(record);
  root.append(first);
  await settle();
  const second = view.create(record);
  root.append(second);
  await settle();
  assert.equal(n, 1, "A valid URL is reused.");
  view.dispose();
  expiresIn = -1000;
  const stale = cards(async () => file("image/png", expiresIn, ++n));
  const a = stale.create(record);
  root.append(a);
  await settle();
  const b = stale.create(record);
  root.append(b);
  await settle();
  assert.equal(n, 3, "An expired URL is fetched again.");
  assert.equal(b.querySelector("img").src, "https://files.example/3.png?sig");
  stale.dispose();
});
test("the detail view shows an image, plays audio, attaches the file, and tolerates other media types", async () => {
  const attached = [];
  const host = (value, sessionId = "session") => ({
    sdk: { agent: ({ sessionId: requested }) => ({ files: { get: async (fileId) => { assert.equal(requested, sessionId); assert.equal(fileId, id); return value; } } }) },
    scope: "files-test", sessionId, records: [], remember() {}, attach: (link) => attached.push(link), requestAgent: async () => {},
  });
  const fresh = () => { const root = document.createElement("div"); document.body.append(root); return root; };
  let root = fresh();
  await openResource(root, record, host(file("image/png")));
  assert.equal(root.querySelector(".resource-detail img").getAttribute("src"), "https://files.example/1.png?sig");
  [...root.querySelectorAll(".resource-actions button")].find((button) => /Attach/.test(button.textContent)).click();
  assert.deepEqual(attached.map((link) => link.ref), [record.ref]);
  root = fresh();
  await openResource(root, record, host(file("audio/mpeg")));
  const audio = root.querySelector(".resource-detail audio");
  assert.equal(audio.getAttribute("src"), "https://files.example/1.mpeg?sig");
  assert.equal(audio.controls, true);
  root = fresh();
  await openResource(root, record, host(file("application/pdf")));
  assert.equal(root.querySelector(".resource-detail img, .resource-detail audio"), null, "An unknown media type is listed without a broken preview.");
  assert.match(root.textContent, /registers it as an Asset/);
});
