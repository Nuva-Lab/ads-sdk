# Changelog

Each entry describes the change from the previous released version.

## Unreleased

Changes since `0.1.0-preview.7`. This SDK works with the services already live, and the API version is unchanged (`2026-11-07`). Most integrations need no change; TypeScript may flag code that sends a value it read, see **Upgrade to preview.8** in the docs' upgrade guide (`migration.html#preview8`).

### Changed

- **A value the backend adds no longer breaks the SDK.** This SDK reads a response that has a field, or an enum value, it doesn't know, and keeps it in what it returns. preview.3 to preview.7 fail the whole read with `SERVICE_ERROR` instead, for example preview.6 on a `document` Asset. What you send is checked as before: an unknown value or field is refused with `INVALID_INPUT`, and nothing is sent. A value added after this SDK means:
  - **A Job `status`** other than `queued`, `running`, `completed`, `failed` or `cancelled`: the Job hasn't ended. `jobs.subscribe` keeps watching and a Job's `result()` keeps waiting (up to its `timeoutMs`), as for `running`. A Job ends `completed`, `failed` or `cancelled`.
  - **An Asset `kind`** other than `image`, `video`, `audio` or `document`: a file you can download (`download_url`) that this SDK doesn't know how to show. Treat it as you treat a `document`.
  - **A share's `access`**, or an auto-share rule's, other than `read` or `write`: the item is shared with that scope, with rights this SDK doesn't know.
  - **An Asset's `source`, a Job callback's `status` or a Prompt's `ratio`:** a value to show as it is. `prompts.createFrom` keeps the base Prompt's `ratio` when you don't change it.
- **Types:** what you read is typed open, for example `Asset['kind']` is `'image' | 'video' | 'audio' | 'document' | (string & {})`; so are `JobState['status']`, an Asset's `source`, a callback's `status`, a Prompt's `ratio`, and `Share['access']` and `AutoShare` rules (the new `SharedAccess`). What you send stays closed: the `kind` of `assets.upload` is the new `AssetKind`, `shares.set` and `shares.setAutoShare` take `ShareAccess`, and `PromptChanges['ratio']` is a ratio this SDK knows. `AutoShare` is now a type alias rather than an interface.
- `backendSchema` (`@nuva/sdk/schemas`) still checks strictly, as the SDK checks what it sends.
- Script and Storyboard content (`script.content`, `storyboard.content`, decoded from `data.text`) is versioned on its own (`nuva.script` version 3, `nuva.storyboard` version 1) and is still read strictly: a change to it comes with a new version.

### Playground

- A document, or an Asset of a kind added later, shows as a link to the file instead of a video player.

### 中文说明

相对 `0.1.0-preview.7` 的变化。所需服务均已上线，API 版本不变（`2026-11-07`）。大多数集成无需修改；如果代码把读到的值再发送出去，TypeScript 可能会报错，见文档升级指南中的 **升级到 preview.8**（`migration.html#preview8`）。

**变更：**

- **后端新增的值不再导致 SDK 出错。**本 SDK 读取响应时，遇到不认识的字段或枚举值会照常读取，并在返回结果中保留它。preview.3 至 preview.7 会因此整个读取失败并报 `SERVICE_ERROR`，例如 preview.6 读取 `document` Asset。发送的内容仍按原样检查：不认识的值或字段会以 `INVALID_INPUT` 拒绝，且不会发送任何请求。本 SDK 之后新增的值含义如下：
  - **任务 `status`** 不是 `queued`、`running`、`completed`、`failed` 或 `cancelled`：任务尚未结束。`jobs.subscribe` 会继续监听，任务的 `result()` 会继续等待（直到 `timeoutMs`），与 `running` 相同。任务最终以 `completed`、`failed` 或 `cancelled` 结束。
  - **Asset `kind`** 不是 `image`、`video`、`audio` 或 `document`：一个可以下载（`download_url`）、但本 SDK 不知道如何展示的文件。请按 `document` 的方式处理。
  - **共享的 `access`**（或自动共享规则的 access）不是 `read` 或 `write`：该内容已共享给这个范围，具体权限本 SDK 不了解。
  - **Asset 的 `source`、任务回调的 `status` 或提示词的 `ratio`：**按原样展示即可。你不修改 `ratio` 时，`prompts.createFrom` 会保留基础提示词的 `ratio`。
- **类型：**读取到的值使用开放类型，例如 `Asset['kind']` 为 `'image' | 'video' | 'audio' | 'document' | (string & {})`；`JobState['status']`、Asset 的 `source`、回调的 `status`、提示词的 `ratio`，以及 `Share['access']` 和 `AutoShare` 规则（新的 `SharedAccess`）同样如此。发送的值仍是封闭类型：`assets.upload` 的 `kind` 为新的 `AssetKind`，`shares.set` 和 `shares.setAutoShare` 接收 `ShareAccess`，`PromptChanges['ratio']` 只能是本 SDK 认识的比例。`AutoShare` 由 interface 改为类型别名。
- `backendSchema`（`@nuva/sdk/schemas`）仍按严格方式检查，与 SDK 检查发送内容的方式相同。
- 脚本和分镜的内容（`script.content`、`storyboard.content`，由 `data.text` 解码）有各自的版本（`nuva.script` 第 3 版、`nuva.storyboard` 第 1 版），仍按严格方式读取：内容格式的变化会随新版本一起发布。

**Playground：**文档，以及之后新增类型的 Asset，显示为文件链接，而不是视频播放器。

## 0.1.0-preview.7

Changes since `0.1.0-preview.6`. This SDK works with the services already live, and the API version is unchanged (`2026-11-07`). Most integrations need no change; see **Upgrade to preview.7** in the docs' upgrade guide (`migration.html#preview7`).

### Added

- **Documents the Agent reads:** PDF (up to 50 MB), Word and Excel (`.docx` / `.xlsx`, up to 30 MB). An Asset's `kind` can be `document`. Older SDKs can't read a document Asset, so upgrade everyone in your organization before your users upload documents.
- **Auto-share rules per scope** ([#48](https://github.com/Nuva-Lab/ads-sdk/issues/48)): `shares.setAutoShare` and Go `SetAutoShare`. The old organization-wide setting is now a `read` rule on `customer`, so nothing changes.
- **Delete a user** (Go): `DeleteUser`. Afterwards, a token or memberships for that ID return `409 USER_DELETED`; what they made stays.
- **Archive Sessions** ([#35](https://github.com/Nuva-Lab/ads-sdk/issues/35)): `sessions.archive` / `sessions.unarchive`, and `sessions.list({ archived: true })`.
- **Archive Skills:** `ArchiveSkill` / `UnarchiveSkill`, and `skills.list({ archived: true })`.

### Changed

- `fact_product_tags` and `fact_product_video_requirements` are gone from the Script types.

### Fixed

- A Session's first message no longer fails with "No acknowledgement received" ([#44](https://github.com/Nuva-Lab/ads-sdk/issues/44)): Agent requests wait 30 s for their answer.
- Skills you register are used in Agent conversations ([#36](https://github.com/Nuva-Lab/ads-sdk/issues/36)).
- The Agent no longer gives links or file paths that don't work; it writes the text in full in its reply ([#51](https://github.com/Nuva-Lab/ads-sdk/issues/51)).
- Image uploads go up to 30 MB, from 10 MB ([#47](https://github.com/Nuva-Lab/ads-sdk/issues/47)). An image over 2048 px or 5 MB is stored as a WebP copy at that size.

### 中文说明

相对 `0.1.0-preview.6` 的变化。所需服务均已上线，API 版本不变（`2026-11-07`）。

**新增：**

- **Agent 可阅读的文档：**PDF（最大 50 MB）、Word 和 Excel（`.docx` / `.xlsx`，最大 30 MB）。Asset 的 `kind` 可能为 `document`。旧版 SDK 无法读取文档 Asset，请在用户上传文档前让组织内所有人升级。
- **按范围的自动共享规则**（#48）：`shares.setAutoShare` 和 Go 的 `SetAutoShare`。原有的组织级设置已转为 `customer` 上的 `read` 规则，行为不变。
- **删除用户**（Go）：`DeleteUser`。之后为该 ID 申请令牌或设置成员关系会返回 `409 USER_DELETED`；其创建的内容会保留。
- **归档 Session**（#35）：`sessions.archive` / `sessions.unarchive`，以及 `sessions.list({ archived: true })`。
- **归档 Skill：**`ArchiveSkill` / `UnarchiveSkill`，以及 `skills.list({ archived: true })`。

**修复：**

- Session 首条消息不再报 "No acknowledgement received"（#44）：Agent 请求的等待时间改为 30 秒。
- 你注册的 Skill 会用于 Agent 对话（#36）。
- Agent 不再给出无法使用的链接或文件路径，而是在回复中直接给出全文（#51）。
- 图片上传上限由 10 MB 提高到 30 MB（#47）。超过 2048 像素或 5 MB 的图片会以该尺寸的 WebP 副本保存。

**变更：**脚本类型中移除了 `fact_product_tags` 和 `fact_product_video_requirements`。

## 0.1.0-preview.6

Changes since `0.1.0-preview.5`. This SDK works with the services already live; it needs no service release, and the API version is unchanged (`2026-11-07`). Upgrading from preview.5 needs no code change, except if you relied on a throwing `getAccessToken` to sign a user out (see below). Coming from an earlier preview, follow **Upgrade to preview.5** (`migration.html`) and install this version.

### Fixed

- **A failed token refresh no longer stops the Agent connection for good** ([#28](https://github.com/Nuva-Lab/ads-sdk/issues/28)).
  - If `getAccessToken` fails while the current token is still valid, the SDK keeps using that token and tries again, at least a second apart, until it expires; the connection stays open. Throwing from `getAccessToken` therefore no longer ends access at once: to sign a user out, call `client.close()`.
  - If the token expires before a refresh succeeds, the connection stops; it comes back on its own once `getAccessToken` returns a valid token for the same user (fetched by any request), and subscribes to its Sessions again.
  - If the service refuses a token on the connection (`UNAUTHENTICATED`, or `FORBIDDEN` for a token of another user), the SDK drops it and never reconnects with it. It reconnects on your next Agent call (such as `agent.refresh()`) once `getAccessToken` returns a different token; other requests don't reconnect it.
  - Any other failure, such as the service being unable to check a token right now (for example while its signing keys reload), keeps the token, and the connection reconnects with it.
  - An Agent opened after such a failure recovers through its own calls, and a token change the service doesn't acknowledge reconnects instead of failing.

### Playground

- **Reference files.** Chat has **Upload reference files** beside **@**: images (PNG, JPEG, WebP), MP4 videos or audio (MP3, WAV, M4A), each with an optional label and description, attached to your next message. In the Storyboard editor, **Insert… › Upload a file…** uploads one and names it with `{{asset:<id>}}` at the cursor ([#29](https://github.com/Nuva-Lab/ads-sdk/issues/29)).
- **Remote machines.** `NUVA_PLAYGROUND_BRIDGE_PORT` fixes the local port the page uses to reach the services, so a playground on a remote machine works when you forward that port with the playground port.

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
