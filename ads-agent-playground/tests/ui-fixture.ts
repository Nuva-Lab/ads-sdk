import { bootWorkspace } from "../src/client.js";
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
    list: async () => ({ items: [product], next_cursor: null }),
    get: async () => product,
    update: async (input: any) => {
      product.data = { ...product.data, ...input.data };
      return product;
    },
    create: async () => product,
  },
  brands: {
    list: async () => ({
      items: [{ id: brandId, data: { name: "Morrow" } }],
      next_cursor: null,
    }),
  },
  agent: () => agent,
  close: () => {},
} as unknown as NuvaClient;
const app = bootWorkspace(sdk, "playground-fixture");
await app.ready;
document.getElementById("connection-label")!.textContent = "Connected";
document.getElementById("connection-button")!.classList.add("connected");
