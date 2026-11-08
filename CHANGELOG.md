# Changelog

Each entry describes the change from the previous released version.

## Unreleased

- **Who sees what.** Brands, Products and Characters now belong to the user who made them, as Assets and Artifacts already did. Each is private to that user and the admins above them until it is shared. Batches, Jobs and Ads are never shared.
  - Your organization is a tree of scopes: `customer` (everyone), orgs, and groups inside an org. Each user is a `member`, `admin` or `viewer` of any number of scopes, and every user is a member of `customer`.
  - An admin reads, writes, deletes and shares what users at or below their scope own. A viewer only reads it. A member reads what is shared with them.
  - A share gives everyone at or below a scope `read` (see and use) or `write` (also edit) access to one item. It never allows deleting the item or sharing it on.
  - **Name your admins.** Until you do, users see only their own work and what is shared with them. Use the Go Admin SDK (`SetMemberships` with `Scope: "customer", Role: RoleAdmin` for an admin of everyone).
  - **Existing data.** Organizations that existed before this release keep sharing every new Brand, Product and Character with everyone. Brands, Products and Characters saved before it have no owner: everyone in your organization can still read, use and edit them, as before. Deleting them or sharing them takes an admin of `customer`.
- **Go Admin SDK.** `PutScope`, `ListScopes`, `ArchiveScope`, `SetMemberships`, `GetMemberships`, `ListShares`, `SetShare` and `RemoveShare` on `AdminClient`, with the `ScopeOrg`/`ScopeGroup`, `RoleMember`/`RoleAdmin`/`RoleViewer` and `AccessRead`/`AccessWrite` constants.
- **Client Store.** `shares.list(item)`, `shares.set(item, scope, access)` and `shares.remove(item, scope)`, for an admin sharing an item from your app.
- **Sessions.** An admin opens and continues the Sessions of users below them; the Agent then acts as the Session's owner, within what both of them may do. `sessions.list({owner})` lists one such user's Sessions (`owner` is `session.owner.userId`). The Agent follows membership changes within a minute.
- **Steering.** While the Agent works, `agent.send` no longer gets `AGENT_BUSY`: the message is in `messages` at once with `unread: true`, and at the Agent's next step (after its current tool results) it joins the conversation as its own user message and loses `unread`. When no loop is running before that (it finished, failed or was stopped), it starts the next one. A message sent while the Agent recovers from an interruption joins that work instead of replacing it. The Agent's reply continues in a new assistant message after messages that join it. Every send steers, from every client (the Go Admin SDK included); `mode: 'steer'` is still accepted and changes nothing. Sending again with the same `requestId` answers with the first receipt. Needs an Agent deployment where every send steers; on an Agent with steering from before that, only a send with `mode: 'steer'` steers, and older Agents reject `mode` as `INVALID_INPUT`.
- **Deleting Products.** `nuva.products.delete(id)` deletes a Product for everyone in your organization. It disappears from `products.list`, `products.get` returns `NOT_FOUND` for every version, and it can't be edited or used for new Scripts. What was already made from it stays but can't be revised: Scripts, Storyboards, Prompts, video Jobs and Ads remain readable, and saved Prompts still render with `videos.generate({prompt})`. Revising a Script or Storyboard based on it, or compiling such a Storyboard with `prompts.generate`, fails. Its images stay with whoever uploaded them; other members can no longer use them, including in their own Prompts, unless another Product or Character does. These failures say why: `NOT_FOUND` with "The product was deleted.", or `INVALID_REFERENCE` whose message names the deleted Product. Deleting can't be undone through the API, and deleting again succeeds. Needs a backend with Product deletion; an older one answers `METHOD_NOT_ALLOWED`.
- **Playground.** Send stays available while the Agent works and steers the message; user messages show one check until the Agent reads them and two after.
- **File tokens.** Shots and `instruction` can name any file: `{{asset:<asset id>}}` for any image, video or audio Asset you may use (an upload, a registered Session file, a finished video), `{{role:<asset id>}}` and `{{product:<asset id>}}` for any file that Character or Product has. The file's own kind decides how it is used; the compiled Prompt names it as `<Picture N>`, `<Video N>` or `<Audio N>`. Per clip: at least one image or video, at most 9 images, 3 videos, 3 audio files and 12 references. A file token in `direction` is rejected; one you may not use, a Session file ID or a malformed token in `instruction` is `422` before anything is written. `storyboardIssues` and `StoryboardContext` (`product: {media}`, `characters[id]: {media, voice}`, `assets` with each file's kind) follow the same rules (breaking for code that builds a `StoryboardContext`).
- **Product videos.** `image_asset_ids` sits beside a new `video_asset_ids`: up to 5 video Asset IDs, shared like the images.
- **Prompts must name every file** (breaking, every SDK version). A new Prompt (`videos.generate({input})`, `prompts.createFrom`) must name each attached file as `<Picture N>`, `<Video N>` or `<Audio N>` (N its position in `image_asset_ids`, `video_asset_ids`, `audio_asset_ids`) and no number past its list's end; otherwise `422 INVALID_PROMPT` with `acceptance: 'not_accepted'`. Prompts saved before are not checked again.
- **`Message.attach` and `Message.quote`** take an Asset as is under strict TypeScript (its `label` is optional).
- **Grace period.** Organizations we have told are on the grace list keep their preview.4 calls (`prompts.create`, `scripts.create`, direct `scripts.update`, `storyboards.generate({content})`, Prompts that leave a file unnamed) for now; those responses carry `Deprecation: true` and a `Link` to the migration guide. It ends after notice.
- **API version 2026-11-07.** The SDK sends `Nuva-Api-Version: 2026-11-07` on every call; you don't set it. The backend answers it with the shapes below. Calls without it (SDKs up to preview.4) keep the shapes they read, for the transition only.
- **Scripts, Storyboards and Prompts never change; each method returns a new one** (breaking). `generate` has the writer make one from scratch, `generateFrom(base, {instruction, …})` has the writer make one from an existing one, and `createFrom(base, changes)` saves your own changes to the top-level fields (the rest is copied from `base`), after the same checks as the writer's. `scripts.revise` is now `scripts.generateFrom`, `scripts.update(ref, {content})` is `scripts.createFrom(base, changes)`, `storyboards.revise` is `storyboards.generateFrom`, `storyboards.update(ref, {content})` is `storyboards.createFrom(base, changes)`, and `prompts.update` is `prompts.createFrom(base, changes)`, which changes render fields only (`prompt`, the file lists, `seconds`, `ratio`). A Storyboard made with `createFrom` keeps its base's Product and Character versions; one made with `generateFrom` uses the latest. Pass the record you hold as `base` to skip reading it again.
- **Brands, Products and Characters change in place: `update(ref, changes)`** (breaking). It sends only the fields you change (`PATCH`); a list you send replaces the whole list, `[]` empties it, `null` clears an optional value, and what you leave out keeps its value. `ref` is the record you read or `{id, version}`; if someone saved a newer version since, it fails with `REVISION_CONFLICT`. `create` and `update` take an `idempotencyKey`.
- **Product media are `image_asset_ids` and `video_asset_ids`** (breaking), like every other list of files (Product data version 2; `images`/`videos` before). `products.uploadImage` is removed: `assets.upload(file, {kind: 'image', label})`, then `products.update(product, {data: {image_asset_ids: [...]}})`.
- **References are an id and a version.** Records no longer carry `revision`, and Artifact reads no longer carry `entities`: what a Script or Storyboard was made from reads as `{kind, id, version}`. A Prompt's Characters are no longer shown.
- **Raw `videos.generate({input})` takes what the model renders from, and nothing else** (breaking): `prompt`, `image_asset_ids`, `video_asset_ids`, `audio_asset_ids`, `seconds`, `ratio`. `characters`, `clip_id` and `relationships` are refused: only attached files reach the model, so attach a Character's or Product's picture and name it `<Picture N>`. An omitted `seed` is random and returned as `job.seed`; pass it again to repeat a draw. Omitted `seconds` is 5, `ratio` 16:9, `resolution` 768P.
- **Jobs.** `jobs.cancel(id)` stops a queued or running Job. A failed Job reads `error_code: "GENERATION_FAILED"` with a fixed `error` message, and `error` stays null until the Job is final. `checkpoint` is gone. Callbacks carry the same shape.
- **Assets.** `assets.upload(source, options)` takes a File or `{url}` for a public HTTPS URL; `assets.register` and `assets.uploadIntent` are removed.
- **Errors.** The backend's `UNAUTHORIZED` and `INVALID_REQUEST` are `UNAUTHENTICATED` and `INVALID_INPUT`, as the SDK names them, and every error's `details[].path` is the request's own field path.
- **`AdsError`** (breaking; was `NuvaError`, with `AdsErrorInfo` and `AdsErrorCode`). It carries `code`, `message`, `retryable`, `requestId`, `method` (the SDK method that failed, e.g. `products.update`) and, for validation errors only, `details`. Send us `requestId` and `method` when you report a problem. `acceptance` is gone: when `retryable` is true, retry; a write with the same `idempotencyKey`, which is always safe.
- **Retries.** Every write that takes an idempotency key sends one: yours, or one the SDK makes. The SDK sends a request that is safe to repeat again by itself, with the same key, after a dropped connection or `SERVICE_BUSY` (twice at most) and after a 401 once the token is renewed; never after a timeout. To retry a write yourself, pass your own key.
- **`prompts.generate` returns every clip's Prompt or an error** (breaking). `PartialCreationError` and `PARTIAL_CREATION` are gone. A call after a failure reuses the clips already compiled and compiles only the rest; to get the clips that work while one keeps failing, compile one at a time with `clip`.
- **Lists return `Page<T>`: `{items, nextCursor}`** (breaking; was `BackendPage<T>`, which also carried `next_cursor`), as the Agent's lists already did.
- **One `Skill` type** (breaking): a Skill at one version, with its files. `skills.get(id)` reads the latest version and `skills.get(id, {version})` another; `main_version` says which one new work uses; `skills.list` returns `Page<Skill>`, each at its latest version. `skills.version`, `SkillOut`, `SkillDetail` (and its `main`) and `SkillVersionOut` are removed.
- **One `Batch` type** (breaking): `batches.list` returns `Page<Batch>`, each with its Ads and Job counts as `batches.get` reads it; `BatchSummary` is removed.
- **What an Artifact was made from reads as named fields** (breaking): a Script's `product` (`{id, version}`) and `skill` (`{id, name, version}`); a Storyboard's `script` (`{id}`), `product`, `characters` and `skill`; a Prompt's `storyboard` (with `data.clip_id`) and `skill`. `relationships` and the `skills` map are gone.
- **`schemaVersion` is removed**; read `schema_version`.
- **Brands take a `description` and `attributes`, and Products a `description`**, which the Script writer reads as context. `PATCH` them like the other fields.
- **Removed:** `onTrace` and `onWireTrace` from the client options (quote an error's `requestId` and `method` instead), and the `TraceEntry` and `WireTraceEntry` types.
- **Removed:** the generic `artifacts` client (read with `scripts.get`, `storyboards.get`, `prompts.get`), `ScriptSchema`, `PromptSchema`, `PerformanceSnapshotSchema`, `defineArtifactSchema`, `ProductImageUploadError`, and from `@nuva/sdk/schemas` the generation-service schemas, the generate-input schemas, `encodeScriptPackage`/`decodeScriptPackage` and `storyboardIssues`. Ads and Batches are written by the Agent only, and their write types are no longer exported.
- **Scripts, Storyboards and Prompts are created by the writers only** (breaking). `scripts.create`, `prompts.create`, `artifacts.create` and `artifacts.update` are removed. A Storyboard can no longer be saved from scratch.
- **The `directing_plan` Artifact kind is gone** from the SDK types (`ArtifactKind`, `DirectingPlan`, `ShareableKind`, Go `ItemRef`).

**Migrating**

| Before | Now |
| --- | --- |
| `scripts.revise(ref, {instruction, acceptable_duration_ms?})` | `scripts.generateFrom(base, {instruction, acceptable_duration_ms?})` |
| `scripts.update(ref, {content})` | `scripts.createFrom(base, changes)` (only the fields you change) |
| `storyboards.revise(ref, {instruction, cast?})` | `storyboards.generateFrom(base, {instruction, cast?})` |
| `storyboards.update(ref, {content})` | `storyboards.createFrom(base, changes)` |
| `prompts.update(ref, {data})` | `prompts.createFrom(base, changes)` (render fields only) |
| `scripts.generate({product, base, …})`, `storyboards.generate({base, …})` | `generateFrom(base, …)` |
| `storyboards.generate({content})` (no base) | `storyboards.generate({script})`, then `storyboards.createFrom` |
| `scripts.create` / `prompts.create` / `artifacts.create` / `artifacts.update` | the writers (`generate`), then `createFrom` |
| `artifacts.get(ref)` / `artifacts.forSchema(schema)` | `scripts.get`, `storyboards.get`, `prompts.get` |
| `products.update({base, data, brand_id})` | `products.update(product, {data: {only changed fields}, brand_id?})` (same for Brands and Characters) |
| `data.images` / `data.videos` on a Product | `data.image_asset_ids` / `data.video_asset_ids` |
| `products.uploadImage({base, file})` | `assets.upload(file, {kind: 'image'})`, then `products.update` |
| `assets.uploadIntent` + `assets.register` | `assets.upload(file)` or `assets.upload({url})` |
| `record.revision`, `artifact.entities` | `{id, version}`; relationships read `{kind, id, version}` |
| raw input `characters`, `clip_id`, `relationships` | attach the picture and name it `<Picture N>` |
| `job.checkpoint`, parsing `job.error` | `job.error_code` |
| `NuvaError`, `NuvaErrorInfo`, `NuvaErrorCode` | `AdsError`, `AdsErrorInfo`, `AdsErrorCode` |
| `error.acceptance` | `error.retryable`; retry a write with the same `idempotencyKey` |
| Go `APIError.Acceptance` | `APIError.Retryable`: every Admin write repeats to the same result |
| `PartialCreationError`, `error.saved.prompts` | call `prompts.generate` again (finished clips are reused), or one `clip` at a time |
| `onTrace`, `onWireTrace` | `error.requestId` and `error.method` when you report a problem |
| `BackendPage<T>`, `page.next_cursor` | `Page<T>`, `page.nextCursor` |
| `skills.version(id, n)`, `SkillDetail.main`, `SkillOut`, `SkillVersionOut` | `skills.get(id, {version: n})`; a `Skill` is one version, `main_version` names the one new work uses |
| `BatchSummary` from `batches.list` | `Batch`, with `ads` and `jobs` |
| `artifact.relationships`, `artifact.skills` | `script.product`, `storyboard.script` / `product` / `characters`, `prompt.storyboard`, and `skill` |
| `artifact.schemaVersion` | `artifact.schema_version` |

The full guide, from preview.4 and from preview.3, with before-and-after code, is the docs page **Upgrade to preview.5** (`migration.html`).

To change what gets rendered, change its source (`storyboards.createFrom` or `generateFrom`, or update the Product and `generateFrom` the Storyboard) and run `prompts.generate` again. Don't edit a compiled Prompt's text by hand: it names each attached file by position (`<Picture 1>` is the first image), and a file the text doesn't name is ignored by the video model.

## 0.1.0-preview.4

Changes since `0.1.0-preview.3`.

Generation is now four steps:

```ts
const script = await nuva.scripts.generate({product: product.id, acceptable_duration_ms: {min: 8000, max: 15000}});
const storyboard = await nuva.storyboards.generate({script: script.id, cast: {host: character.id}});
const {prompts} = await nuva.prompts.generate({storyboard: storyboard.id, ratio: '9:16'});
const job = await nuva.videos.generate({prompt: prompts[0]!.id});
```

### What changed

- **Scripts are version 3.** A Script is the idea: concept, length, roles and panels with every exact line (`L01`, …). No clips, shots or casting. Read Scripts by `format`: `3` has `.content`; Scripts saved before this release are `2` with read-only `.legacy`.
- **Storyboards (new).** `storyboards.generate` / `storyboards.get`; `storyboard` is a new Artifact kind, so it also appears in resource cards and relationships. A Storyboard decides who plays each role (`cast`), the direction, and clips of 5–15 s whose shots are text with tokens (`{{host}}`, `{{product}}`, `{{L01}}`). It's where variety comes from: Storyboards of the same Script are shot differently, so you can review and pick before anything is rendered. A Storyboard pins the Product and Character versions it was written with; revise it to use newer ones.
- **Characters stay the same across clips.** A cast Character's image (and, with `voice: 'character'`, its voice) goes into every clip it appears in.
- **Prompts come from a Storyboard.** `prompts.generate({storyboard, clip?, ratio?})` replaces `{script, …}` and returns one Prompt per clip. A clip compiled before from the same inputs returns its saved Prompt and isn't charged again.
- **Video generation is unchanged:** `videos.generate({prompt})` or `{input}`. A Job from a saved Prompt now joins that Prompt's Batch automatically (Script → Storyboard → Prompts → Job).
- **Asset label and description.** `assets.upload(file, {kind, label?, description?})`. `asset.label` is now the label you set, or `null`; `Message.attach` and `Message.quote` accept such an Asset as is.
- **Waiting for renders.** Session state has an optional `waiting` (the Jobs the Agent is waiting on and an estimate); the Session stays `idle`, and `agent.stop()` cancels the wait.
- **Errors.** A rejected write now says `acceptance: 'not_accepted'` (it didn't happen; retrying is safe); `unknown` still means it may have happened. If `prompts.generate` fails partway, `PartialCreationError.saved.prompts` holds the clips already saved; retry with the same key to finish the rest.
- **Deadlines.** `storyboards.generate` and `prompts.generate` default to 300 s.
- **`@nuva/sdk/schemas`** exports the Script and Storyboard schemas, their encode/decode functions and `storyboardIssues`.

### Migrating from 0.1.0-preview.3

1. Replace `prompts.generate({script, …})` with `storyboards.generate({script})` then `prompts.generate({storyboard, ratio})`. Pass the shooting instruction to `storyboards.generate`; drop `instruction` and `batch_id` from `prompts.generate`.
2. Keep `videos.generate({prompt})` for each Prompt; you no longer need `batch_id` to keep it in the Batch.
3. Read Scripts by `format` (`.content` for 3, `.legacy` for 2). Write your own Scripts as v3.
4. Handle `asset.label === null`.
5. If you set `requestTimeoutMs`, allow 300 s for `storyboards.generate` and `prompts.generate`.

### 中文说明

相对 `0.1.0-preview.3` 的变化。

生成流程现在分四步：脚本 → 分镜 → 提示词 → 视频（示例代码同上）。

**主要变化**

- **脚本升级到第 3 版。** 脚本只描述创意：概念、时长、角色，以及每一格的完整台词（`L01` 等）。不再包含片段、镜头或选角。按 `format` 读取脚本：`3` 用 `.content`；本版本之前保存的脚本为 `2`，通过只读的 `.legacy` 读取。
- **分镜（新增）。** `storyboards.generate` / `storyboards.get`；`storyboard` 是新的 Artifact 类型，也会出现在资源卡片和关联关系中。分镜决定谁出演每个角色（`cast`）、整体导演方向，以及 5–15 秒的片段，片段中的镜头是带标记的文字（`{{host}}`、`{{product}}`、`{{L01}}`）。多样性来自分镜：同一个脚本的不同分镜会用不同方式拍摄，你可以在渲染前比较和挑选。分镜会锁定写作时所用的商品和角色版本；要使用新版本，请修订分镜。
- **角色在各片段中保持一致。** 被选角的角色形象（以及设置 `voice: 'character'` 时的声音）会进入它出现的每一个片段。
- **提示词由分镜生成。** `prompts.generate({storyboard, clip?, ratio?})` 取代 `{script, …}`，每个片段返回一条提示词。输入相同、之前编译过的片段直接返回已保存的提示词，不会重复计费。
- **视频生成不变：** `videos.generate({prompt})` 或 `{input}`。由已保存提示词创建的视频任务会自动加入该提示词所在的批次（脚本 → 分镜 → 提示词 → 任务）。
- **素材标签与描述。** `assets.upload(file, {kind, label?, description?})`。`asset.label` 现在是你设置的标签，未设置时为 `null`；`Message.attach` 和 `Message.quote` 可以直接使用这样的素材。
- **等待渲染。** 会话状态新增可选的 `waiting`（Agent 正在等待的视频任务及预计完成时间）；等待期间会话保持 `idle`，`agent.stop()` 可取消等待。
- **错误。** 被拒绝的写入现在带有 `acceptance: 'not_accepted'`（没有执行，可以安全重试）；`unknown` 仍表示可能已经执行。如果 `prompts.generate` 中途失败，`PartialCreationError.saved.prompts` 包含已保存的片段；用同一个幂等键重试即可完成其余部分。
- **超时。** `storyboards.generate` 和 `prompts.generate` 默认 300 秒。
- **`@nuva/sdk/schemas`** 导出脚本和分镜的 schema、编解码函数以及 `storyboardIssues`。

**从 0.1.0-preview.3 迁移**

1. 把 `prompts.generate({script, …})` 改为先 `storyboards.generate({script})`，再 `prompts.generate({storyboard, ratio})`。拍摄要求传给 `storyboards.generate`；`prompts.generate` 不再接受 `instruction` 和 `batch_id`。
2. 每条提示词继续用 `videos.generate({prompt})`；不再需要传 `batch_id` 来保持在同一批次。
3. 按 `format` 读取脚本（`3` 用 `.content`，`2` 用 `.legacy`）。自己编写的脚本请使用第 3 版。
4. 处理 `asset.label === null` 的情况。
5. 如果设置了 `requestTimeoutMs`，请为 `storyboards.generate` 和 `prompts.generate` 留出 300 秒。
