import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "agent-work-"));
after(() => rm(directory, { recursive: true, force: true }));
await build({
  stdin: {
    contents: `export {ChatController} from './src/chat.ts'; export {Message, draftValue} from '../typescript/dist/message.js';`,
    resolveDir: new URL("..", import.meta.url).pathname,
    loader: "ts",
  },
  outfile: join(directory, "work.mjs"), bundle: true, format: "esm", platform: "node",
});
const { ChatController, Message, draftValue } = await import(pathToFileURL(join(directory, "work.mjs")));
const source = { ref: { kind: "script", id: "00000003-1111-4111-8111-111111111111" }, label: "Selected Script" };

function fixture(t, send = async () => {}) {
  const previous = globalThis.document;
  const notice = { append() {}, replaceChildren() {}, className: "" };
  globalThis.document = {
    body: { dataset: {} }, activeElement: {},
    getElementById: id => id === "notice" ? notice : id === "chat" ? { scrollTop: 0, scrollHeight: 300 } : null,
    createTextNode: text => ({ textContent: text }),
  };
  t.after(() => { globalThis.document = previous; });
  const sent = [], references = { cleared: 0, hasPendingAnnotation: () => false, hasQuotes: () => true,
    clear() { this.cleared++; }, build: () => Message.create().quote(source) };
  const controller = Object.create(ChatController.prototype);
  Object.assign(controller, {
    agent: { send: async (draft, options) => { sent.push({ draft, options, value: structuredClone(draftValue(draft)) }); await send(draft, options); } },
    sessionId: "selected", closed: false, sending: false, status: "idle", attached: [source],
    messageReferences: references, retry: undefined,
    composer: { value: "Unsent draft", empty() { return !this.value; }, parts() { return [{ type: "text", text: this.value }]; },
      clear() { this.value = ""; }, focus() {} },
    controls() {}, drawAttachments() {},
  });
  return { controller, sent, references };
}

test("workspace request sends the exact source without consuming the current composer draft or annotations", async t => {
  const { controller, sent, references } = fixture(t);
  await controller.requestAgent("Generate Prompts for this Script.", [source], "selected");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].value.content[0].text, "Generate Prompts for this Script.");
  assert.deepEqual(sent[0].value.content.map(p => p.type), ["text"]);
  assert.deepEqual(sent[0].value.attachments, [source]);
  assert.equal(controller.composer.value, "Unsent draft");
  assert.deepEqual(controller.attached, [source]);
  assert.equal(references.cleared, 0);
  assert.equal(controller.retry, undefined);
  assert.equal(controller.sending, false);
});

test("uncertain workspace send retries the identical request and retains the unrelated draft", async t => {
  let attempts = 0;
  const { controller, sent, references } = fixture(t, async () => { if (++attempts === 1) throw new Error("Connection interrupted"); });
  await controller.requestAgent("请生成视频提示词。", [source], "selected");
  assert.ok(controller.retry);
  await assert.rejects(controller.requestAgent("Another request", [], "selected"), /pending message/);
  await controller.send();
  assert.equal(sent.length, 2);
  assert.equal(sent[0].options.requestId, sent[1].options.requestId);
  assert.deepEqual(sent[0].value, sent[1].value);
  assert.equal(controller.composer.value, "Unsent draft");
  assert.equal(references.cleared, 0);
  assert.equal(controller.retry, undefined);
});

test("stale-session, busy, offline and unconfirmed-annotation requests never reach the Agent", async t => {
  const { controller, sent } = fixture(t);
  await assert.rejects(controller.requestAgent("Work", [source], "another-session"), /conversation again/);
  for (const status of ["running", "loading", "error", "offline", "waiting_for_response"]) {
    controller.status = status;
    await assert.rejects(controller.requestAgent("Work", [source], "selected"), /Agent is ready/);
  }
  controller.status = "idle";
  controller.messageReferences.hasPendingAnnotation = () => true;
  await assert.rejects(controller.requestAgent("Work", [source], "selected"), /annotation/);
  assert.equal(sent.length, 0);
});

test("rapid duplicate clicks cannot create concurrent requests", async t => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const { controller, sent } = fixture(t, () => pending);
  const first = controller.requestAgent("Work", [source], "selected");
  await assert.rejects(controller.requestAgent("Work", [source], "selected"), /pending message/);
  finish(); await first;
  assert.equal(sent.length, 1);
});

test("normal composer send still clears its own draft and annotations", async t => {
  const { controller, sent, references } = fixture(t);
  await controller.send();
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].value.content.map(p => p.type), ["quote", "text"]);
  assert.equal(controller.composer.value, "");
  assert.equal(controller.attached.length, 0);
  assert.equal(references.cleared, 1);
});
