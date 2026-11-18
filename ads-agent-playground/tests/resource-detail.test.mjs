import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { browser, bundle } from "./storyboard-fixture.mjs";

// The detail views of a Prompt and a clip: a Prompt shows its text and settings; a clip opens the Prompt it renders.
const built = await bundle(
  "resource-detail-",
  `export { openResource } from './src/resources.ts';
   export { setLocale } from './src/i18n.ts';`,
);
after(built.cleanup);
const { openResource, setLocale } = built.module;
let env;
before(() => {
  env = browser();
  setLocale("en", false);
});
after(() => env.restore());

const AT = "2026-11-03T09:00:00Z";
const PROMPT = "77777777-7777-4777-8777-777777777771";
const JOB = "88888888-8888-4888-8888-888888888881";
const prompt = {
  id: PROMPT,
  created_at: AT,
  data: { prompt: "Mia lifts the cup into the morning light.", seconds: 10, ratio: "9:16", image_asset_ids: [], video_asset_ids: [], audio_asset_ids: [] },
  assets: {},
};
const asset = { id: "a1", kind: "video", mime: "video/mp4", download_url: "https://cdn.example/clip.mp4", download_url_expires_at: "2026-11-04T09:00:00Z" };
const job = { id: JOB, status: "completed", prompt: PROMPT, seed: 1, resolution: "768P", batch_id: null, asset, error: null, error_code: null, callback: null, created_at: AT };
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
const fresh = () => {
  const root = document.createElement("div");
  document.body.append(root);
  return root;
};
function host(records = [], opened = []) {
  return {
    sdk: { prompts: { get: async ({ id }) => (assert.equal(id, PROMPT), prompt) }, jobs: { get: async (id) => (assert.equal(id, JOB), job) } },
    scope: "detail-test",
    sessionId: "session",
    records,
    remember() {},
    attach() {},
    requestAgent: async () => {},
    open: async (record) => opened.push(record),
  };
}
const buttons = (root) => [...root.querySelectorAll(".resource-actions button")];

test("a Prompt opens to its text, settings and actions", async () => {
  const root = fresh();
  await openResource(root, { ref: { kind: "prompt", id: PROMPT }, label: "Clip 1 prompt" }, host());
  assert.ok(root.querySelector(".resource-detail .prompt-viewer"), "The Prompt viewer is shown.");
  assert.match(root.querySelector(".prompt-document").textContent, /Mia lifts the cup/);
  assert.match(root.querySelector(".prompt-configuration").textContent, /10s[\s\S]*9:16/);
  assert.deepEqual(
    buttons(root).map((button) => button.textContent.trim()).filter((text) => /prompt/i.test(text)),
    ["View raw prompt", "Copy prompt"],
  );
  const generate = buttons(root).find((button) => button.textContent.trim() === "Generate video");
  assert.equal(generate.dataset.write, "", "Generate video asks the Agent for work: a read-only host hides it.");
});

test("a clip opens the Prompt it renders, by the label the conversation knows it by", async () => {
  const opened = [];
  const root = fresh();
  const known = { ref: { kind: "prompt", id: PROMPT }, label: "Clip 1 prompt", sessionId: "session" };
  await openResource(root, { ref: { kind: "job", id: JOB }, label: "Clip 01" }, host([known], opened));
  const open = buttons(root).find((button) => button.textContent.trim() === "Open Prompt");
  assert.ok(open, "The clip has an Open Prompt button.");
  open.click();
  await settle();
  assert.deepEqual(opened.map((record) => [record.ref, record.label]), [[known.ref, "Clip 1 prompt"]]);

  // A Prompt the conversation never named is opened by its ID.
  opened.length = 0;
  const other = fresh();
  await openResource(other, { ref: { kind: "job", id: JOB }, label: "Clip 01" }, host([], opened));
  buttons(other).find((button) => button.textContent.trim() === "Open Prompt").click();
  await settle();
  assert.deepEqual(opened.map((record) => record.ref), [{ kind: "prompt", id: PROMPT }]);
});
