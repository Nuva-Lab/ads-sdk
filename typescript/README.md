# TypeScript SDK (0.1.0-preview.4)

`@nuva/sdk` provides Agent chat, resource management and ad-creation APIs for TypeScript applications.

## Install

Install the SDK package supplied with your integration:

```sh
pnpm add /path/to/release/nuva-sdk-0.1.0-preview.4.tgz
```

## Connect and authenticate

The SDK defaults to `environment: "sandbox"` (staging). Set `environment: "production"` to select production. Use a user token issued by the same environment. Explicit URL options take precedence over the selected environment. Supply a token callback that calls your authenticated backend:
```ts
import { createNuva, Message } from '@nuva/sdk';
const nuva = createNuva({
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
const photo = await nuva.assets.upload(photoFile, {kind: 'image', label: 'Mia, front'});
const voice = await nuva.assets.upload(voiceFile, {kind: 'audio'});
// A Character keeps the person the same in every clip.
const character = await nuva.characters.create({
  data: {name: 'Mia', description: 'Late twenties, warm.', image_asset_ids: [photo.id], voice_asset_id: voice.id},
});
// `host` is a role ID from revised.content.roles.
const storyboard = await nuva.storyboards.generate({script: revised.id, cast: {host: character.id}});
// One saved Prompt per clip, in clip order.
const {prompts} = await nuva.prompts.generate({storyboard: storyboard.id, ratio: '9:16'});
const job = await nuva.videos.generate({prompt: prompts[0]!.id});
const state = await nuva.jobs.get(job.id);
// Acceptance is not completion. Poll/subscribe or await job.result({timeoutMs}).
```

Brand/Product/Character records retain continuing `id`, numeric `version`, exact `revision`, typed `data` and authorized Asset sidecars. Updates take `{base,data}`; Product updates also require `brand_id`. `get(id,{version})` reads an exact historic version. `uploadImage` uploads/registers then attaches against the captured base without refetching or silently rebasing. A duplicate already-attached Asset is a no-op; stale bases still conflict. `ProductImageUploadError.asset` and `.assetId` retain the uploaded Asset when attachment fails.

Backend resource IDs are canonical GUID-shaped identifiers, including backend OrderedUUID values without RFC version/variant bits. `backendIdSchema` accepts that shape. Session/request identifiers retain their separate protocol rules.

Scripts use `script@1`; `data.text` holds a version-3 Script (`{format: 'nuva.script', version: 3, content}`, `script-v3.ts`). A Script is the idea only: concept, `duration_ms`, beats, roles (`{id, name, description, speaks}`) and panels in order, each with `on_screen`, `action`, `fact_ids`, `lines` (`{id: 'L01', speaker: role or 'narrator', mode: 'on_camera' | 'dialogue' | 'voiceover', text}`) and free-text `notes`. It has no clips, shots, timing, voices or casting. Typed readers return `format: 3` with decoded `.content`. Scripts saved before Storyboards return `format: 2` with the old ScriptPackage in `.legacy`; they are read-only and cannot get a Storyboard. Both codec directions enforce the backend 65,536-character limit. `scripts.create({content, batch_id?, relationships?})` also supports manually authored Scripts: Batch and source links are optional. The SDK validates their schema; the backend validates relationship targets and permissions. Product and Skill links identify exact Product revision and Skill version IDs. `scripts.update(ref,{content,...})` creates an immutable revision and retains inherited relationships.

Use `scripts.generate` for a direct request or ask the Agent to write and revise within a conversation.

A Storyboard (`storyboard@1`, `{format: 'nuva.storyboard', version: 1, content}`) is how a Script is shot: `{script, cast: {role: {character?, look?, voice?}}, direction, clips: [{id: 'C01', duration_ms, shots: [text]}]}`. Clips are 5–15 s. Shots are text with tokens: `{{role}}`, `{{role:<image asset id>}}`, `{{product}}`, `{{product:<image asset id>}}` and `{{L01}}`. Each clip's references are worked out from its tokens (`clipReferences`): the cast Character's default or named image, the Product's image, and the Character's voice file when `voice: 'character'`. A cast Character therefore keeps the same person in every clip. `storyboardIssues` runs the same checks the service runs.

`storyboards.generate` takes one of three inputs:

- `{script, cast?, instruction?, batch_id?}` writes a new Storyboard. `cast` is `{role: characterId}`; the writer casts the other roles. Storyboards of one Script are shot differently from each other.
- `{base, instruction, cast?}` asks the writer to revise a Storyboard.
- `{content, base?}` saves a Storyboard you wrote or edited.

Each call saves the Storyboard and returns it. `storyboards.get(ref)` returns decoded `.content`. A Storyboard pins the Product and Character revisions it was written with, and its clips are always compiled with them: a later Product or Character update does not change what an existing Storyboard renders. Revise or edit the Storyboard to use the newer ones.

The Storyboard is where variety comes from: it decides who is cast and how each clip is shot. A Prompt only has to carry one clip to the video model. `prompts.generate({storyboard, clip?, ratio?})` compiles the Storyboard's clips, or just `clip` (`'C01'`), into video Prompts and returns `{prompts}` in clip order, each a saved Prompt with its ID and `data.clip_id`. A clip compiled before from the same inputs (its shots, casting, lines, references and ratio) returns its saved Prompt instead of being compiled again; a clip of a revised Storyboard that did not change keeps its base Prompt's text. If some Prompts are saved and a later one fails, `PartialCreationError.saved` holds `{prompts}`; retry the same input with the same idempotency key to finish.

Assets have optional `label` and `description` saying what the file shows. Set them at upload, `assets.upload(file, {kind, label, description})` or `assets.register({upload_token | url, label?, description?})`; registering the same file again replaces them. Writers read them to tell a Product's images apart. An Asset's `label` is null when none was given.

`videos.generate({prompt: promptId})` renders a saved Prompt, such as one from `prompts.generate`. `input: {schema_version: 1, data: {prompt, image_asset_ids, ...}}` renders a raw prompt you wrote and saves its Prompt with the Job. Supply exactly one of `prompt` or `input`; the returned `job.prompt` identifies the Prompt rendered. Without `batch_id`, a saved Prompt's Job joins the Prompt's Batch, so Batches follow the chain Script → Storyboard → Prompt → Job; raw `input` has no implicit Batch. Reuse the same idempotency key only for retries of that operation. Jobs expose status, error and an eventual Asset. `jobs.get`, `jobs.subscribe` and `job.result` keep submission separate from completion. Stopping chat or unsubscribing does not cancel a Job. To request best-effort cancellation, ask the Agent; cancellation is only confirmed by the backend Job status.

Edit and postprocess clips in your own editor. Upload the finished video and attach its Asset reference to the same Agent Session, with any optional editing notes or structured details. The Agent handles Ad registration and returns the Ad ID. Include the source clips, trim ranges and editing settings needed to describe the final composition.

Request deadlines are separate from waiting for a video Job:

| Operation | Default request timeout |
| --- | --- |
| `storyboards.generate` (it writes every clip's shots) and `prompts.generate` (it compiles every clip) | 300 seconds |
| `scripts.generate`, `assets.register`, and uploading file bytes | 180 seconds |
| Other requests, including Script create/update, upload-intent creation, video submission, control requests and reads | 8 seconds |

Set `requestTimeoutMs` to override these request deadlines. `job.result({timeoutMs})` controls how long the client waits for completion; it does not change the Job's lifetime. Save each accepted Job ID before waiting. A timed-out write may still complete on the server: keep its operation key and inspect that operation before deciding whether to retry.

## Reads, media and operation identity

Use `assets.get`, `scripts.get(ref)`, `storyboards.get(ref)`, `prompts.get(ref)`, `jobs.get`, `ads.get/list`, `batches.get/list` and `skills.get/list/version`. Lists expose both `next_cursor` and `nextCursor`. Retain the Script, Storyboard, Asset and Job IDs returned by calls or Agent resource cards so you can read them later.

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
