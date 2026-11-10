# Changelog

Each entry describes the change from the previous released version.

## Unreleased

### Fixed

- **A failed token refresh no longer stops the Agent connection for good** ([#28](https://github.com/Nuva-Lab/ads-sdk/issues/28)).
  - If `getAccessToken` fails while the current token is still valid, the SDK keeps using that token and tries again, at least a second apart, until it expires; the connection stays open. Throwing from `getAccessToken` therefore no longer ends access at once: to sign a user out, call `client.close()`.
  - If the token expires before a refresh succeeds, the connection stops; it comes back on its own once `getAccessToken` returns a valid token for the same user (fetched by any request), and subscribes to its Sessions again.
  - If the service refuses a token on the connection, the SDK drops it and never reconnects with it. It reconnects on your next Agent call (such as `agent.refresh()`) once `getAccessToken` returns a different token; other requests don't reconnect it.
  - An Agent opened after such a failure recovers through its own calls, and a token change the service doesn't acknowledge reconnects instead of failing.

## 0.1.0-preview.5

Changes since `0.1.0-preview.4`. This SDK needs the services released with it. Your preview.4 integration keeps working until you upgrade; the services answer it as before.

The full upgrade guide, with before-and-after code, is the docs page **Upgrade to preview.5** (`migration.html`). It also covers upgrading from preview.3.

### What changed

- **Scripts, Storyboards and Prompts never change; each method returns a new one** (breaking).
  - `generate` has the writer make one from scratch.
  - `generateFrom(base, {instruction, …})` has the writer change one (a Script keeps its length without a range).
  - `createFrom(base, changes)` saves your own edit, with only the fields you change; a Storyboard edit gets the same checks as a written one.
  - `prompts.createFrom(base, changes)` takes render fields only.
- **Scripts, Storyboards and Prompts are created by the writers only** (breaking). `scripts.create`, `prompts.create` and the `artifacts` client are removed. To render text of your own, use `videos.generate({input})`.
- **Brands, Products and Characters change in place: `update(record, changes)`** (breaking). Send only the fields you change; a list replaces the whole list and `null` clears a value. Pass the record you read (or `{id, version}`): if someone saved a newer version, it fails with `REVISION_CONFLICT`.
- **Product media are `image_asset_ids` and `video_asset_ids`** (breaking; were `images` and `videos`). Products take up to 5 videos. `products.uploadImage` is removed: upload with `assets.upload`, then `update`.
- **Assets.** `assets.upload(file)` or `assets.upload({url})`, with a `label` and `description` the writers read; `assets.update(id, {label, description})` changes them. Adding a file you already have with different text fails with `ASSET_EXISTS`.
- **References are `{id, version?}`**: `scripts.generate({product: {id}})` and Storyboard `cast`. Leave `version` out for the current one. Records no longer carry `revision`.
- **Raw `videos.generate({input})` takes what the model renders from**: `prompt`, the file lists, `seconds`, `ratio`. `characters` is gone: attach the picture and name it in the text. An omitted `seed` is random, and the Job returns it.
- **Prompts must name every file** (breaking, every SDK version). A new Prompt's text names each attached file as `<Picture N>`, `<Video N>` or `<Audio N>`, by its position in its list; otherwise `422 INVALID_PROMPT`, and nothing is saved or charged.
- **`prompts.generate` returns every clip's Prompt or an error** (breaking). Calling again after a failure reuses the clips already compiled; `clip` compiles one at a time.
- **Errors: `AdsError`** (breaking; was `NuvaError`). It carries `code`, `message`, `retryable`, `requestId`, `method` and, for validation errors, `details`. Send us `requestId` and `method` when you report a problem. When `retryable` is true, retry; a write with the same `idempotencyKey`, which is always safe. `acceptance`, `PartialCreationError`, `onTrace` and `onWireTrace` are gone.
- **Retries.** The SDK makes an idempotency key for every write that takes one, and sends a request that is safe to repeat again by itself after a dropped connection or `SERVICE_BUSY`. To retry a write yourself, pass your own key.
- **Lists return `Page<T>`**: `{items, nextCursor}` (was `BackendPage`, which also had `next_cursor`).
- **One type per resource.** A `Skill` is one version (`skills.get(id, {version?})`; `skills.version` is gone); `batches.list` returns full `Batch`es.
- **What an Artifact was made from reads as named fields**: `product`, `skill`, `script`, `storyboard`, `characters`, instead of `relationships`. `schemaVersion` is gone; read `schema_version`.
- **Brands take a `description` and `attributes`, and Products a `description`**, which the Script writer reads as context.
- **One reference shape.** Every reference is `{id}` (an entity's `{id, version?}`), or the record you read; the method implies the kind.
- **Jobs.** `jobs.cancel(id)`. A failed Job reads `error_code: "GENERATION_FAILED"` with a fixed message.
- **Use any file in a shot.** `{{asset:<id>}}`, `{{role:<id>}}` and `{{product:<id>}}`, in shots and in `instruction`.
- **Steering.** While the Agent works, `agent.send` no longer gets `AGENT_BUSY`: the message shows at once (`unread: true`) and joins at the Agent's next step.
- **Deleting Products.** `products.delete(id)`. What was made from the Product stays readable, and its saved Prompts still render.
- **Who sees what.** New Brands, Products and Characters belong to the user who made them; ones saved before this release stay editable by everyone in your organization. Admins share items with `shares.set` and the Go Admin SDK's scope, membership and share methods.

### Grace period

If we've told you your organization is on the grace list, these preview.4 calls keep working for now, while you upgrade: `prompts.create`, `scripts.create`, direct `scripts.update`, `storyboards.generate({content})`, and Prompts that leave a file unnamed (saved as before). Those responses carry `Deprecation: true` and a `Link` to the upgrade guide. The grace period ends after we tell you.

### Upgrading from 0.1.0-preview.4

| Before | Now |
| --- | --- |
| `scripts.generate({product, base, …, instruction})` | `scripts.generateFrom(base, {instruction})` |
| `scripts.update(ref, {content})` | `scripts.createFrom(base, changes)` |
| `storyboards.generate({base, instruction})` | `storyboards.generateFrom(base, {instruction})` |
| `storyboards.generate({base, content})` | `storyboards.createFrom(base, changes)` |
| `storyboards.generate({content})` | `storyboards.generate({script})`, then `storyboards.createFrom` |
| `prompts.create({data})` | `videos.generate({input: {schema_version: 1, data}})` |
| `prompts.update(ref, {data})` | `prompts.createFrom(base, changes)` |
| `products.update({base, brand_id, data})` | `products.update(product, {data: {changed fields}})` (also Brands, Characters) |
| `data.images` / `data.videos` | `data.image_asset_ids` / `data.video_asset_ids` |
| `products.uploadImage`, `assets.uploadIntent` + `assets.register` | `assets.upload(file)`, then `update` |
| `scripts.generate({product: id})`, `cast: {role: id}` | `{product: {id}}`, `cast: {role: {id}}` |
| raw input `characters`, `clip_id` | attach the picture and name it `<Picture N>` |
| `NuvaError` | `AdsError` |
| `error.acceptance` | `error.retryable`, and the same `idempotencyKey` |
| Go `APIError.Acceptance` | `APIError.Retryable` |
| `PartialCreationError` | call `prompts.generate` again |
| `BackendPage<T>`, `page.next_cursor` | `Page<T>`, `page.nextCursor` |
| `skills.version(id, n)` | `skills.get(id, {version: n})` |
| `artifact.relationships` | `product`, `skill`, `script`, `storyboard`, `characters` |
| `job.checkpoint`, parsing `job.error` | `job.error_code` |
| `scripts.get({kind, id})`, `{script: id}`, `{storyboard: id}`, `{prompt: id}` | `{id}`, or the record you read |
| `baseUrl`, `storeBaseUrl`, `generationBaseUrl` | `environment` |

Checklist:
1. Install the preview.5 archive, and Go `v0.1.0-preview.5` if you use the Go Admin SDK.
2. Replace the calls in the table; TypeScript flags most of them.
3. Make raw Prompt text name every attached file, and handle `422 INVALID_PROMPT`.
4. If you're on the grace list, log `Deprecation` response headers until none are left.

To change what gets rendered, change the Storyboard or the Product and run `prompts.generate` again. Don't edit a compiled Prompt's text.

## 0.1.0-preview.4

Changes since `0.1.0-preview.3`.

Generation is now four steps:

```ts
const script = await nuva.scripts.generate({product: product.id, acceptable_duration_ms: {min: 8000, max: 15000}});
const storyboard = await nuva.storyboards.generate({script, cast: {host: {id: character.id}}});
const {prompts} = await nuva.prompts.generate({storyboard, ratio: '9:16'});
const job = await nuva.videos.generate({prompt: prompts[0]!});
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
