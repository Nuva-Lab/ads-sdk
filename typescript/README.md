# TypeScript SDK (0.1.0-preview.6)

`@nuva/sdk` provides Agent chat, resource management and ad-creation APIs for TypeScript applications. The full guide and API reference are at [developers.nuvalab.ai](https://developers.nuvalab.ai/api/doc); upgrading from preview.4 or preview.3 is covered on its **Upgrade to preview.5** page.

## Install

Install the SDK package supplied with your integration:

```sh
pnpm add /path/to/release/nuva-sdk-0.1.0-preview.6.tgz
```

## Connect and authenticate

```ts
import { createNuva } from '@nuva/sdk';

const nuva = createNuva({
  environment: 'production', // the default is 'sandbox' (staging)
  getAccessToken: async () => {
    const response = await fetch('/api/nuva-token');
    if (!response.ok) throw new Error('Sign-in is required.');
    return response.json(); // {token, expiresAt}, issued for the signed-in user by the same environment
  },
});
```

`environment` picks the paired Agent and API services; use tokens issued by that environment. Keep the customer Admin API key on your backend: it exchanges the key for a user token (`POST /v1/admin/tokens`), and the SDK accepts only user tokens. Use one client per signed-in user and call `nuva.close()` on logout. Tokens with an expiry are cached and renewed before they expire.

## Errors and retries

Every SDK failure is an `AdsError` (a `job.result` wait you abort rejects with your signal's reason instead), with `code`, `message`, `retryable`, `requestId`, `method` (the SDK method that failed, e.g. `products.update`) and, for validation errors only, `details` (`{path, message}`, the request's own field paths). Send us `requestId` and `method` when you report a problem.

Every write that takes an idempotency key sends one: yours, or one the SDK makes. The SDK sends a request that is safe to repeat again by itself, with the same key, after a dropped connection or `SERVICE_BUSY` (twice at most) and after a `401` once the token is renewed, never after a timeout. When a write fails with `retryable: true`, retry it yourself with the same `idempotencyKey`; pass your own key for any write you may need to retry. A wait that times out (`job.result`) is also `retryable`: wait again, don't submit again.

```ts
import { AdsError } from '@nuva/sdk';

try {
  await nuva.products.update(product, { data: { selling_points: ['Fits a car cup holder'] } });
} catch (error) {
  if (error instanceof AdsError && error.code === 'REVISION_CONFLICT') {
    // Someone saved a newer version since you read it: read it again and reapply your change.
  } else throw error;
}
```

## Product to saved video

```ts
// productPhoto, facePhoto and voiceRecording are File objects from your app.
const brand = await nuva.brands.create({ data: { name: 'Example', description: 'Outdoor gear for commuters.' } });
const photo = await nuva.assets.upload(productPhoto, { kind: 'image', label: 'Travel cup, front' });
const product = await nuva.products.create({
  brand_id: brand.id,
  data: { name: 'Travel cup', facts: ['350 ml capacity'], image_asset_ids: [photo.id] },
});
const script = await nuva.scripts.generate({
  product: { id: product.id },
  acceptable_duration_ms: { min: 8000, max: 15000 },
  instruction: 'Use only the supplied facts.',
});
const shorter = await nuva.scripts.generateFrom(script, { instruction: 'Shorten the opening.' });
// A Character keeps the same person in every clip; `host` is a role ID from the Script.
const face = await nuva.assets.upload(facePhoto, { kind: 'image', label: 'Mia, front' });
const voice = await nuva.assets.upload(voiceRecording, { kind: 'audio', label: 'Mia, voice' });
const character = await nuva.characters.create({
  data: { name: 'Mia', description: 'Late twenties, warm.', image_asset_ids: [face.id], voice_asset_id: voice.id },
});
const storyboard = await nuva.storyboards.generate({ script: shorter, cast: { host: { id: character.id } } });
// One saved Prompt per clip, in clip order.
const { prompts } = await nuva.prompts.generate({ storyboard, ratio: '9:16' });
const job = await nuva.videos.generate({ prompt: prompts[0]! });
// Acceptance is not completion: save job.id, then wait, poll jobs.get or subscribe.
const clip = await job.result({ timeoutMs: 10 * 60_000 });
```

## Scripts, Storyboards and Prompts

They never change: each method returns a new one, and the one you started from stays as it was.

- `generate` has the writer make one from scratch.
- `generateFrom(base, {instruction, …})` has the writer make one from an existing one. A Script keeps its length unless you pass `acceptable_duration_ms`; a Storyboard made this way uses the latest Product and Character versions, unless a `cast` entry's `version` pins one.
- `createFrom(base, changes)` saves your own changes to the top-level fields, after the same checks as the writer's; the rest is copied from `base`. A Storyboard made this way keeps its base's Product and Character versions. `prompts.createFrom` changes render fields only: `prompt`, the file lists, `seconds`, `ratio`.

Pass the record you hold as `base` to skip reading it again, or `{id}`. Calling a `…From` method twice on the same base gives two alternatives side by side. Only the writers create these: there is no `scripts.create` or `prompts.create`.

A Script (`format: 3`, decoded `.content`) is the idea: concept, `duration_ms`, roles and panels, each with its exact lines (`L01`, …). Scripts saved before Storyboards read as `format: 2` with `.legacy` and are read-only.

A Storyboard is how a Script is shot: `cast` (by role), `direction`, and clips of 5–15 s whose shots are text with tokens: `{{role}}`, `{{product}}`, `{{L01}}`, and any file you may use: `{{asset:<asset id>}}`, `{{role:<asset id>}}` (a file of that role's Character), `{{product:<asset id>}}`. The file tokens also work in `instruction`, and the file's own kind decides how it is used. Per clip: at least one image or video, at most 9 images, 3 videos, 3 audio files and 12 references. The service checks every Storyboard it saves; `@nuva/sdk/schemas` exports the Script and Storyboard schemas and their encode/decode functions.

`prompts.generate({storyboard, clip?, ratio?})` compiles every clip, or one (`clip: 'C01'`), and returns `{prompts}`: every clip's Prompt, or an error. Calling it again after a failure reuses the clips already compiled, and a clip compiled before from the same inputs returns its saved Prompt. A Prompt names each attached file by position: `<Picture N>` for `image_asset_ids`, `<Video N>` for `video_asset_ids`, `<Audio N>` for `audio_asset_ids`. A new Prompt that leaves a file unnamed is refused with `422 INVALID_PROMPT`, and nothing is saved or charged.

**Change what gets rendered** in its source, then compile again: change the Storyboard (`generateFrom` or `createFrom`), or update the Product or Character and make a new Storyboard from it, then call `prompts.generate`. Don't edit a compiled Prompt's text.

## Who sees what

Brands, Products and Characters belong to the user who made them, as Assets and Artifacts do. Each is private to that user and the admins above them until it is shared with a scope (`customer` for everyone, or an org or group): `shares.set(item, scope, 'read' | 'write')`, `shares.list`, `shares.remove`. Organizations that existed before preview.5 keep sharing every new Brand, Product and Character with everyone; items saved before it can be edited by everyone, but deleting or sharing them takes an admin of `customer`. Admins and scopes are set from your backend with the Go Admin SDK.

## Brands, Products and Characters

`create`, `get(id, {version?})`, `list`, and `update(record, changes)`, which sends only the fields you change (`PATCH`). A list you send replaces the whole list, `[]` empties it, `null` clears an optional value, and what you leave out keeps its value. Pass the record you read, or `{id, version}`: if someone saved a newer version since, the update fails with `REVISION_CONFLICT`. `id` stays the same across versions; `version` is the one you read.

Product media are `image_asset_ids` and `video_asset_ids` (up to 5 videos). To add a picture, upload it, then update the Product:

```ts
const side = await nuva.assets.upload(sideFile, { kind: 'image', label: 'Travel cup, side' });
const updated = await nuva.products.update(product, {
  data: { image_asset_ids: [...(product.data.image_asset_ids ?? []), side.id] },
});
```

Brands take a `description` and `attributes`, and Products a `description`; the Script writer reads them as context. `products.delete(id)` deletes a Product for everyone in your organization: what was made from it stays readable but can't be revised.

## Assets

`assets.upload(source, {kind?, label?, description?})` takes a `File` (its MIME type gives the `kind` unless you pass one) or `{url}` for a public HTTPS URL (pass `kind`, and an `idempotencyKey` to retry the fetch safely). The writers read `label` and `description` to tell files apart; `assets.update(id, {label, description})` changes them. Adding a file you already have returns the same Asset, so retrying a file upload is safe; adding it again with different text fails with `ASSET_EXISTS`. Download URLs expire (`download_url_expires_at`): read the Asset again for a fresh one.

## Videos and Jobs

`videos.generate({prompt})` renders a saved Prompt, such as one from `prompts.generate`; its Job joins the Prompt's Batch. To render text of your own, pass `input: {schema_version: 1, data}` instead, with only what the model renders from: `prompt`, `image_asset_ids`, `video_asset_ids`, `audio_asset_ids`, `seconds` (default 5) and `ratio` (default 16:9). Beside `input` or `prompt` go `seed`, `resolution` (default 768P), `batch_id` and `callback_url`. An omitted `seed` is random and returned as `job.seed`; pass it again to repeat a draw. The same naming rule applies to the text.

`jobs.get(id)`, `jobs.subscribe(id, listener)` and `job.result({timeoutMs})` read progress without submitting again; unsubscribing or a wait timing out doesn't stop the Job. `jobs.cancel(id)` stops a queued or running Job. A failed Job reads `error_code: "GENERATION_FAILED"` through `jobs.get`; `job.result` then rejects with `SERVICE_ERROR` (or `JOB_CANCELLED`), and with `CONNECTION_ERROR`, `retryable: true`, when `timeoutMs` passes first.

## Reads and lists

Lists return `Page<T>`: `{items, nextCursor}`; pass `cursor` and `limit` for the next page. Every reference is `{id}` (an entity's `{id, version?}`), or the record you read; the method implies the kind. What an Artifact was made from reads as named fields: `product`, `skill`, `script`, `storyboard`, `characters`. Also: `ads.get/list`, `batches.get/list`, `skills.get(id, {version?})/list`.

| Requests | Default deadline |
| --- | --- |
| `storyboards.generate`, `generateFrom`, `createFrom`, and `prompts.generate` | 300 s |
| `scripts.generate`, `generateFrom`, `createFrom`; an `assets.upload` transfer and its registration, each | 180 s |
| Every other request | 8 s |

`requestTimeoutMs` overrides these. A timed-out write may still complete: retry it with the same `idempotencyKey`, or read before deciding.

## Conversation and React

```ts
import { Message } from '@nuva/sdk';

const session = await nuva.sessions.create({ title: 'Travel cup launch' });
const agent = nuva.agent({ sessionId: session.id });
const unsubscribe = agent.subscribe((state) => render(state)); // state.messages is a Page of messages
await agent.send(Message.create().text('Write an ad for this product.').attach(product));
await agent.stop(); // stops the current loop only; Jobs keep running
```

A message sent while the Agent works steers it: it appears at once with `unread: true` and joins the conversation at the Agent's next step. Use `sessions.get/list/history`, `loadEarlierMessages` and `refresh` for Session state; an admin lists a user's Sessions with `sessions.list({owner})`. `@nuva/sdk/react` exports `NuvaProvider` and `useAgent`, on the same client and state.
