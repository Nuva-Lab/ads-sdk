import { bootWorkspace } from "../src/client.js";
import { msg, setText } from "../src/i18n.js";
import type { NuvaClient, AgentReadState, MessageView } from "@nuva/sdk";
// This fixture is built only by fixture-server.mjs; the customer bundle never imports it.
import { draftValue } from "../../typescript/dist/message.js";
const pId = "11111111-1111-4111-8111-111111111111",
  brandId = "22222222-2222-4222-8222-222222222222",
  sId = "33333333-3333-4333-8333-333333333333";
const product = {
  id: pId,
  ref: { kind: "product", id: pId },
  label: "Morrow Travel Cup",
  version: 1,
  revision: pId,
  brand_id: brandId,
  created_at: "2026-10-26T09:40:00Z",
  schema_version: 1,
  data: {
    name: "Morrow Travel Cup",
    facts: ["350 ml capacity", "Double-wall insulation"],
    selling_points: ["Your coffee, still warm at noon."],
    constraints: [],
    target_audience: "A slower morning, wherever you go.",
    images: ["a1a1a1a1-0000-4000-8000-0000000000c0"],
    attributes: {},
  },
  assets: { "a1a1a1a1-0000-4000-8000-0000000000c0": { download_url: location.origin + "/cup.svg", label: "Front of the cup" } },
};
const productList: any[] = [product];
let session = {
  id: sId,
  kind: "work",
  title: "A quieter morning",
  owner: { userId: "fixture-user", displayName: "Alex" },
  createdAt: "2026-10-26T09:40:00Z",
};
let messages: MessageView[] = [
  {
    ref: { sessionId: sId, messageId: "welcome" },
    createdAt: "2026-10-26T09:40:00Z",
    role: "assistant",
    state: "complete",
    content: [
      {
        id: "text",
        type: "text",
        format: "markdown",
        text: "Let’s make something for **Morrow Travel Cup**.\n\nWe could tell the story of a calmer morning: warm coffee, a quiet commute, and a little time for yourself.\n\nWhat would you like to create?",
      },
      { id: "resource", type: "resource", record: product },
    ],
    attachments: [],
  } as MessageView,
];
const referencePromptId = "44444444-4444-4444-8444-444444444444";
const referenceJobId = "55555555-5555-4555-8555-555555555555";
const referenceAsset = (id: string, kind: string, path: string) => ({
  id,
  kind,
  mime:
    kind === "image"
      ? "image/svg+xml"
      : kind === "video"
        ? "video/mp4"
        : "audio/wav",
  source: "uploaded",
  size_bytes: 1000,
  metadata: { duration_ms: 1000 },
  created_at: "2026-10-26T09:40:00Z",
  download_url: location.origin + path,
  download_url_expires_at: "2099-01-01T00:00:00Z",
});
const referenceAssets = {
  cup: referenceAsset("cup", "image", "/cup.svg"),
  motion: referenceAsset("motion", "video", "/reference.mp4"),
  sound: referenceAsset("sound", "audio", "/reference.wav"),
};
const referencePrompt = {
  id: referencePromptId,
  kind: "prompt",
  ref: { kind: "prompt", id: referencePromptId },
  label: "Reference preview",
  lineage_id: referencePromptId,
  base_id: null,
  schema_version: 1,
  batch_id: null,
  created_at: "2026-10-26T09:40:00Z",
  assets: referenceAssets,
  entities: {},
  skills: {},
  data: {
    seconds: 4,
    ratio: "16:9",
    image_asset_ids: ["cup"],
    video_asset_ids: ["motion"],
    audio_asset_ids: ["sound"],
    prompt:
      "subject_definitions:\n<Subject 7> is the cup in <Picture 1>.\n\nsummary:\nKeep <Picture 1> recognizable. Use <Video 1> for camera movement and <Audio 1> for the sound reference.\n\ndetailed_description:\n[Shot 1] Move around <Subject 7> slowly. Match <Video 1> while keeping <Picture 1> unchanged.\n\noverall_soundscape:\nUse <Audio 1>.\n\nnon_diegetic_music:\nNone.",
  },
};
const referenceJob = {
  id: referenceJobId,
  status: "completed",
  prompt: referencePromptId,
  seed: 0,
  resolution: "768P",
  checkpoint: "Fixture video model",
  batch_id: null,
  asset: referenceAssets.motion,
  error: null,
  callback: null,
  created_at: "2026-10-26T09:41:00Z",
};
messages[0].content.push(
  { id: "reference-prompt", type: "resource", record: referencePrompt } as any,
  {
    id: "reference-job",
    type: "resource",
    record: {
      ref: { kind: "job", id: referenceJobId },
      label: "Reference clip",
    },
  } as any,
);
// Script v3, a Storyboard of it and two Characters, so the Scripts, Storyboards and Characters tabs have content.
const scriptId = "66666666-6666-4666-8666-666666666666",
  storyboardId = "77777777-7777-4777-8777-777777777777",
  miaId = "88888888-8888-4888-8888-888888888888",
  leoId = "99999999-9999-4999-8999-999999999999";
const image = (id: string, path: string, label: string | null) => ({
  ...referenceAsset(id, "image", path),
  label,
  description: null,
});
const characters: any[] = [
  {
    id: miaId,
    ref: { kind: "character", id: miaId },
    label: "Mia",
    version: 1,
    revision: miaId,
    schema_version: 1,
    created_at: "2026-10-26T09:40:00Z",
    data: {
      name: "Mia",
      description: "Late twenties, short black hair, grey wool sweater. Warm, unhurried, speaks Mandarin.",
      image_asset_ids: ["a1a1a1a1-0000-4000-8000-000000000001", "a1a1a1a1-0000-4000-8000-000000000002"],
      voice_asset_id: "sound",
    },
    assets: {
      "a1a1a1a1-0000-4000-8000-000000000001": image("a1a1a1a1-0000-4000-8000-000000000001", "/person.svg", "Front"),
      "a1a1a1a1-0000-4000-8000-000000000002": image("a1a1a1a1-0000-4000-8000-000000000002", "/person.svg?side", "Side"),
      sound: referenceAssets.sound,
    },
  },
  {
    id: leoId,
    ref: { kind: "character", id: leoId },
    label: "Leo",
    version: 1,
    revision: leoId,
    schema_version: 1,
    created_at: "2026-10-26T09:40:00Z",
    data: { name: "Leo", description: "Her colleague, thirties, tall.", image_asset_ids: ["a1a1a1a1-0000-4000-8000-000000000003"], voice_asset_id: null },
    assets: { "a1a1a1a1-0000-4000-8000-000000000003": image("a1a1a1a1-0000-4000-8000-000000000003", "/person.svg?leo", null) },
  },
];
const scriptV3 = {
  id: scriptId,
  kind: "script",
  ref: { kind: "script", id: scriptId },
  label: "Still warm at noon",
  format: 3,
  lineage_id: scriptId,
  base_id: null,
  batch_id: null,
  schema_version: 1,
  created_at: "2026-10-26T09:42:00Z",
  data: { text: "{}" },
  relationships: [{ type: "based_on", target: { kind: "product", id: pId } }],
  entities: { [pId]: { kind: "product", id: pId, version: 1 } },
  assets: {},
  skills: {},
  content: {
    schema_version: 3,
    concept: {
      name: "Still warm at noon",
      category: "other",
      purchase_task: "Choose a travel cup for the commute",
      proposition: "Coffee poured at seven is still warm at your noon meeting.",
      route: "Presenter to camera, with product close-ups",
      route_reason: "The steam has to be seen to be believed.",
      speaker_relation: "A colleague recommending it, relaxed",
    },
    duration_ms: 20000,
    beats: [
      { id: "B01", purpose: "The cold-coffee moment everyone knows", fact_ids: [] },
      { id: "B02", purpose: "The cup, named, still steaming", fact_ids: [] },
    ],
    roles: [
      { id: "host", name: "Host", description: "A woman in her late twenties who commutes every day", speaks: true },
      { id: "colleague", name: "Colleague", description: "Her colleague at the next desk", speaks: false },
    ],
    panels: [
      {
        id: "P01",
        beat_id: "B01",
        on_screen: ["host", "colleague"],
        action: "At noon the host lifts the lid; her colleague glances over at his cold mug.",
        fact_ids: [],
        lines: [{ id: "L01", speaker: "host", mode: "on_camera", text: "Poured this at seven." }],
        notes: "",
      },
      {
        id: "P02",
        beat_id: "B02",
        on_screen: ["host", "product"],
        action: "Steam rises; she turns the cup to camera.",
        fact_ids: [],
        lines: [
          { id: "L02", speaker: "host", mode: "on_camera", text: "Still warm. It's the Morrow cup." },
          { id: "L03", speaker: "narrator", mode: "voiceover", text: "Morrow. Warm all day." },
        ],
        notes: "On-screen text at the end: “Warm all day”.",
      },
    ],
    facts: [],
    images: [],
  },
};
const storyboard = {
  id: storyboardId,
  kind: "storyboard",
  ref: { kind: "storyboard", id: storyboardId },
  label: "Storyboard",
  lineage_id: storyboardId,
  base_id: null,
  batch_id: null,
  schema_version: 1,
  created_at: "2026-10-26T09:43:00Z",
  data: { text: "{}" },
  relationships: [],
  entities: {},
  assets: {},
  skills: {},
  content: {
    script: scriptId,
    cast: {
      host: { character: miaId, voice: "character" },
      colleague: { look: "A tall man in his thirties, navy shirt, sleeves rolled up" },
      narrator: { voice: "A warm, low female voice, unhurried" },
    },
    direction: "A bright open-plan office at noon, soft window light. Natural room sound, no music. Keep the {{product}} logo readable.",
    clips: [
      {
        id: "C01",
        duration_ms: 10000,
        shots: [
          "Medium shot at her desk: {{host:a1a1a1a1-0000-4000-8000-000000000001}} lifts the lid of {{product}}; steam rises. {{L01}}",
          "Over her shoulder, {{colleague}} looks at his cold mug and back at her cup.",
        ],
      },
      {
        id: "C02",
        duration_ms: 10000,
        shots: [
          "Close-up: {{host}} turns {{product:a1a1a1a1-0000-4000-8000-0000000000c0}} to camera, smiling. {{L02}}",
          "Pack shot of {{product}} on the desk. {{L03}}",
        ],
      },
    ],
  },
};
messages[0].content.push(
  { id: "script-v3", type: "resource", record: { ref: scriptV3.ref, label: scriptV3.label } } as any,
  { id: "storyboard", type: "resource", record: { ref: storyboard.ref, label: "Storyboard" } } as any,
);
let status = "idle";
const listeners = new Set<(s: AgentReadState) => void>();
function emit() {
  const state = {
    status,
    session,
    messages: { items: messages, nextCursor: null },
  } as AgentReadState;
  listeners.forEach((f) => f(state));
}
const agent = {
  sessionId: sId,
  subscribe(fn: (s: AgentReadState) => void) {
    listeners.add(fn);
    emit();
    return () => listeners.delete(fn);
  },
  refresh: async () => emit(),
  loadEarlierMessages: async () => {},
  async send(draft: Parameters<typeof draftValue>[0]) {
    const value = draftValue(draft);
    void fetch("/test-events", { method: "POST", body: JSON.stringify(value) });
    const id = crypto.randomUUID();
    messages.push({
      ref: { sessionId: session.id, messageId: id },
      createdAt: new Date().toISOString(),
      role: "user",
      metadata: { user: { userId: "fixture-user", displayName: "Alex" } },
      state: "complete",
      content: value.content,
      attachments: value.attachments,
    } as MessageView);
    status = "running";
    emit();
    setTimeout(() => {
      if (status !== "running") return;
      messages.push({
        ref: { sessionId: session.id, messageId: crypto.randomUUID() },
        createdAt: new Date().toISOString(),
        role: "assistant",
        state: "complete",
        content: [
          {
            id: crypto.randomUUID(),
            type: "text",
            format: "markdown",
            text: "A warm, everyday story could work well. I’ll start with the product details and a simple opening shot.",
          },
        ],
        attachments: [],
      } as MessageView);
      status = "idle";
      emit();
    }, 5500);
    return { requestId: id, sessionId: session.id };
  },
  async stop() {
    status = "idle";
    emit();
    void fetch("/test-stop", { method: "POST" });
    return { requestId: "stop", sessionId: session.id };
  },
  respond: async () => {},
  fail: async () => {},
  onClientTool: () => () => {},
  onHostCall: () => () => {},
  listPendingCalls: async () => ({ items: [], nextCursor: null }),
  getHostCall: async () => {},
  // Session files: a generated image, shown as a session_file card from its signed URL.
  files: {
    get: async (id: string) => ({
      id,
      mime: "image/svg+xml",
      label: "Generated presenter",
      download_url: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="96"><rect width="64" height="96" fill="#c9a"/></svg>'),
      download_url_expires_at: new Date(Date.now() + 12 * 3600_000).toISOString(),
    }),
  },
};
const sdk = {
  sessions: {
    list: async () => ({ items: [session], nextCursor: null }),
    get: async () => session,
    create: async () => {
      session = {
        ...session,
        id: crypto.randomUUID(),
        title: "New conversation",
      };
      messages = [];
      return session;
    },
  },
  products: {
    list: async () => ({ items: productList.slice(), next_cursor: null }),
    get: async (id: string) => {
      const saved = productList.find((product) => product.id === id);
      if (!saved) throw new Error("Product not found");
      return saved;
    },
    update: async (input: any) => {
      const index = productList.findIndex(
        (product) => product.id === input.base.id,
      );
      if (index < 0 || productList[index].version !== input.base.version)
        throw new Error("Product version conflict");
      const saved = {
        ...productList[index],
        data: input.data,
        brand_id: input.brand_id,
        version: input.base.version + 1,
        revision: crypto.randomUUID(),
        label: input.data.name,
      };
      productList[index] = saved;
      void fetch("/test-events", {
        method: "POST",
        body: JSON.stringify({
          action: "product.updated",
          id: saved.id,
          data: saved.data,
        }),
      });
      return saved;
    },
    create: async (input: any) => {
      const id = crypto.randomUUID();
      const saved = {
        ...product,
        id,
        ref: { kind: "product", id },
        label: input.data.name,
        revision: id,
        data: input.data,
        brand_id: input.brand_id,
        assets: {},
        version: 1,
      };
      productList.push(saved);
      void fetch("/test-events", {
        method: "POST",
        body: JSON.stringify({
          action: "product.created",
          id,
          data: saved.data,
        }),
      });
      return saved;
    },
  },
  brands: {
    list: async () => ({
      items: [{ id: brandId, data: { name: "Morrow" } }],
      next_cursor: null,
    }),
  },
  prompts: {
    get: async () => referencePrompt,
    generate: async (input: any) => {
      void fetch("/test-events", { method: "POST", body: JSON.stringify({ action: "prompts.generate", input }) });
      return { prompts: [{ ...referencePrompt, data: { ...referencePrompt.data, clip_id: input.clip ?? "C01" } }] };
    },
  },
  scripts: { get: async () => scriptV3 },
  storyboards: {
    get: async () => storyboard,
    generate: async (input: any) => {
      void fetch("/test-events", { method: "POST", body: JSON.stringify({ action: "storyboards.generate", input }) });
      return storyboard;
    },
    revise: async (ref: any, input: any) => {
      void fetch("/test-events", { method: "POST", body: JSON.stringify({ action: "storyboards.revise", input: { base: ref.id, ...input } }) });
      return { ...storyboard, id: crypto.randomUUID(), base_id: ref.id };
    },
    update: async (ref: any, input: any) => {
      void fetch("/test-events", { method: "POST", body: JSON.stringify({ action: "storyboards.update", input: { base: ref.id, ...input } }) });
      return { ...storyboard, id: crypto.randomUUID(), base_id: ref.id, content: input.content };
    },
  },
  characters: {
    list: async () => ({ items: characters.slice(), next_cursor: null }),
    get: async (id: string) => {
      const saved = characters.find((character) => character.id === id);
      if (!saved) throw new Error("Character not found");
      return saved;
    },
  },
  videos: {
    generate: async (input: any) => {
      void fetch("/test-events", { method: "POST", body: JSON.stringify({ action: "videos.generate", input }) });
      return { ...referenceJob, status: "queued", asset: null };
    },
  },
  jobs: { get: async () => referenceJob },
  assets: {
    get: async (id: string) =>
      referenceAssets[id as keyof typeof referenceAssets],
  },
  agent: () => agent,
  close: () => {},
} as unknown as NuvaClient;
const app = bootWorkspace(sdk, "playground-fixture");
await app.ready;
setText(document.getElementById("connection-label")!, msg("Connected"));
document.getElementById("connection-button")!.classList.add("connected");
