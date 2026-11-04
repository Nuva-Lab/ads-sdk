import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "playground-queue-"));
after(() => rm(directory, { recursive: true, force: true }));
await build({
  stdin: {
    contents: "export * from './src/queue.ts';export {setLocale} from './src/i18n.ts';",
    resolveDir: new URL("..", import.meta.url).pathname,
    loader: "ts",
  },
  outfile: join(directory, "queue.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
});
const { QueueList, queuedPreview, editableParts, setLocale } = await import(pathToFileURL(join(directory, "queue.mjs")).href);

function element(tag = "") {
  return {
    tag,
    hidden: false,
    disabled: false,
    textContent: "",
    title: "",
    className: "",
    dataset: {},
    attributes: {},
    children: [],
    classList: { add() {} },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    },
  };
}
const text = (value) => ({ id: crypto.randomUUID(), type: "text", format: "plain", text: value });
const queued = (id, content, { error, attachments = [], replyTo } = {}) => ({
  message: {
    ref: { sessionId: "s", messageId: id },
    role: "user",
    metadata: { user: { userId: "u" } },
    createdAt: "2026-11-04T00:00:00Z",
    content,
    attachments,
    ...(replyTo ? { replyTo } : {}),
    state: "complete",
  },
  ...(error ? { error } : {}),
});
function fixture(t, { canEdit = true } = {}) {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: (tag) => element(tag),
    createElementNS: (_namespace, tag) => element(tag),
    createTextNode: (value) => ({ textContent: value }),
    documentElement: { lang: "" },
    querySelectorAll: () => [],
  };
  t.after(() => (globalThis.document = previous));
  const root = element("ul");
  const calls = [];
  let release;
  const pending = (kind) => (entry) => {
    calls.push([kind, entry.message.ref.messageId]);
    return new Promise((resolve) => (release = resolve));
  };
  const list = new QueueList(root, { edit: pending("edit"), remove: pending("remove"), canEdit: () => canEdit });
  t.after(() => list.dispose());
  return { list, root, calls, release: () => release() };
}
const rows = (root) => root.children;
const buttons = (row) => row.children.find((child) => child.className === "queued-actions").children;
const label = (button) => button.attributes["aria-label"];

test("each queued message is one line with Edit and Remove; the list is hidden when nothing waits", (t) => {
  setLocale("en", false);
  const { list, root } = fixture(t);
  list.update(undefined);
  assert.equal(root.hidden, true);
  list.update([queued("a", [text("Make it blue")]), queued("b", [text("Shorter")])]);
  assert.equal(root.hidden, false);
  const [first, second] = rows(root);
  assert.equal(first.dataset.state, "queued");
  assert.equal(first.children.find((child) => child.className === "queued-status").textContent, "Queued");
  assert.deepEqual(buttons(first).map(label), ["Edit", "Remove"]);
  assert.equal(first.children.find((child) => child.className === "queued-text").textContent, "Make it blue");
  assert.equal(second.children.find((child) => child.className === "queued-text").textContent, "Shorter");
  list.update([]);
  assert.equal(root.hidden, true);
});

test("an action locks its message's buttons until it settles; a message that could not be sent says why", async (t) => {
  setLocale("en", false);
  const { list, root, calls, release } = fixture(t);
  list.update([queued("a", [text("one")]), queued("b", [text("two")], { error: { code: "NOT_FOUND", message: "The attachment is gone.", retryable: false } })]);
  buttons(rows(root)[0])[1].onclick();
  assert.deepEqual(calls, [["remove", "a"]]);
  assert.ok(buttons(rows(root)[0]).every((button) => button.disabled), "No second action while the first is in flight.");
  buttons(rows(root)[0])[0].onclick();
  assert.equal(calls.length, 1);
  release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(buttons(rows(root)[0]).every((button) => !button.disabled));
  const failed = rows(root)[1];
  assert.equal(failed.dataset.state, "failed");
  assert.deepEqual(buttons(failed).map(label), ["Edit", "Remove"]);
  assert.equal(failed.children.at(-1).textContent, "The attachment is gone.");
});

test("Edit waits for an empty composer; view-only Sessions get no actions", (t) => {
  setLocale("en", false);
  const { list, root } = fixture(t, { canEdit: false });
  list.update([queued("a", [text("one")])]);
  const [edit, remove] = buttons(rows(root)[0]);
  assert.equal(edit.disabled, true);
  assert.equal(remove.disabled, false);
  list.update([queued("a", [text("one")])], false);
  assert.ok(buttons(rows(root)[0]).every((button) => button.disabled));
});

test("the preview and the editable parts keep text, @ references, quotes, the reply and attachments", () => {
  setLocale("en", false);
  const product = { ref: { kind: "product", id: "p1" }, label: "Lip tint" };
  const earlier = { sessionId: "s", messageId: "m1" };
  const message = queued(
    "a",
    [text("Use "), { id: "q", type: "quote", target: product }, text("\n and"), { id: "m", type: "quote", target: earlier, text: "the hook" }, text("this line")],
    { attachments: [product], replyTo: earlier },
  ).message;
  assert.equal(queuedPreview(message), "Use @Lip tint and“…”this line · 1 attachment");
  assert.deepEqual(editableParts(message), {
    parts: [
      { type: "text", text: "Use " },
      { type: "quote", record: product },
      { type: "text", text: "\n and" },
      { type: "text", text: "this line" },
    ],
    quotes: [{ ref: earlier, text: "the hook" }],
    replyTo: earlier,
    attachments: [product],
  });
});
