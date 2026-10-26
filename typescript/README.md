# TypeScript SDK (0.1.0-preview.1)

`@nuva/sdk` provides Agent chat, resource management and ad-creation APIs for TypeScript applications.

## Install

Install the SDK package supplied with your integration:

```sh
pnpm add /path/to/release/nuva-sdk-0.1.0-preview.1.tgz
```

## Connect and authenticate

Use the service URLs provided for your environment. Supply a token callback that calls your authenticated backend:
```ts
import { createNuva, Message } from '@nuva/sdk';
const nuva = createNuva({
  baseUrl: configuredAgentURL,
  storeBaseUrl: configuredStoreURL,
  generationBaseUrl: configuredGenerationURL,
  getAccessToken: async () => {
    const response = await fetch('/api/nuva-token');
    if (!response.ok) throw new Error('Sign-in is required.');
    return response.json(); // {token, expiresAt}; issued for the authenticated user.
  },
});
```

Keep the customer Admin API key on your backend. The SDK accepts only user credentials. Use one client per authenticated user and call `nuva.close()` on logout. Tokens with expiry are cached/coalesced and renewed proactively; an active socket reauthenticates the same verified identity before new commands proceed. String-only token providers have no proactive expiry guarantee.

A validated read rejection may cause one bounded authentication refresh/retry. Writes require an explicit backend `acceptance: "not_accepted"` marker before a 401 can be retried. Unknown acceptance, malformed responses, lost acknowledgements and postdispatch 5xx/408 never authorize automatic replay. Agent commands are not resubmitted merely because credentials changed.

## Product to saved video

```ts
const brand = await nuva.brands.create({data: {name: 'Example'}});
const base = await nuva.products.create({
  brand_id: brand.id,
  data: {name: 'Travel cup', facts: ['350 ml capacity'], attributes: {catalog: {color: 'blue'}}},
});
const {product} = await nuva.products.uploadImage({base, file});
const script = await nuva.scripts.generate({
  product: product.id,
  acceptable_duration_ms: {min: 5000, max: 15000},
  instruction: 'Use only the supplied facts.',
});
const revised = await nuva.scripts.generate({
  product: product.id, base: script.id,
  acceptable_duration_ms: {min: 5000, max: 15000},
  instruction: 'Shorten the opening while preserving the original meaning.',
});
const {prompts} = await nuva.prompts.generate({script: revised.id, ratio: '9:16'});
const job = await nuva.videos.generate({prompt: prompts[0]!.id});
const state = await nuva.jobs.get(job.id);
// Acceptance is not completion. Poll/subscribe or await job.result({timeoutMs}).
```

Brand/Product/Character records retain continuing `id`, numeric `version`, exact `revision`, typed `data` and authorized Asset sidecars. Updates take `{base,data}`; Products also accept `brand_id`. `get(id,{version})` reads an exact historic version. `uploadImage` uploads/registers then attaches against the captured base without refetching or silently rebasing. A duplicate already-attached Asset is a no-op; stale bases still conflict. `ProductImageUploadError.asset` and `.assetId` retain the uploaded Asset when attachment fails.

Backend resource IDs are canonical GUID-shaped identifiers, including backend OrderedUUID values without RFC version/variant bits. `backendIdSchema` accepts that shape. Session/request identifiers retain their separate protocol rules.

Scripts use `script@1`; `data.text` contains the validated version-2 ScriptPackage encoding. Typed Script readers expose decoded `.content` and preserve backend metadata. Both codec directions enforce the backend 65,536-character limit. `scripts.update(ref,{content,...})` creates an immutable revision. A source Product reference in Script data identifies the saved entity revision; use its `entities` sidecar to resolve the continuing Product ID and version.

Use `scripts.generate` for a direct request or ask the Agent to write and revise within a conversation. `prompts.generate` takes a saved Script ID and returns `{prompts}` in clip order. Each Prompt is saved independently. If a later save fails, `PartialCreationError.saved.prompts` contains the records already saved; inspect them before retrying.

`videos.generate({prompt: prompt.id})` submits a saved Prompt for video generation. Jobs expose status, error and an eventual Asset. `jobs.get`, `jobs.subscribe` and `job.result` keep submission separate from completion. Stopping chat or unsubscribing does not cancel a Job. To request best-effort cancellation, ask the Agent; cancellation is only confirmed by the backend Job status.

Edit and postprocess clips in your own editor. Upload the finished video and attach its Asset reference to the same Agent Session, with any optional editing notes or structured details. The Agent handles Ad registration and returns the Ad ID. User hints are retained in private creation trace and the structured Composition format stays unchanged. Allowing an absent composition is still a backend gap; the pinned backend currently still requires structured composition and a Batch.

## Reads, media and operation identity

Use `assets.get`, `scripts.get(ref)`, `prompts.get(ref)`, `jobs.get`, `ads.get/list`, `batches.get/list` and `skills.get/list/version`. Lists expose both `next_cursor` and `nextCursor`. Retain the Script, Prompt, Asset and Job IDs returned by calls or Agent resource cards so you can read them later.

Asset uploads send bytes to the authorized upload URL without backend bearer headers or redirects. Expired media URLs should be refreshed through an authorized read of the same resource, including entity sidecars where applicable. Metadata is not a new access grant.

Supported writes accept optional `idempotencyKey` values of 1–200 visible ASCII characters. An operation key is distinct from `requestId`. Fresh deliberate work uses a fresh key; recovery of an uncertain invocation retains its exact key and input. Server support/retention remains part of the selected backend's contract. The SDK does not invent keys or replay uncertain writes automatically.

## Conversation and React

```ts
const agent = nuva.agent({sessionId});
const unsubscribe = agent.subscribe(state => render(state));
await agent.send(Message.create().text('Write an ad for this product.').attach(product));
await agent.stop(); // Current loop only; does not cancel existing Jobs.
```

Use `sessions.create/get/list/history`, `loadEarlierMessages` and `refresh` for Session state. `respond` sends output for a registered pending client call; `fail` reports inability to obtain the result. Keep drafts when an acknowledgement is lost and retry with the original request ID only when appropriate. Clients cannot submit trusted author metadata or internal tool calls.

`@nuva/sdk/react` exports `NuvaProvider` and `useAgent`. It uses the same client and state contract; it does not introduce a second conversation owner. Opt-in `onWireTrace` observes transport bodies; treat them as sensitive application data and redact before storing or sharing.

## Verification

From the source workspace: `pnpm --dir typescript test`. For delivered artifacts: `node scripts/release/check.mjs <release-directory>` installs the exact npm archives into an isolated consumer, checks strict TypeScript/headless/React imports, and verifies the separately delivered Go zip. No registry publication or service/model invocation is performed by the release check.
