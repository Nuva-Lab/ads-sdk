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
    images: ["cup"],
    attributes: {},
  },
  assets: { cup: { download_url: location.origin + "/cup.svg" } },
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
  prompts: { get: async () => referencePrompt },
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
