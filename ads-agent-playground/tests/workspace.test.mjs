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
const { productFields, productData, mergeResources, resourcesForSession } =
  await import(pathToFileURL(join(directory, "workspace.mjs")));
const { keyed } = await import(pathToFileURL(join(directory, "resources.mjs")));
test("editing a product preserves its captured optional data and version base", () => {
  const product = {
    id: "p",
    version: 7,
    revision: "revision-7",
    data: {
      name: "Original",
      images: ["image"],
      target_audience: null,
      attributes: { nested: { quantity: 0 } },
    },
  };
  const fields = productFields(product);
  fields.name = "Edited";
  assert.deepEqual(productData(product, fields), {
    ...product.data,
    name: "Edited",
  });
  assert.equal(product.data.name, "Original");
  assert.equal(Object.hasOwn(productData(product, fields), "facts"), false);
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
