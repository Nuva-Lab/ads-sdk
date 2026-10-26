# Nuva TypeScript SDK — 0.1.0-preview.1

`@nuva/sdk` is an ESM Agent and Store client with optional React bindings. This release pins `@nuva/protocol@0.1.0-preview.1`. Package versions are distinct from the public HTTP/wire and Artifact schema revision **1** and the inner ScriptPackage version **2**.

## Install the review bundle

The packages are delivered as local archives; registry publication is separate. Use pnpm to install the SDK tarball; it includes the matching protocol package:

```sh
pnpm add /path/to/release/nuva-sdk-0.1.0-preview.1.tgz
# Only applications using the React entrypoint need React:
pnpm add react
```

The release directory includes `SHA256SUMS`, a complete file manifest, and independent-consumer verification. The SDK has no private Agent-runtime, Cloudflare or model-provider dependency. React is an optional peer dependency; headless imports do not install it.

## Connect and authenticate

The normal API is `createNuva({getAccessToken})`. Agent/generation origins must be explicitly confirmed in the release manifest before a bundle can support that form. The current source leaves those origins unconfigured; the Store source default is `https://api.nuvalab.ai`. Development/test services can supply explicit overrides:

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

Direct Script generation uses a standalone writer Agent and default Skill. The Session Agent uses its own conversation and loaded Script Skill to author/save Scripts directly. Prompt generation uses the saved Script and returns `{prompts}` in clip order. It does not create a DirectingPlan; `plan`/`clip_key` are absent or null. `PartialCreationError.saved.prompts` retains validated partial records—preserve them and reconcile before deciding to retry.

`videos.generate` currently accepts a saved Prompt ID. It does not accept raw video prompts. Jobs expose status, error and an eventual Asset. `jobs.subscribe`, `jobs.cancel` and `job.result` keep submission separate from completion; stopping chat does not cancel a Job.

`videos.assemble({batch_id,composition},{idempotencyKey?})` accepts ordered clips `{asset_id,start_ms,end_ms}` plus explicit `version:1`, dimensions, fps and audio policy. It returns `{assetId,uri}`. The service performs final Asset/Ad registration internally. Customer SDK methods do not expose Batch or Ad writes.

## Reads, media and operation identity

Use `assets.get`, `scripts.get(ref)`, `prompts.get(ref)`, `jobs.get`, `ads.get/list`, `batches.get/list` and `skills.get/list/version`. Lists expose both `next_cursor` and `nextCursor`. There are no Script/Prompt/Asset/Job catalogue methods; retain returned IDs and Session resource cards. There is no public Artifact relationship-tree API.

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
