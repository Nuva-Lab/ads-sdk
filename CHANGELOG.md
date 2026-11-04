# Changelog

Each entry describes the change from the previous released version.

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
- **Generated images and voices** appear in chat as `session_file` cards; `agent.files.get(id)` returns `{id, mime, label, download_url, download_url_expires_at}`.
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
