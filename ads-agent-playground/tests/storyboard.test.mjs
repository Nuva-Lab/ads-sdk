import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { browser, bundle, fakeSdk, ids, leo, mia, script, scriptContent, storyboardContent } from "./storyboard-fixture.mjs";

const built = await bundle(
  "playground-storyboard-",
  `export * from './src/storyboard.ts';
   export { loadMaterial, castEntry, castChoice, placeIssue, insertToken, readNamedAsset } from './src/storyboard-model.ts';
   export { openResource, renderResources } from './src/resources.ts';
   export { setLocale } from './src/i18n.ts';`,
);
after(built.cleanup);
const {
  renderScriptContent,
  renderStoryboardContent,
  storyboardEditor,
  loadMaterial,
  readNamedAsset,
  castEntry,
  openResource,
  renderResources,
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

test("a whole gallery card opens its resource, by click or by keyboard; it has no Review button", async () => {
  const record = { ref: { kind: "script", id: ids.script }, label: "Still warm at noon", sessionId: "session" };
  const host = {
    sdk: { scripts: { get: async () => script } },
    scope: "storyboard-test",
    sessionId: "session",
    records: [record],
    remember() {},
    attach() {},
    requestAgent: async () => {},
  };
  const root = fresh();
  await renderResources(root, "script", host);
  await settle();
  const card = root.querySelector(".gallery-card");
  assert.equal(card.getAttribute("role"), "button");
  assert.equal(card.tabIndex, 0);
  assert.equal(card.querySelector("button"), null, "No Review button.");
  card.dispatchEvent(new env.window.MouseEvent("click", { bubbles: true }));
  for (let attempt = 0; attempt < 20 && !root.querySelector(".resource-actions"); attempt++) await settle();
  assert.ok(texts(root, ".resource-actions button").includes("New Storyboard"), "The Script opened.");

  const again = fresh();
  await renderResources(again, "script", host);
  await settle();
  again.querySelector(".gallery-card").dispatchEvent(new env.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  for (let attempt = 0; attempt < 20 && !again.querySelector(".resource-actions"); attempt++) await settle();
  assert.ok(again.querySelector(".resource-actions"), "Enter opens it too.");
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

test("Render clip compiles the clip's Prompt, then renders that Prompt", async () => {
  const root = fresh();
  const calls = [];
  const storyboard = { kind: "storyboard", id: ids.storyboard, lineage_id: ids.storyboard, base_id: null, batch_id: null, content: storyboardContent, relationships: [] };
  const sdk = fakeSdk({
    storyboards: { get: async () => storyboard },
    prompts: {
      generate: async (input, options) => {
        calls.push(["prompts.generate", input, typeof options.idempotencyKey]);
        return { prompts: [{ kind: "prompt", id: "prompt-c01", data: { clip_id: input.clip } }] };
      },
    },
    videos: {
      generate: async (input, options) => {
        calls.push(["videos.generate", input, typeof options.idempotencyKey]);
        return { id: "job-1", status: "queued", prompt: input.prompt };
      },
    },
  });
  const remembered = [];
  const host = { sdk, scope: "storyboard-render", sessionId: "session", records: [], remember: (record) => remembered.push(record), attach() {}, requestAgent: async () => {} };
  await openResource(root, { ref: { kind: "storyboard", id: ids.storyboard }, label: "Storyboard" }, host);
  [...root.querySelectorAll('[data-clip="C01"] button')].find((button) => button.textContent.includes("Render clip")).click();
  for (let i = 0; i < 5; i++) await settle();
  assert.deepEqual(calls, [
    ["prompts.generate", { storyboard: ids.storyboard, clip: "C01" }, "string"],
    ["videos.generate", { prompt: "prompt-c01" }, "string"],
  ]);
  assert.deepEqual(remembered.map((record) => record.ref), [{ kind: "job", id: "job-1" }]);
});

test("each clip keeps its own request records; an unknown video submission is retried with its Prompt and key", async () => {
  const root = fresh();
  localStorage.clear();
  const content = structuredClone(storyboardContent);
  content.clips.push({ id: "C02", duration_ms: 5000, shots: ["{{friend}} smiles."] });
  const storyboard = { kind: "storyboard", id: ids.storyboard, lineage_id: ids.storyboard, base_id: null, batch_id: null, content, relationships: [] };
  const calls = [];
  let compileC01, failVideo = true;
  const sdk = fakeSdk({
    storyboards: { get: async () => storyboard },
    prompts: {
      generate: async (input, options) => {
        calls.push(["prompts.generate", input.clip, options.idempotencyKey]);
        if (input.clip === "C01" && compileC01 === undefined) await new Promise((resolve) => (compileC01 = resolve));
        return { prompts: [{ kind: "prompt", id: `prompt-${input.clip}-${calls.length}`, data: { clip_id: input.clip } }] };
      },
    },
    videos: {
      generate: async (input, options) => {
        calls.push(["videos.generate", input.prompt, options.idempotencyKey]);
        if (input.prompt.startsWith("prompt-C02") && failVideo) {
          failVideo = false;
          throw Object.assign(new Error("Lost response"), { code: "CONNECTION_ERROR", retryable: true });
        }
        return { id: "job-" + input.prompt, status: "queued", prompt: input.prompt };
      },
    },
  });
  const host = { sdk, scope: "storyboard-clips", sessionId: "session", records: [], remember() {}, attach() {}, requestAgent: async () => {} };
  await openResource(root, { ref: { kind: "storyboard", id: ids.storyboard }, label: "Storyboard" }, host);
  const render = (clip) => [...root.querySelectorAll(`[data-clip="${clip}"] button`)].find((button) => button.textContent.includes("Render clip"));
  render("C01").click();
  await settle();
  // C01 is still compiling; C02 is not blocked by it.
  render("C02").click();
  for (let i = 0; i < 5; i++) await settle();
  const c02 = calls.filter((call) => call[1]?.startsWith?.("prompt-C02") || call[1] === "C02");
  assert.equal(c02[0][0], "prompts.generate");
  assert.equal(c02[1][0], "videos.generate", "C02 compiled and submitted while C01 was compiling.");
  // C02's submission was lost: retrying sends the same Prompt with the same key, without compiling again.
  render("C02").click();
  for (let i = 0; i < 5; i++) await settle();
  const videos = calls.filter((call) => call[0] === "videos.generate" && call[1].startsWith("prompt-C02"));
  assert.equal(videos.length, 2);
  assert.deepEqual(videos[1], videos[0]);
  assert.equal(calls.filter((call) => call[0] === "prompts.generate" && call[1] === "C02").length, 1);
  compileC01();
  for (let i = 0; i < 5; i++) await settle();
  assert.ok(calls.some((call) => call[0] === "videos.generate" && call[1].startsWith("prompt-C01")));
  assert.equal(Object.keys(localStorage).filter((key) => key.includes(":pending:")).length, 0);
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

test("{{asset:<id>}} files read as chips and references by their own kind, and a newly named one is read and checked", async () => {
  const music = { id: "00000901-2222-4222-8222-222222222222", kind: "audio", mime: "audio/mpeg", label: "Morning music bed", description: null, download_url: "https://media.playground.test/music" };
  const unboxing = { id: "00000902-2222-4222-8222-222222222222", kind: "video", mime: "video/mp4", label: "Unboxing", description: null, download_url: "https://media.playground.test/unboxing" };
  const files = { [music.id]: music, [unboxing.id]: unboxing };
  const reads = [];
  let outage = false;
  const sdk = fakeSdk({
    assets: {
      get: async (id) => {
        reads.push(id);
        if (outage) throw Object.assign(new Error("Service unavailable"), { code: "SERVICE_UNAVAILABLE", retryable: true });
        return files[id] ?? Promise.reject(Object.assign(new Error("Asset not found"), { code: "NOT_FOUND" }));
      },
    },
  });
  const content = structuredClone(storyboardContent);
  content.clips[0].shots[1] = `{{friend}} smiles at her; {{asset:${unboxing.id}}} plays behind. {{L02}}`;
  const loaded = await loadMaterial(sdk, script, [ids.mia], [unboxing.id]);
  const root = fresh();
  renderStoryboardContent(root, content, loaded);
  const chip = root.querySelector('[data-clip="C01"] [data-token-kind="file"]');
  assert.equal(chip.textContent.trim(), "Unboxing");
  assert.equal(chip.querySelector("img"), null, "A video shows its icon, not an image.");
  assert.ok(texts(root, '[data-clip="C01"] .storyboard-references .reference-chip').includes("Unboxing"));

  // In the editor, a file a shot newly names is read, then checked like the rest.
  const edited = fresh();
  const handle = storyboardEditor(edited, { content, material: loaded, characters: [mia, leo], loadAssets: (list) => Promise.all(list.map((id) => readNamedAsset(sdk, id))), save: async () => {}, cancel() {} });
  assert.deepEqual(handle.issues(), []);
  const missing = "00000903-2222-4222-8222-222222222222";
  type(edited.querySelector('textarea[name="shot-C01-1"]'), `Close on {{host:${ids.miaSide}}} lifting {{product:${ids.productBack}}}. 背景音乐用 {{asset:${music.id}}} {{asset:${missing}}}. {{L01}}`);
  await settle();
  assert.deepEqual(reads.slice(1), [music.id, missing], "Each new ID is read once.");
  assert.deepEqual(issuesAt(edited, "C01 shot 1"), [`{{asset:${missing}}}: there is no image, video or audio Asset with this ID that you may use.`]);
  assert.ok(texts(edited, ".reference-chip").includes("Morning music bed"));
  // Any other failure is shown as an error to retry, and the next edit reads the file again.
  outage = true;
  const later = "00000904-2222-4222-8222-222222222222";
  files[later] = { ...music, id: later, label: "Later" };
  type(edited.querySelector('textarea[name="shot-C01-1"]'), `Close on {{host:${ids.miaSide}}} lifting {{product:${ids.productBack}}}. {{asset:${later}}} {{L01}}`);
  await settle();
  assert.match(edited.querySelector(".storyboard-error").textContent, /could not be read\. Try again/);
  outage = false;
  type(edited.querySelector('textarea[name="shot-C01-1"]'), `Close on {{host:${ids.miaSide}}} lifting {{product:${ids.productBack}}}. {{asset:${later}}} {{L01}} `);
  await settle();
  assert.deepEqual(handle.issues(), []);
  await assert.rejects(loadMaterial({ ...sdk, assets: { get: async () => { throw Object.assign(new Error("down"), { code: "SERVICE_UNAVAILABLE" }); } } }, script, [ids.mia], [music.id]), /could not be read/);
});

test("the cast selector writes the Character, look and voice each role's entry needs", async () => {
  const root = fresh();
  const handle = editor(root, await material());
  const select = (role) => root.querySelector(`select[name="cast-${role}"]`);
  // A Character without a voice file: its voice must be described.
  choose(select("host"), ids.leo);
  assert.deepEqual(handle.content().cast.host, { character: ids.leo });
  assert.deepEqual(issuesAt(root, "cast.host"), ["host speaks and needs a voice."]);
  assert.ok(issuesAt(root, "C01 shot 1").some((issue) => issue.includes("that file is not one of host's Character's")));
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
  assert.ok(issuesAt(root, "C01 shot 1").some((issue) => issue.includes("host has no Character, so there is no file to name")));
  assert.deepEqual(castEntry({ look: "", voice: "", characterVoice: true }, { speaks: true, narrator: true, characterHasVoice: false }), {});
});

test("save sends the edited Storyboard and shows the service's rejection beside the clip it names", async () => {
  const root = fresh();
  const sent = [];
  const handle = editor(root, await material(), async (content) => {
    sent.push(content);
    throw Object.assign(new Error("C01: The lines need 12 s at a natural pace; the clip is 10 s."), {
      code: "INVALID_INPUT",
      retryable: false,
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
