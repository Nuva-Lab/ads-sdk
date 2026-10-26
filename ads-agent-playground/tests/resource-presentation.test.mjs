import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(join(tmpdir(), "chat-previews-"));
after(() => rm(dir, { recursive: true, force: true }));
await build({
  entryPoints: [
    new URL("../src/resource-presentation.ts", import.meta.url).pathname,
  ],
  outfile: join(dir, "preview.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
});
const { resourcePresentation } = await import(
  pathToFileURL(join(dir, "preview.mjs"))
);
const id = "11111111-1111-4111-8111-111111111111";
const ref = (kind) => ({ ref: { kind, id }, label: `${kind} ${id}` });
test("Script and Batch previews use saved names and meaningful counts", () => {
  const script = resourcePresentation(ref("script"), {
    content: {
      concept: {
        name: "Quiet mornings",
        proposition: "A warm coffee on the commute.",
      },
      clips: [{ duration_ms: 5000 }, { duration_ms: 7000 }],
    },
  });
  assert.equal(script.title, "Quiet mornings");
  assert.equal(script.meta, "2 clips · 12 sec");
  assert.ok(!JSON.stringify(script).includes(id));
  const batch = resourcePresentation(ref("batch"), {
    intent: "Morning launch",
    ads: [{ id: "a" }],
    jobs: { queued: 2, completed: 1 },
  });
  assert.equal(batch.title, "Morning launch");
  assert.equal(batch.meta, "1 ad · 3 video jobs");
});
test("Prompt, image, and Job previews show content appropriate to their kind", () => {
  const prompt = resourcePresentation(ref("prompt"), {
    data: {
      prompt: "A cup on the kitchen counter.",
      seconds: 5,
      ratio: "9:16",
    },
  });
  assert.equal(prompt.title, "Video prompt");
  assert.equal(prompt.summary, "A cup on the kitchen counter.");
  assert.equal(prompt.meta, "5 sec · 9:16");
  const image = resourcePresentation(ref("asset"), {
    kind: "image",
    download_url: "https://media.example/image.jpg",
    metadata: { width: 400, height: 600 },
  });
  assert.equal(image.kind, "Image");
  assert.equal(image.image, "https://media.example/image.jpg");
  assert.equal(image.meta, "400 × 600");
  const job = resourcePresentation(ref("job"), {
    status: "completed",
    asset: { metadata: { duration_ms: 6000 } },
    resolution: "768P",
  });
  assert.equal(job.title, "Generated clip");
  assert.equal(job.meta, "Ready · 6 sec · 768P");
});
test("Unavailable metadata never turns a raw ID into a display title or unsafe thumbnail", () => {
  assert.equal(resourcePresentation(ref("script")).title, "Script");
  const image = resourcePresentation(ref("asset"), {
    kind: "image",
    download_url: "javascript:alert(1)",
    metadata: {},
  });
  assert.equal(image.image, undefined);
  assert.equal(
    resourcePresentation({
      ref: { kind: "product", id },
      label: "Saved coffee jar",
    }).title,
    "Saved coffee jar",
  );
});
