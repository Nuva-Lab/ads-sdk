import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { browser, bundle, fakeSdk, ids, leo, mia, script, scriptContent, storyboardContent } from "./storyboard-fixture.mjs";

const built = await bundle(
  "playground-storyboard-",
  `export * from './src/storyboard.ts';
   export { loadMaterial, castEntry, castChoice, placeIssue, insertToken } from './src/storyboard-model.ts';
   export { openResource } from './src/resources.ts';
   export { setLocale } from './src/i18n.ts';`,
);
after(built.cleanup);
const {
  renderScriptContent,
  renderStoryboardContent,
  storyboardEditor,
  loadMaterial,
  castEntry,
  openResource,
  setLocale,
} = built.module;
let env;
before(() => {
  env = browser();
  setLocale("en", false);
});
after(() => env.restore());
const fresh = () => {
  env.root.replaceChildren();
  return env.root;
};
const texts = (root, selector) => [...root.querySelectorAll(selector)].map((element) => element.textContent.trim());
const material = () => loadMaterial(fakeSdk(), script, [ids.mia]);
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a v3 Script shows its concept, length, roles and panels with each line's ID, speaker and mode", () => {
  const card = fresh();
  renderScriptContent(card, scriptContent);
  assert.match(card.querySelector(".script-proposition").textContent, /still warm at your noon meeting/);
  assert.ok(texts(card, ".config-pill").includes("Length10s"));
  assert.deepEqual(texts(card, ".script-role strong"), ["Host", "Friend"]);
  assert.deepEqual(texts(card, ".script-role .badge"), ["Speaks", "Silent"]);
  const panel = card.querySelector('[data-panel="P01"]');
  assert.deepEqual(texts(panel, ".on-screen-chip"), ["Host", "Friend", "Product"]);
  assert.deepEqual(texts(panel, ".line-id"), ["L01", "L02"]);
  assert.deepEqual(texts(panel, ".script-line-meta strong"), ["Host", "Narrator"]);
  assert.deepEqual(texts(panel, ".script-line-meta .badge"), ["On camera", "Voiceover"]);
  assert.deepEqual(texts(panel, ".script-line-text"), ["“Still warm at noon.”", "“Morrow. Warm all day.”"]);
  assert.match(panel.querySelector(".script-notes").textContent, /Show the logo on the lid/);
});

test("a v3 Script offers New Storyboard; a v2 Script is labelled legacy and read-only", async () => {
  const host = (value) => ({
    sdk: { scripts: { get: async () => value } },
    scope: "storyboard-test",
    sessionId: "session",
    records: [],
    remember() {},
    attach() {},
    requestAgent: async () => {},
  });
  const record = { ref: { kind: "script", id: ids.script }, label: "Script" };
  let root = fresh();
  await openResource(root, record, host(script));
  assert.ok(texts(root, ".resource-actions button").includes("New Storyboard"));
  assert.equal(root.querySelector(".legacy-badge"), null);

  const legacy = {
    ...script,
    format: 2,
    content: undefined,
    legacy: {
      concept: { name: "Old idea", proposition: "An older Script.", route: "Talking head" },
      clips: [{ id: "C01", duration_ms: 6000, shots: [{ id: "B01-S01", start_ms: 0, end_ms: 6000, scene: "Kitchen", action: "Pours coffee", camera: "Wide", speech: [{ text: "Hello." }] }] }],
    },
  };
  root = fresh();
  await openResource(root, record, host(legacy));
  assert.equal(root.querySelector(".legacy-badge").textContent, "Legacy Script (read-only)");
  assert.ok(!texts(root, ".resource-actions button").includes("New Storyboard"));
  assert.match(root.querySelector(".clip").textContent, /Pours coffee/);
});

test("a Storyboard's shots show people, images, the Product and lines as chips, with the clip's references", async () => {
  const root = fresh();
  renderStoryboardContent(root, storyboardContent, await material());
  const [first, second] = root.querySelectorAll('[data-clip="C01"] .storyboard-shots li');
  const chips = (shot) => [...shot.querySelectorAll("[data-token-kind]")].map((chip) => [chip.dataset.tokenKind, chip.textContent.trim()]);
  assert.deepEqual(chips(first), [
    ["image", "Mia · Side"],
    ["image", "Back of the box"],
    ["line", "L01Still warm at noon.Host"],
  ]);
  assert.equal(first.querySelector('[data-token-kind="image"] img').src, `https://media.playground.test/${ids.miaSide}`);
  assert.equal(first.querySelector('[data-token-kind="image"]').title, `{{host:${ids.miaSide}}}`);
  assert.deepEqual(chips(second), [
    ["person", "Friend"],
    ["line", "L02Morrow. Warm all day.Narrator"],
  ]);
  assert.ok(second.querySelector('[data-token-kind="person"]').classList.contains("token-described"));
  // The direction's {{product}} is the Product with its default (first) image.
  const product = root.querySelector('.storyboard-direction [data-token-kind="product"]');
  assert.equal(product.textContent.trim(), "Morrow Cup");
  assert.equal(product.querySelector("img").src, `https://media.playground.test/${ids.productFront}`);
  // Cast: who plays each role, and the voice.
  const cast = Object.fromEntries([...root.querySelectorAll(".cast-row")].map((row) => [row.dataset.role, row.textContent]));
  assert.match(cast.host, /Mia/);
  assert.match(cast.host, /Character voice/);
  assert.match(cast.friend, /A tall man in a grey coat/);
  assert.match(cast.friend, /Does not speak/);
  assert.match(cast.narrator, /A warm, low female voice/);
  assert.deepEqual(texts(root, '[data-clip="C01"] .storyboard-references .reference-chip'), ["Mia · Side", "Back of the box", "Mia's voice"]);
});

function editor(root, materialValue, save = async () => {}) {
  return storyboardEditor(root, { content: storyboardContent, material: materialValue, characters: [mia, leo], save, cancel() {} });
}
function type(element, value) {
  element.value = value;
  element.dispatchEvent(new env.window.Event("input"));
}
function choose(select, value) {
  select.value = value;
  select.dispatchEvent(new env.window.Event("change"));
}
const issuesAt = (root, where) => texts(root, `.storyboard-issues[data-where="${where}"] li`);

test("edit mode checks every change and shows each problem beside the clip or shot it names", async () => {
  const root = fresh();
  const handle = editor(root, await material());
  const save = [...root.querySelectorAll("button")].find((button) => button.textContent.includes("Save Storyboard"));
  assert.deepEqual(handle.issues(), []);
  assert.equal(save.disabled, false);
  assert.equal(root.querySelector(".storyboard-issue-summary").textContent, "No issues. Ready to save.");

  const first = root.querySelector('textarea[name="shot-C01-1"]');
  type(first, `Close on {{host:${ids.miaSide}}} lifting {{product}}.`);
  assert.deepEqual(issuesAt(root, "clips"), ["Line L01 is not placed in any shot."]);
  assert.equal(save.disabled, true);
  assert.match(root.querySelector(".storyboard-issue-summary").textContent, /1 issue to fix/);

  // The Insert menu writes the token at the cursor.
  first.setSelectionRange(first.value.length, first.value.length);
  choose(root.querySelector('select[name="insert-C01-1"]'), "{{L01}}");
  assert.equal(first.value, `Close on {{host:${ids.miaSide}}} lifting {{product}}.{{L01}}`);
  assert.deepEqual(handle.issues(), []);

  type(root.querySelector('textarea[name="shot-C01-2"]'), "{{villain}} smiles. {{L02}}");
  assert.deepEqual(issuesAt(root, "C01 shot 2"), ["{{villain}}: villain is not a role of the Script."]);

  type(root.querySelector('input[name="duration-C01"]'), "20");
  assert.deepEqual(issuesAt(root, "C01"), ["A clip is 5–15 seconds long, in whole milliseconds."]);
  assert.ok(issuesAt(root, "clips").some((issue) => issue.startsWith("The clips add up to 20000 ms")));
});

test("the cast selector writes the Character, look and voice each role's entry needs", async () => {
  const root = fresh();
  const handle = editor(root, await material());
  const select = (role) => root.querySelector(`select[name="cast-${role}"]`);
  // A Character without a voice file: its voice must be described.
  choose(select("host"), ids.leo);
  assert.deepEqual(handle.content().cast.host, { character: ids.leo });
  assert.deepEqual(issuesAt(root, "cast.host"), ["host speaks and needs a voice."]);
  assert.ok(issuesAt(root, "C01 shot 1").some((issue) => issue.includes("that image is not one of host's Character's")));
  type(root.querySelector('input[name="voice-host"]'), "Bright young voice");
  assert.deepEqual(handle.content().cast.host, { character: ids.leo, voice: "Bright young voice" });
  // A Character with a voice file speaks with it.
  choose(select("host"), ids.mia);
  assert.deepEqual(handle.content().cast.host, { character: ids.mia, voice: "Bright young voice" });
  choose(root.querySelector('select[name="voice-mode-host"]'), "character");
  assert.deepEqual(handle.content().cast.host, { character: ids.mia, voice: "character" });
  // A silent role takes a Character and no voice; a described person keeps a look.
  choose(select("friend"), ids.leo);
  assert.deepEqual(handle.content().cast.friend, { character: ids.leo });
  choose(select("host"), "");
  type(root.querySelector('textarea[name="look-host"]'), "Short hair, grey sweater");
  assert.deepEqual(handle.content().cast.host, { look: "Short hair, grey sweater", voice: "Bright young voice" });
  assert.ok(issuesAt(root, "C01 shot 1").some((issue) => issue.includes("host has no Character, so there is no image to name")));
  assert.deepEqual(castEntry({ look: "", voice: "", characterVoice: true }, { speaks: true, narrator: true, characterHasVoice: false }), {});
});

test("save sends the edited Storyboard and shows the service's rejection beside the clip it names", async () => {
  const root = fresh();
  const sent = [];
  const handle = editor(root, await material(), async (content) => {
    sent.push(content);
    throw Object.assign(new Error("C01: The lines need 12 s at a natural pace; the clip is 10 s."), {
      code: "INVALID_INPUT",
      acceptance: "not_accepted",
      details: [{ path: "content.clips[0]", message: "Too much speech." }],
    });
  });
  type(root.querySelector('textarea[name="direction"]'), "Soft window light.");
  [...root.querySelectorAll("button")].find((button) => button.textContent.includes("Save Storyboard")).click();
  await settle();
  await settle();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].direction, "Soft window light.");
  assert.deepEqual(sent[0].clips.map((clip) => clip.id), ["C01"]);
  assert.match(root.querySelector(".storyboard-error").textContent, /INVALID_INPUT: C01: The lines need 12 s/);
  assert.match(root.querySelector(".storyboard-error").textContent, /content\.clips\[0\]: Too much speech\./);
  assert.deepEqual(issuesAt(root, "C01"), ["The lines need 12 s at a natural pace; the clip is 10 s."]);
  assert.equal(handle.issues().length, 1);
});

test("clips and shots can be added, reordered and removed, and stay numbered in order", async () => {
  const root = fresh();
  const handle = editor(root, await material());
  [...root.querySelectorAll("button")].find((button) => button.textContent.trim() === "Add clip").click();
  assert.deepEqual(handle.content().clips.map((clip) => [clip.id, clip.duration_ms, clip.shots]), [
    ["C01", 10000, storyboardContent.clips[0].shots],
    ["C02", 5000, [""]],
  ]);
  assert.deepEqual(issuesAt(root, "C02 shot 1"), ["Write the shot or remove it."]);
  root.querySelector('[data-clip="C02"] button[aria-label="Move clip up"]').click();
  assert.deepEqual(handle.content().clips.map((clip) => clip.shots.length), [1, 2]);
  root.querySelector('[data-clip="C01"] button[aria-label="Remove clip"]').click();
  assert.deepEqual(handle.content().clips.map((clip) => clip.id), ["C01"]);
  root.querySelector('[data-clip="C01"] .shot-edit button[aria-label="Move shot down"]').click();
  assert.deepEqual(handle.content().clips[0].shots, [...storyboardContent.clips[0].shots].reverse());
  assert.ok(issuesAt(root, "clips").some((issue) => issue.startsWith("Lines are placed in Script order")));
});
