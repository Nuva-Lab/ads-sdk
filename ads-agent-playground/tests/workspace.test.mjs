import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const directory = await mkdtemp(join(tmpdir(), "playground-behavior-"));
after(() => rm(directory, { recursive: true, force: true }));
for (const name of ["workspace", "resources"])
  await build({
    entryPoints: [new URL(`../src/${name}.ts`, import.meta.url).pathname],
    outfile: join(directory, `${name}.mjs`),
    bundle: true,
    format: "esm",
    platform: "node",
  });
const {
  productFields,
  productChanges,
  newProductData,
  mergeResources,
  resourcesForSession,
  resourcesForTab,
} = await import(pathToFileURL(join(directory, "workspace.mjs")));
const { keyed } = await import(pathToFileURL(join(directory, "resources.mjs")));
test("editing a product sends only the fields the form changed", () => {
  const product = {
    id: "p",
    version: 7,
    data: {
      name: "Original",
      image_asset_ids: ["image"],
      target_audience: "Commuters",
      facts: ["350 ml"],
      attributes: { nested: { quantity: 0 } },
    },
  };
  const fields = productFields(product);
  assert.deepEqual(productChanges(product, fields), {}, "An untouched form changes nothing.");
  fields.name = "  Edited ";
  fields.target_audience = " ";
  fields.facts = "350 ml\nDishwasher safe";
  assert.deepEqual(productChanges(product, fields), {
    name: "Edited",
    target_audience: null,
    facts: ["350 ml", "Dishwasher safe"],
  });
  assert.equal(product.data.name, "Original");
  fields.name = " ";
  assert.throws(() => productChanges(product, fields), /name is required/);
});
test("a new product sends every field, with no images yet", () => {
  const fields = productFields();
  fields.name = "Cup";
  fields.selling_points = "Warm all day";
  assert.deepEqual(newProductData(fields), {
    name: "Cup",
    image_asset_ids: [],
    facts: [],
    selling_points: ["Warm all day"],
    constraints: [],
    target_audience: null,
    attributes: {},
  });
});
test("resource navigation preserves other conversations and exact reference identities", () => {
  const record = {
    ref: { kind: "script", id: "script-version" },
    label: "Saved script",
  };
  const all = mergeResources(
    [],
    [
      { ...record, sessionId: "one" },
      { ...record, sessionId: "two" },
    ],
  );
  assert.equal(all.length, 2);
  assert.deepEqual(resourcesForSession(all, "two"), [
    { ...record, sessionId: "two" },
  ]);
});
test("a lost response keeps the original operation key and refuses changed input", async () => {
  const saved = new Map(),
    prior = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => saved.get(k) ?? null,
    setItem: (k, v) => saved.set(k, v),
    removeItem: (k) => saved.delete(k),
  };
  try {
    const host = { scope: "fixture-user", sessionId: "session" },
      input = { script: "s1" };
    let original;
    await assert.rejects(
      keyed(host, "prompts", input, async (key) => {
        original = key;
        throw new Error("lost response");
      }),
    );
    await assert.rejects(
      keyed(host, "prompts", { script: "s2" }, async () =>
        assert.fail("Changed input must not dispatch."),
      ),
      /unresolved/,
    );
    assert.equal(
      await keyed(host, "prompts", input, async (key) => {
        assert.equal(key, original);
        return "saved";
      }),
      "saved",
    );
    assert.equal(saved.size, 0);
  } finally {
    if (prior === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prior;
  }
});

test("gallery tabs keep clip and input Assets out of Finals and deduplicate registered final videos", () => {
  const records = [
    { ref: { kind: "script", id: "script" }, label: "Script", sessionId: "s" },
    { ref: { kind: "storyboard", id: "storyboard" }, label: "Storyboard", sessionId: "s" },
    { ref: { kind: "job", id: "job" }, label: "Clip", sessionId: "s" },
    {
      ref: { kind: "asset", id: "input" },
      label: "Reference image",
      sessionId: "s",
    },
    {
      ref: { kind: "asset", id: "clip" },
      label: "Generated clip",
      purpose: "clip",
      sessionId: "s",
    },
    {
      ref: { kind: "asset", id: "final" },
      label: "Final",
      purpose: "final",
      sessionId: "s",
    },
    {
      ref: { kind: "ad", id: "ad" },
      label: "Final ad",
      finalAssetId: "final",
      sessionId: "s",
    },
  ];
  assert.deepEqual(
    resourcesForTab(records, "script").map((r) => r.ref.id),
    ["script"],
  );
  assert.deepEqual(
    resourcesForTab(records, "job").map((r) => r.ref.id),
    ["job"],
  );
  assert.deepEqual(
    resourcesForTab(records, "storyboard").map((r) => r.ref.id),
    ["storyboard"],
  );
  assert.deepEqual(
    resourcesForTab(records, "asset").map((r) => r.ref.id),
    ["ad"],
  );
  const [refreshed] = mergeResources(
    [records[4]],
    [{ ref: records[4].ref, label: "Clip", sessionId: "s" }],
  );
  assert.equal(refreshed.purpose, "clip");
});
