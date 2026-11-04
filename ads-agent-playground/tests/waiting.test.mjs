import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "playground-waiting-"));
after(() => rm(directory, { recursive: true, force: true }));
await build({
  stdin: {
    contents: "export * from './src/waiting.ts';export {setLocale} from './src/i18n.ts';",
    resolveDir: new URL("..", import.meta.url).pathname,
    loader: "ts",
  },
  outfile: join(directory, "waiting.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
});
const { WaitingBar, setLocale } = await import(pathToFileURL(join(directory, "waiting.mjs")).href);

function element() {
  return {
    hidden: false,
    disabled: false,
    textContent: "",
    title: "",
    children: [],
    replaceChildren(...children) {
      this.children = children;
    },
  };
}
const job = (id, label, status) => ({ record: { ref: { kind: "job", id }, label }, status });
function fixture(t) {
  const previous = globalThis.document;
  globalThis.document = { createElement: () => element(), documentElement: { lang: "" }, querySelectorAll: () => [] };
  t.after(() => (globalThis.document = previous));
  const elements = { bar: element(), text: element(), jobs: element(), stop: element() };
  const opened = [],
    stops = [];
  let release;
  const now = Date.parse("2026-11-03T12:00:00Z");
  const bar = new WaitingBar(elements, {
    open: (record) => opened.push(record),
    stop: () => {
      stops.push(true);
      return new Promise((resolve) => (release = resolve));
    },
    now: () => now,
  });
  t.after(() => bar.dispose());
  return { bar, elements, opened, stops, now, release: () => release() };
}

test("the bar shows the renders, their usual time and a chip per Job, and goes when waiting ends", (t) => {
  const { bar, elements, opened, now } = fixture(t);
  setLocale("en", false);
  bar.update(undefined);
  assert.equal(elements.bar.hidden, true);
  bar.update({
    jobs: [job("j3", "Clip 03", "running"), job("j4", "Clip 04", "queued")],
    estimated_done_at: new Date(now + 4 * 60000 - 1000).toISOString(),
  });
  assert.equal(elements.bar.hidden, false);
  assert.equal(elements.text.textContent, "Waiting for 2 renders · usually about 4 min · The Agent continues when they finish");
  assert.deepEqual(
    elements.jobs.children.map((chip) => chip.textContent),
    ["Clip 03 · rendering", "Clip 04 · queued"],
  );
  elements.jobs.children[1].onclick();
  assert.deepEqual(opened, [{ ref: { kind: "job", id: "j4" }, label: "Clip 04" }]);
  // Without enough history there is no estimate; one render reads in the singular.
  bar.update({ jobs: [job("j3", "Clip 03", "queued")] });
  assert.equal(elements.text.textContent, "Waiting for 1 render · The Agent continues when it finishes");
  bar.update(undefined);
  assert.equal(elements.bar.hidden, true);
  assert.deepEqual(elements.jobs.children, []);
});

test("Stop waiting calls the Session's Stop and is disabled until it answers", async (t) => {
  const { bar, elements, stops, release } = fixture(t);
  setLocale("en", false);
  bar.update({ jobs: [job("j3", "Clip 03", "queued")] });
  assert.equal(elements.stop.textContent, "Stop waiting");
  elements.stop.onclick();
  assert.equal(stops.length, 1);
  assert.equal(elements.stop.disabled, true);
  release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(elements.stop.disabled, false);
});

test("the bar is translated, and says when renders take longer than usual", (t) => {
  const { bar, elements, now } = fixture(t);
  setLocale("zh-CN", false);
  bar.update({ jobs: [job("j3", "Clip 03", "running"), job("j4", "Clip 04", "queued")], estimated_done_at: new Date(now - 1000).toISOString() });
  assert.equal(elements.text.textContent, "正在等待 2 个渲染 · 比平时久一些 · 全部完成后 Agent 会自动继续");
  assert.deepEqual(
    elements.jobs.children.map((chip) => chip.textContent),
    ["Clip 03 · 渲染中", "Clip 04 · 排队中"],
  );
  assert.equal(elements.stop.textContent, "停止等待");
});
