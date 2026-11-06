# Changelog

Each entry describes the change from the previous released version.

## Unreleased

- **Steering.** `agent.send(draft, { mode: 'steer' })` no longer gets `AGENT_BUSY` while the Agent works: the message is in `messages` at once with `unread: true`, and at the Agent's next step (after its current tool results) it joins the conversation as its own user message and loses `unread`. When no loop is running before that (it finished, failed or was stopped), it starts the next one. Without `mode`, `send` behaves as before. The Agent's reply continues in a new assistant message after messages that join it. Needs an Agent deployment with steering; older Agents reject `mode` as `INVALID_INPUT`.
- **Deleting Products.** `nuva.products.delete(id)` deletes a Product for everyone in your organization. It disappears from `products.list`, `products.get` returns `NOT_FOUND` for every version, and it can't be edited or used for new Scripts. What was already made from it stays but can't be revised: Scripts, Storyboards, Prompts, video Jobs and Ads remain readable, and saved Prompts still render with `videos.generate({prompt})`. Revising a Script or Storyboard based on it, or compiling such a Storyboard with `prompts.generate`, fails. Its images stay with whoever uploaded them; other members can no longer use them, including in their own Prompts, unless another Product or Character does. These failures say why: `NOT_FOUND` with "The product was deleted.", or `INVALID_REFERENCE` whose message names the deleted Product. Deleting can't be undone through the API, and deleting again succeeds. Needs a backend with Product deletion; an older one answers `METHOD_NOT_ALLOWED`.
- **Playground.** Send stays available while the Agent works and steers the message; user messages show one check until the Agent reads them and two after.
- **Changing a Script or Storyboard has its own methods** (breaking). `scripts.revise(ref, {instruction, acceptable_duration_ms?})` has the writer change a Script; without a range it keeps the Script's length. `storyboards.revise(ref, {instruction, cast?})` has the writer change a Storyboard, and `storyboards.update(ref, {content})` saves your edit as a new version with the same checks. `scripts.update(ref, {content})` now also goes through the Agent, so an edited Script gets the same checks and pins as a written one, and the new version keeps its base's Batch (`batch_id` is no longer taken). `scripts.revise` and `scripts.update` read the base Script first. `scripts.generate` and `storyboards.generate` only write new ones now.
- **Scripts, Storyboards and Prompts are created by the writers only** (breaking). `scripts.create`, `prompts.create`, `artifacts.create` and `artifacts.update` are removed; `artifacts` reads (`get`, `forSchema`) and `ArtifactSchema` has no `writable`. A Storyboard can no longer be saved from scratch. Raw `videos.generate({input})` still renders and saves text of your own, and `prompts.update` still saves a new Prompt version. New versions of Scripts and Storyboards are saved only through the Agent (`scripts.update`, `storyboards.update`); the backend refuses them from a user token.
- **The `directing_plan` Artifact kind is gone** from the SDK types (`ArtifactKind`, `DirectingPlan`).

**Migrating**

| Before | Now |
| --- | --- |
| `scripts.generate({product, base, acceptable_duration_ms, instruction})` | `scripts.revise(ref, {instruction, acceptable_duration_ms?})` |
| `storyboards.generate({base, instruction, cast?})` | `storyboards.revise(ref, {instruction, cast?})` |
| `storyboards.generate({base, content})` | `storyboards.update(ref, {content})` |
| `storyboards.generate({content})` (no base) | Write one with `storyboards.generate({script})`, then `storyboards.update` it |
| `scripts.create({content})` | `scripts.generate`, then `scripts.revise` or `scripts.update` |
| `prompts.create({data})` | `videos.generate({input: {schema_version: 1, data}})`, or change the Storyboard and run `prompts.generate` again |
| `artifacts.create` / `artifacts.update` | The kind's own client: `scripts`, `storyboards`, `prompts` |

The removed methods no longer exist. The old `scripts.generate({base})` and `storyboards.generate({base})` / `({content})` forms throw `INVALID_INPUT` naming the new method, before any request is sent.

To change what gets rendered, change its source (revise or update the Storyboard, or update the Product and revise the Storyboard) and run `prompts.generate` again. Don't edit a compiled Prompt's text by hand: it names each attached file by position (`<Picture 1>` is the first image), and a file the text doesn't name is ignored by the video model.

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
