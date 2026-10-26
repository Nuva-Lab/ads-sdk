import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "playground-language-"));
after(() => rm(directory, { recursive: true, force: true }));
await build({
  entryPoints: [new URL("../src/i18n.ts", import.meta.url).pathname],
  outfile: join(directory, "i18n.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
});
const { msg, resolveLabel, setLocale, translate } = await import(
  pathToFileURL(join(directory, "i18n.mjs"))
);

test("interface labels switch while identically spelled resource or Agent data stays verbatim", () => {
  const label = msg("Product"),
    resourceName = "Product";
  setLocale("zh-CN", false);
  assert.equal(resolveLabel(label), "产品");
  assert.equal(resolveLabel(resourceName), "Product");
  assert.equal(
    resolveLabel("Use <Picture 1> for the Morrow cup."),
    "Use <Picture 1> for the Morrow cup.",
  );
  setLocale("en", false);
  assert.equal(resolveLabel(label), "Product");
});

test("interpolation only translates explicitly marked UI labels, never source values", () => {
  setLocale("zh-CN", false);
  assert.equal(
    translate("Open {p0}: {p1}", { p0: msg("Product"), p1: "Product" }),
    "打开产品：Product",
  );
  assert.equal(
    resolveLabel(msg("{title}", { title: () => "中文 name <Picture 2>" })),
    "中文 name <Picture 2>",
  );
  setLocale("en", false);
});

test("a fresh browser defaults to Chinese and an explicit saved English preference survives initialization", async () => {
  const originalDocument = globalThis.document;
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.document = { documentElement: { lang: "" } };
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  try {
    const first = await import(
      pathToFileURL(join(directory, "i18n.mjs")) + "?first"
    );
    assert.equal(first.getLocale(), "zh-CN");
    first.setLocale("en");
    const restored = await import(
      pathToFileURL(join(directory, "i18n.mjs")) + "?restored"
    );
    assert.equal(restored.getLocale(), "en");
    assert.equal(globalThis.document.documentElement.lang, "en");
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});
