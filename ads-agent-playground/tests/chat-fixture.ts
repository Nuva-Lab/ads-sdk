import { ResourceIndex } from "../src/resource-index.js";
import { initializeLanguage, setLocale } from "../src/i18n.js";
import promptText from "./fixtures/prompt-content.txt";
import { draftValue } from "../../typescript/dist/message.js";
import { ChatController } from "../src/chat.js";
import { openResource, renderResources } from "../src/resources.js";
import { node } from "../src/ui.js";
import type {
  NuvaClient,
  ResourceLink,
  AgentReadState,
  MessageView,
} from "@nuva/sdk";
import scriptContent from "../../typescript/tests/fixtures/script-response.json";
const id = (n: number) =>
  `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
const record = (kind: string, n: number): ResourceLink => ({
  ref: { kind, id: id(n) },
  label: `${kind} ${id(n)}`,
});
const product = {
  ...record("product", 1),
  id: id(1),
  version: 5,
  revision: id(1),
  brand_id: id(8),
  data: {
    name: "Morrow Travel Cup",
    images: [id(2)],
    target_audience: "Daily coffee drinkers",
    facts: ["350 ml"],
    attributes: {},
  },
  assets: { [id(2)]: { download_url: location.origin + "/cup.svg" } },
};
const image = {
  ...record("asset", 2),
  id: id(2),
  kind: "image",
  download_url: location.origin + "/cup.svg",
  metadata: { width: 440, height: 440, filename: "travel-cup.jpg" },
};
const content = structuredClone(scriptContent);
content.concept.name = "Quiet mornings";
content.concept.proposition = "A warm coffee for the morning commute.";
const script = {
  ...record("script", 3),
  id: id(3),
  lineage_id: id(3),
  base_id: null,
  batch_id: id(4),
  data: { text: "fixture", product: id(1) },
  content,
  entities: { [id(1)]: { id: id(1) } },
  assets: {},
  skills: {},
};
const batch = {
  ...record("batch", 4),
  id: id(4),
  intent: "Morning launch",
  ads: [],
  jobs: { queued: 0, running: 1, completed: 0, failed: 0, cancelled: 0 },
  created_at: "2026-10-26T10:00:00Z",
};
const prompt = {
  ...record("prompt", 5),
  assets: { [id(2)]: image },
  id: id(5),
  data: {
    prompt: promptText,
    seconds: 12,
    ratio: "9:16",
    image_asset_ids: [id(2)],
  },
  batch_id: id(4),
};
const prompt2 = {
  ...prompt,
  ...record("prompt", 7),
  id: id(7),
  data: {
    ...prompt.data,
    prompt:
      "summary:\nA close view of the lid opening before the first sip.\n\ndetailed_description:\nKeep the product label in view.",
    seconds: 13,
  },
};
let job = {
  ...record("job", 6),
  id: id(6),
  status: "queued",
  prompt: id(5),
  seed: 0,
  checkpoint: null,
  created_at: "2026-10-26T10:00:00Z",
  resolution: "768P",
  asset: null,
  error: null,
};
let job2 = { ...job, ...record("job", 9), id: id(9), prompt: id(7) };
const session = {
  id: "chat-fixture",
  kind: "work",
  title: "Morning launch",
  owner: { userId: "user", displayName: "Alex" },
  createdAt: "2026-10-26T10:00:00Z",
};
const user = {
  ref: { sessionId: session.id, messageId: "current-user" },
  createdAt: session.createdAt,
  role: "user",
  state: "complete",
  metadata: { user: { userId: "user", displayName: "Alex" } },
  content: [
    {
      id: "request",
      type: "text",
      format: "plain",
      text: "Can you update the product using the attached image?",
    },
  ],
  attachments: [record("asset", 2), record("product", 1)],
};
const assistant = {
  ref: { sessionId: session.id, messageId: "current-agent" },
  createdAt: session.createdAt,
  role: "assistant",
  state: "failed",
  error: {
    code: "LIMIT",
    message: "The Agent stopped before completing the next step.",
    retryable: false,
  },
  content: [
    {
      id: "a",
      type: "text",
      format: "markdown",
      text: "I updated the product details.",
    },
    { id: "product", type: "resource", record: record("product", 1) },
    {
      id: "b",
      type: "text",
      format: "plain",
      text: "Here is the script for this direction.",
    },
    { id: "batch", type: "resource", record: record("batch", 4) },
    { id: "script", type: "resource", record: record("script", 3) },
    {
      id: "c",
      type: "text",
      format: "plain",
      text: "The first clip prompt is ready.",
    },
    { id: "prompt", type: "resource", record: record("prompt", 5) },
    { id: "prompt2", type: "resource", record: record("prompt", 7) },
    { id: "job", type: "resource", record: record("job", 6) },
    { id: "job2", type: "resource", record: record("job", 9) },
  ],
  attachments: [],
};
let messages = [user, assistant] as MessageView[],
  cursor: string | null = "older",
  calls = 0;
const listeners = new Set<(state: AgentReadState) => void>();
const emit = () =>
  listeners.forEach((f) =>
    f({
      status: "idle",
      session,
      messages: { items: messages, nextCursor: cursor },
    } as AgentReadState),
  );
const agent = {
  subscribe(fn: (s: AgentReadState) => void) {
    listeners.add(fn);
    emit();
    return () => listeners.delete(fn);
  },
  refresh: async () => emit(),
  stop: async () => {},
  send: async (draft: Parameters<typeof draftValue>[0]) => {
    const value = draftValue(draft);
    await fetch("/test-send", { method: "POST", body: JSON.stringify(value) });
    messages.push({
      ref: { sessionId: session.id, messageId: `sent-user-${crypto.randomUUID()}` },
      createdAt: session.createdAt,
      role: "user",
      state: "complete",
      metadata: { user: { userId: "user", displayName: "Alex" } },
      content: value.content,
      attachments: value.attachments,
      ...(value.replyTo ? { replyTo: value.replyTo } : {}),
    } as MessageView);
    emit();
  },
  respond: async () => {},
  async loadEarlierMessages() {
    calls++;
    void fetch("/history-request", { method: "POST", body: String(calls) });
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        location.search.includes("history-error") ? 100 : 10000,
      ),
    );
    if (location.search.includes("history-error") && calls === 1)
      throw new Error("Fixture failure");
    messages = [
      ...Array.from(
        { length: 8 },
        (_, i) =>
          ({
            ref: { sessionId: session.id, messageId: "older-" + i },
            createdAt: session.createdAt,
            role: "assistant",
            state: "complete",
            content: [
              {
                id: "text",
                type: "text",
                format: "plain",
                text: `Earlier message ${i + 1}\nSaved conversation history.`,
              },
            ],
            attachments: [],
          }) as MessageView,
      ),
      ...messages,
    ];
    cursor = null;
    emit();
  },
};
const read = async (value: unknown, delay = 0) => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return value;
};
const sdk = {
  sessions: {
    list: async () => ({ items: [session], nextCursor: null }),
    get: async () => session,
  },
  agent: () => agent,
  products: { get: () => read(product, 150) },
  scripts: { get: () => read(script, 300) },
  prompts: {
    get: (ref: { id: string }) => read(ref.id === id(7) ? prompt2 : prompt, 50),
  },
  assets: { get: () => read(image, 80) },
  batches: { get: () => read(batch, 120) },
  jobs: {
    get: (value: string) => read(value === id(9) ? job2 : job, 30),
    subscribe: (_id: string, fn: (v: unknown) => void) => {
      const timer = setTimeout(() => {
        job = { ...job, status: "completed" };
        fn(job);
      }, 3500);
      return () => clearTimeout(timer);
    },
  },
  ads: { list: async () => ({ items: [], nextCursor: null }) },
} as unknown as NuvaClient;
initializeLanguage();
setLocale("en", false);
(document.getElementById("ui-language") as HTMLSelectElement).value = "en";
const root = document.getElementById("workspace-content")!;
root.append(node("p", "Open a chat resource to view its details.", "muted"));
const records = [product, script, batch, prompt, prompt2, job, job2, image].map(
  (value) => ({
    ...value,
    sessionId: session.id,
  }),
);
const index = new ResourceIndex("resource-index-fixture", localStorage);
index.seed(records);
const indexLabel = (record: ResourceLink) => index.label(session.id, record);
const controller = new ChatController({
  sdk,
  scope: "chat-render-fixture",
  selected: () => {},
  resource: () => {},
  resources: () => records,
  indexLabel,
  open: (resource) =>
    void openResource(root, resource, {
      sdk,
      scope: "chat-render-fixture",
      sessionId: session.id,
      records,
      indexLabel,
      remember: () => {},
      attach: (r) => controller.attach(r),
      requestAgent: (text, resources) => controller.requestAgent(text, resources, session.id),
    }),
});
await controller.start();
const tab = new URLSearchParams(location.search).get("tab");
await renderResources(root, tab === "script" ? "script" : tab === "job" ? "job" : "prompt", {
  sdk,
  scope: "chat-render-fixture",
  sessionId: session.id,
  records,
  indexLabel,
  remember: () => {},
  attach: (record) => controller.attach(record),
  requestAgent: (text, resources) => controller.requestAgent(text, resources, session.id),
});
document.getElementById("connection-label")!.textContent = "Connected";
