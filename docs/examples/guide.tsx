import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  createNuva,
  Message,
  NuvaError,
  ProductImageUploadError,
  type AccessToken,
  type NuvaClient,
  type AgentHandle,
  type AgentState,
  type Product,
  type MessageView,
  type MessageRef,
  type ResourceLink,
  type DynamicToolUIPart,
  type Script,
  type JobState,
  type Job,
} from "@nuva/sdk";

// #region token
export async function fetchTokenFromYourBackend(): Promise<AccessToken> {
  const response = await fetch("/api/ads/token", {
    method: "POST",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Sign in to continue.");
  return response.json(); // { token, expiresAt }
}
// #endregion token

// #region client
export function useAdsClient() {
  const [client, setClient] = useState<NuvaClient | null>(null);

  useEffect(() => {
    const sdk = createNuva({ getAccessToken: fetchTokenFromYourBackend });
    setClient(sdk);
    return () => sdk.close();
  }, []);

  return client;
}
// #endregion client

// #region environment
export function createProductionClient() {
  return createNuva({
    environment: 'production',
    getAccessToken: fetchTokenFromYourBackend,
  });
}
// #endregion environment

// #region first-session
export function NewConversation({
  client,
  onOpen,
}: {
  client: NuvaClient;
  onOpen: (sessionId: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setPending(true);
    setError("");
    try {
      const session = await client.sessions.create({ title: "Product ad" });
      onOpen(session.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button disabled={pending} onClick={create}>
        New conversation
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
// #endregion first-session

// #region subscribe
export function useConversation(client: NuvaClient, sessionId: string) {
  const agent = useMemo(() => client.agent({ sessionId }), [client, sessionId]);
  const [state, setState] = useState<AgentState>({ status: "loading" });
  useEffect(() => agent.subscribe(setState), [agent]);
  return { agent, state };
}
// #endregion subscribe

// #region composer
export function MessageInput({
  agent,
  busy,
}: {
  agent: AgentHandle;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function send(event: FormEvent) {
    event.preventDefault();
    if (busy || sending || !text.trim()) return;
    const submitted = text;
    setSending(true);
    setError("");
    try {
      await agent.send(Message.create().text(submitted));
      setText((current) => (current === submitted ? "" : current));
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={send}>
      <textarea value={text} onChange={(event) => setText(event.target.value)} />
      <button disabled={busy || sending || !text.trim()}>Send</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
// #endregion composer

// #region attach
export async function requestScript(agent: AgentHandle, product: Product) {
  await agent.send(
    Message.create()
      .text("Write a 15-second ad script for this product.")
      .attach(product),
  );
}
// #endregion attach

// #region revise-message
export async function requestRevision(agent: AgentHandle, script: Script) {
  await agent.send(Message.create().quote(script).text("Shorten the opening."));
}
// #endregion revise-message

// #region render-message
export function MessageContent({
  message,
  onOpenResource,
  onOpenMessage,
  renderInteraction,
}: {
  message: MessageView;
  onOpenResource: (resource: ResourceLink) => void;
  onOpenMessage: (message: MessageRef) => void;
  renderInteraction: (part: DynamicToolUIPart) => ReactNode;
}) {
  return (
    <article>
      {message.content.map((part) => {
        if (part.type === "text") return <p key={part.id}>{part.text}</p>;
        if (part.type === "resource")
          return (
            <button key={part.id} onClick={() => onOpenResource(part.record)}>
              {part.record.label}
            </button>
          );
        if (part.type === "dynamic-tool")
          return <div key={part.toolCallId}>{renderInteraction(part)}</div>;
        if (part.type === "quote") {
          const target = part.target;
          return (
            <blockquote key={part.id}>
              {part.text && <p>{part.text}</p>}
              {"ref" in target ? (
                <button onClick={() => onOpenResource(target)}>
                  {target.label}
                </button>
              ) : (
                <button onClick={() => onOpenMessage(target)}>
                  View quoted message
                </button>
              )}
            </blockquote>
          );
        }
        return null;
      })}
      {message.attachments.map((resource) => (
        <button
          key={`${resource.ref.kind}:${resource.ref.id}`}
          onClick={() => onOpenResource(resource)}
        >
          {resource.label}
        </button>
      ))}
    </article>
  );
}
// #endregion render-message

// #region review
export async function approveReview(
  agent: AgentHandle,
  call: Extract<DynamicToolUIPart, { state: "input-available" }>,
) {
  if (call.toolName !== "nuva.review")
    throw new Error("Expected a review request.");
  await agent.respond(call, { decision: "approve", text: "" });
}
// #endregion review

// #region host-action
export function useEditorAction(
  agent: AgentHandle,
  openEditor: (assetId: string) => void,
) {
  useEffect(
    () =>
      agent.onHostCall((part) => {
        if (part.data.toolName === "workspace.openEditor") {
          const assetId = part.data.input.assetId;
          if (typeof assetId === "string") openEditor(assetId);
        }
      }),
    [agent, openEditor],
  );
}
// #endregion host-action

// #region controls
export async function stopReply(agent: AgentHandle) {
  await agent.stop();
}

export async function loadHistory(agent: AgentHandle) {
  await agent.loadEarlierMessages();
}
// #endregion controls

// #region app
export function AdsConversationApp({ userId }: { userId: string }) {
  return <SignedInConversation key={userId} />;
}

function SignedInConversation() {
  const client = useAdsClient();
  const [sessionId, setSessionId] = useState<string>();
  if (!client) return null;
  if (!sessionId)
    return <NewConversation client={client} onOpen={setSessionId} />;
  return <Conversation key={sessionId} client={client} sessionId={sessionId} />;
}

function Conversation({
  client,
  sessionId,
}: {
  client: NuvaClient;
  sessionId: string;
}) {
  const { agent, state } = useConversation(client, sessionId);
  if (state.status === "loading") return <p>Loading…</p>;
  if (state.status === "error") return <p role="alert">{state.error.message}</p>;
  return (
    <>
      {state.messages.items.map((message) => (
        <p key={message.ref.messageId}>
          {message.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n")}
        </p>
      ))}
      <MessageInput agent={agent} busy={state.status !== "idle"} />
    </>
  );
}
// #endregion app

// #region create-product
export async function createProduct(client: NuvaClient, file: File) {
  const brand = await client.brands.create({ data: { name: "Morrow" } });
  const product = await client.products.create({
    brand_id: brand.id,
    data: {
      name: "Travel cup",
      facts: ["350 ml capacity"],
      attributes: { color: "blue" },
    },
  });
  const uploaded = await client.products.uploadImage({ base: product, file });
  return uploaded.product;
}
// #endregion create-product

// #region list-products
export async function listProducts(client: NuvaClient) {
  const first = await client.products.list({ limit: 20 });
  if (first.nextCursor === null) return first.items;
  const second = await client.products.list({
    limit: 20,
    cursor: first.nextCursor,
  });
  return [...first.items, ...second.items];
}
// #endregion list-products

// #region update-product
export async function renameProduct(
  client: NuvaClient,
  base: Product,
  name: string,
) {
  return client.products.update({
    base,
    brand_id: base.brand_id,
    data: { ...base.data, name },
  });
}
// #endregion update-product

// #region upload-error
export async function addProductImage(
  client: NuvaClient,
  base: Product,
  file: File,
) {
  try {
    return await client.products.uploadImage({ base, file });
  } catch (error) {
    if (error instanceof ProductImageUploadError) {
      return { product: null, uploadedAsset: error.asset, error };
    }
    throw error;
  }
}
// #endregion upload-error

// #region read-script
export async function readScript(client: NuvaClient, scriptId: string) {
  const script = await client.scripts.get({ kind: "script", id: scriptId });
  return { title: script.content.concept.name, clips: script.content.clips };
}
// #endregion read-script

// #region save-script
export async function saveEditedScript(client: NuvaClient, script: Script) {
  return client.scripts.update(script.ref, {
    content: {
      ...script.content,
      concept: { ...script.content.concept, name: "Morning commute" },
    },
    batch_id: script.batch_id,
  });
}
// #endregion save-script

// #region write-script
export async function writeScript(client: NuvaClient, productId: string) {
  return client.scripts.generate({
    product: productId,
    acceptable_duration_ms: { min: 8000, max: 15000 },
    instruction: "Use the product facts. Open with a morning commute.",
  });
}
// #endregion write-script

// #region revise-script
export async function reviseScript(
  client: NuvaClient,
  productId: string,
  base: Script,
) {
  return client.scripts.generate({
    product: productId,
    base: base.id,
    acceptable_duration_ms: { min: 8000, max: 15000 },
    instruction: "Keep the product facts and shorten the opening.",
  });
}
// #endregion revise-script

// #region write-prompts
export async function writePrompts(client: NuvaClient, scriptId: string) {
  const { prompts } = await client.prompts.generate({
    script: scriptId,
    ratio: "9:16",
  });
  return prompts;
}
// #endregion write-prompts

// #region generate-video
export async function generateClip(client: NuvaClient, promptId: string) {
  const job = await client.videos.generate({ prompt: promptId });
  return job; // Save job.id before waiting for the video.
}
// #endregion generate-video

// #region generate-video-raw
export async function generateClipFromText(
  client: NuvaClient,
  imageAssetId: string,
  requestKey: string,
) {
  return client.videos.generate({
    input: {
      schema_version: 1,
      data: {
        prompt: "Show the product in <Picture 1> on a clean studio background.",
        image_asset_ids: [imageAssetId],
        seconds: 5,
        ratio: "9:16",
      },
    },
  }, { idempotencyKey: requestKey });
}
// #endregion generate-video-raw

// #region job-progress
export function useClip(client: NuvaClient, jobId: string) {
  const [job, setJob] = useState<JobState | null>(null);
  const [error, setError] = useState("");
  useEffect(
    () =>
      client.jobs.subscribe(
        jobId,
        (state) => {
          setJob(state);
          setError("");
        },
        (error) => setError(error.message),
      ),
    [client, jobId],
  );
  return { job, error };
}
// #endregion job-progress

// #region wait-video
export async function waitForClip(job: Job) {
  return job.result({ timeoutMs: 300_000 });
}
// #endregion wait-video

// #region idempotency
export function videoSubmission(client: NuvaClient, promptId: string) {
  const input = { prompt: promptId };
  const options = { idempotencyKey: crypto.randomUUID() };
  return {
    input,
    options,
    submit: () => client.videos.generate(input, options),
  };
}
// #endregion idempotency

// #region errors
export async function loadProduct(client: NuvaClient, productId: string) {
  try {
    return await client.products.get(productId);
  } catch (error) {
    if (error instanceof NuvaError) {
      return {
        error: {
          code: error.code,
          message: error.message,
          requestId: error.requestId,
        },
      };
    }
    throw error;
  }
}
// #endregion errors
