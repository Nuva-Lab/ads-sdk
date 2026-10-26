import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(join(tmpdir(), "prompt-view-"));
after(() => rm(dir, { recursive: true, force: true }));
for (const name of ["prompt-view", "ui"])
  await build({
    entryPoints: [new URL(`../src/${name}.ts`, import.meta.url).pathname],
    outfile: join(dir, `${name}.mjs`),
    bundle: true,
    format: "esm",
    platform: "node",
  });
const {
  promptReferences,
  promptSections,
  promptTokens,
  subjectReferences,
  jobSettings,
} = await import(pathToFileURL(join(dir, "prompt-view.mjs")));
const { setViewRefresh, refreshActiveView } = await import(
  pathToFileURL(join(dir, "ui.mjs"))
);
const prompt = {
  data: {
    image_asset_ids: ["a", "b"],
    video_asset_ids: ["v"],
    audio_asset_ids: ["s"],
  },
  assets: Object.fromEntries(
    [
      ["a", "image"],
      ["b", "image"],
      ["v", "video"],
      ["s", "audio"],
    ].map(([id, kind]) => [
      id,
      { id, kind, download_url: `https://fixture.invalid/${id}` },
    ]),
  ),
};
test("reference chips keep one-based positions for each media array", () => {
  const refs = promptReferences(prompt);
  assert.deepEqual(
    refs.map((r) => [r.key, r.assetId, r.label]),
    [
      ["image:1", "a", "Image 1"],
      ["image:2", "b", "Image 2"],
      ["video:1", "v", "Video 1"],
      ["audio:1", "s", "Audio 1"],
    ],
  );
  assert.equal(new Set(refs.map((r) => r.color)).size, 4);
});
test("Subject references require an explicit unambiguous definition", () => {
  const text =
    "subject_definitions:\n<Subject 7> is the jar in <Picture 2>.\n<Subject 8> is between <Picture 1> and <Video 1>.\n\nsummary:\n<Subject 9> is beside <Picture 1>.";
  const subjects = subjectReferences(text, promptReferences(prompt));
  assert.equal(subjects.get(7).assetId, "b");
  assert.equal(subjects.has(8), false);
  assert.equal(subjects.has(9), false);
});
test("unavailable sidecars do not renumber inputs or substitute another asset", () => {
  const refs = promptReferences({ ...prompt, assets: { a: prompt.assets.a } });
  assert.equal(refs[1].index, 2);
  assert.equal(refs[1].asset, undefined);
  assert.equal(refs[1].assetId, "b");
  const wrong = promptReferences({
    ...prompt,
    assets: { ...prompt.assets, a: prompt.assets.v },
  });
  assert.equal(wrong[0].asset, undefined);
});
test("tokenization preserves the exact source and leaves unknown markup as text", () => {
  const text =
    "Use <Picture 2>, <Video 1> and <Audio 1>. [Shot 3] <Subject 7> <script>alert(1)</script>";
  const tokens = promptTokens(text);
  assert.equal(tokens.map((t) => t.raw).join(""), text);
  assert.ok(
    tokens.some((t) => t.kind === "text" && t.raw.includes("<script>")),
  );
  assert.equal(
    promptSections("Freeform prompt: untouched")[0].body,
    "Freeform prompt: untouched",
  );
});
test("generation settings show saved zero seeds and do not invent model metadata", () => {
  assert.deepEqual(
    jobSettings({
      checkpoint: null,
      seed: 0,
      resolution: null,
      status: "queued",
    }),
    [
      ["Model", "Not recorded"],
      ["Resolution", "Default"],
      ["Seed", "0"],
      ["Status", "queued"],
    ],
  );
});
test("global refresh uses the active detail handler, not a hidden prior view", async () => {
  let hidden = 0,
    shown = 0;
  const previous = { dataset: {}, isConnected: true, getClientRects: () => [] };
  const active = { dataset: {}, isConnected: true, getClientRects: () => [{}] };
  setViewRefresh(previous, async () => hidden++);
  setViewRefresh(active, async () => shown++);
  assert.equal(
    await refreshActiveView({ querySelectorAll: () => [previous, active] }),
    true,
  );
  assert.equal(hidden, 0);
  assert.equal(shown, 1);
  assert.equal(await refreshActiveView({ querySelectorAll: () => [] }), false);
});
