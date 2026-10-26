import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const directory = await mkdtemp(join(tmpdir(), "resource-index-"));
after(() => rm(directory, { recursive: true, force: true }));
await build({
  entryPoints: [new URL("../src/resource-index.ts", import.meta.url).pathname],
  outfile: join(directory, "index.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
});
const { ResourceIndex, indexedTitle, promptExcerpt } = await import(
  pathToFileURL(join(directory, "index.mjs"))
);
const ref = (kind, id) => ({ ref: { kind, id }, label: `${kind} ${id}` });
test("chat and gallery numbers stay stable across filtering, older history, and reload", () => {
  const values = new Map(),
    storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
  const index = new ResourceIndex("user", storage),
    one = ref("prompt", "p1"),
    two = ref("prompt", "p2");
  index.seed([
    { ...one, sessionId: "session" },
    { ...two, sessionId: "session" },
  ]);
  assert.equal(index.label("session", two), "Prompt 02");
  assert.equal(index.label("session", one), "Prompt 01");
  assert.equal(index.label("session", ref("prompt", "older")), "Prompt 03");
  const reloaded = new ResourceIndex("user", storage);
  assert.equal(reloaded.label("session", two), "Prompt 02");
  assert.equal(reloaded.label("other-session", two), "Prompt 01");
  assert.equal(reloaded.label("session", ref("job", "j1")), "Clip 01");
  assert.deepEqual(one, ref("prompt", "p1"));
});
test("generic titles become indexed while useful names are retained", () => {
  assert.equal(indexedTitle("prompt", "Prompt", "Prompt 02"), "Prompt 02");
  assert.equal(
    indexedTitle("script", "Read the jar", "Script 01"),
    "Read the jar",
  );
  assert.equal(indexedTitle("job", "Video generation", "Clip 02"), "Clip 02");
});
test("prompt list excerpts prefer the actual summary rather than repeated definitions", () => {
  const raw =
    "subject_definitions:\n<Subject 1> is the jar in <Picture 1>.\n\nsummary:\nA close look at the label.\nSecond sentence.\n\ndetailed_description:\nOther details.";
  assert.equal(
    promptExcerpt(raw),
    "A close look at the label. Second sentence.",
  );
  assert.equal(promptExcerpt("Freeform prompt text."), "Freeform prompt text.");
});
