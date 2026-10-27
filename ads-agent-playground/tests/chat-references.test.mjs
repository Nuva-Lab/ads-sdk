import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const directory = await mkdtemp(join(tmpdir(), "chat-references-"));
after(() => rm(directory, { recursive: true, force: true }));
await build({
  stdin: {
    contents: `export {MessageReferenceDraft} from './src/chat-references.ts'; export {buildDraft} from './src/composer.ts'; export {draftValue} from '../typescript/dist/message.js';`,
    resolveDir: new URL("..", import.meta.url).pathname,
    loader: "ts",
  },
  outfile: join(directory, "references.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
});
const { MessageReferenceDraft, buildDraft, draftValue } = await import(
  pathToFileURL(join(directory, "references.mjs"))
);
const message = (id, session = "session") => ({
  ref: { sessionId: session, messageId: id },
  role: "assistant",
  state: "complete",
  createdAt: "2026-10-26T00:00:00Z",
  content: [
    { type: "text", id: "text", text: "A saved response", format: "markdown" },
  ],
  attachments: [],
});
test("reply and selected quote use SDK references with verbatim Unicode text before the draft", () => {
  const references = new MessageReferenceDraft("session");
  const original = message("original"),
    selected = "保留产品名称 **Morrow**\n  `shot timing` — ☕";
  references.setReply(original);
  references.addQuote(original, selected);
  const sent = draftValue(
    buildDraft([{ type: "text", text: "Explain this." }], references.build()),
  );
  assert.deepEqual(sent.replyTo, original.ref);
  assert.deepEqual(
    sent.content.map((part) => part.type),
    ["quote", "text"],
  );
  assert.deepEqual(sent.content[0].target, original.ref);
  assert.equal(sent.content[0].text, selected);
  assert.equal(sent.content[1].text, "Explain this.");
  assert.deepEqual(sent.attachments, []);
});
test("draft reference edits cannot change a frozen retry or follow mutations of the source ID", () => {
  const references = new MessageReferenceDraft("session"),
    original = message("original");
  references.setReply(original);
  references.addQuote(original, "quoted text");
  original.ref.messageId = "changed";
  const request = references.build(),
    saved = draftValue(request);
  references.reply = undefined;
  references.quotes = [];
  assert.equal(saved.replyTo.messageId, "original");
  assert.equal(saved.content[0].target.messageId, "original");
  assert.deepEqual(draftValue(request), saved);
});
test("separate excerpts preserve their source while duplicates and whitespace add no extra context", () => {
  const references = new MessageReferenceDraft("session");
  references.addQuote(message("one"), "first");
  references.addQuote(message("one"), "first");
  references.addQuote(message("one"), "second");
  references.addQuote(message("two"), "first");
  references.addQuote(message("two"), " \n ");
  const parts = draftValue(references.build()).content;
  assert.deepEqual(
    parts.map((part) => [part.target.messageId, part.text]),
    [
      ["one", "first"],
      ["one", "second"],
      ["two", "first"],
    ],
  );
  assert.throws(
    () => references.setReply(message("one", "another-session")),
    /current conversation/,
  );
  assert.throws(
    () => references.addQuote(message("one", "another-session"), "text"),
    /current conversation/,
  );
});

test("each annotation comment stays beside its own quote and frozen requests retain the original comment", () => {
  const references = new MessageReferenceDraft("session");
  references.addQuote(message("first"), "First selected passage");
  references.addQuote(message("second"), "Second selected passage");
  references.quotes[0].comment = "请缩短这一段。";
  references.quotes[1].comment = "Keep the product name.\nUse a calmer tone.";
  const request = buildDraft(
    [{ type: "text", text: "Apply both changes." }],
    references.build(),
  );
  const sent = draftValue(request);
  assert.deepEqual(
    sent.content.map((part) => part.type),
    ["quote", "text", "quote", "text", "text"],
  );
  assert.equal(sent.content[0].target.messageId, "first");
  assert.equal(sent.content[1].text, "请缩短这一段。");
  assert.equal(sent.content[2].target.messageId, "second");
  assert.equal(
    sent.content[3].text,
    "Keep the product name.\nUse a calmer tone.",
  );
  assert.equal(sent.content[4].text, "Apply both changes.");
  references.quotes[0].comment = "A later edit";
  assert.equal(draftValue(request).content[1].text, "请缩短这一段。");
});

test("user messages cannot become reply or annotation targets in the playground", () => {
  const references = new MessageReferenceDraft("session");
  const ownMessage = { ...message("user-message"), role: "user", metadata: { user: { userId: "user", displayName: "Alex" } } };
  assert.throws(() => references.setReply(ownMessage), /Only Ads Agent messages/);
  assert.throws(() => references.addQuote(ownMessage, "Selected text", "A comment"), /Only Ads Agent messages/);
  assert.deepEqual(draftValue(references.build()), { content: [], attachments: [] });
});

test("confirmed annotations preserve distinct comments on the same passage", () => {
  const references = new MessageReferenceDraft("session"), source = message("agent-message");
  references.addQuote(source, "Selected passage", "First comment");
  references.addQuote(source, "Selected passage", "First comment");
  references.addQuote(source, "Selected passage", "Second comment");
  const parts = draftValue(references.build()).content;
  assert.equal(references.quotes.length, 2);
  assert.deepEqual(parts.map(part => part.type), ["quote", "text", "quote", "text"]);
  assert.equal(parts[1].text, "First comment");
  assert.equal(parts[3].text, "Second comment");
});
