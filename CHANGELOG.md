# Changelog

Each entry describes the change from the previous released version.

## 0.1.0-preview.4

Changes since `0.1.0-preview.3`.

Generation now has four steps: a Script (the idea), a Storyboard (how it is shot), Prompts (each clip compiled for the video model), then one video Job per Prompt.

```ts
const script = await nuva.scripts.generate({product: product.id, acceptable_duration_ms: {min: 8000, max: 15000}});
const storyboard = await nuva.storyboards.generate({script: script.id, cast: {host: character.id}});
const {prompts} = await nuva.prompts.generate({storyboard: storyboard.id, ratio: '9:16'});
const job = await nuva.videos.generate({prompt: prompts[0]!.id});
```

### Scripts are version 3

- A new Script is the idea only: concept, length, beats, roles and panels with every exact line (`{id: 'L01', speaker, mode, text}`). It has no clips, shots, timing, voices or casting; the Storyboard decides those.
- Typed Script reads return `format: 3` with `.content`. Scripts saved before this release return `format: 2` with the old ScriptPackage in `.legacy`. They stay readable but cannot be revised or get a Storyboard.
- `scripts.create` and `scripts.update` take Script v3 `content`.
- `@nuva/sdk/schemas` exports the Script v3 and Storyboard codecs and checks (`scriptSchema`, `storyboardSchema`, `storyboardIssues`, `clipReferences` and others).

### Storyboards

- New `storyboards.generate` and `storyboards.get`. A Storyboard says who plays each role (`cast`), one `direction` for the whole video, and clips of 5–15 s whose shots are text with tokens (`{{host}}`, `{{product}}`, `{{L01}}`, …).
- Three forms: `{script, cast?, instruction?, batch_id?}` writes a new Storyboard, `{base, instruction, cast?}` revises one, and `{content, base?}` saves one you wrote or edited. Each saves the Storyboard and returns it.
- The Storyboard is where variety comes from. Several Storyboards for the same Script, casting and instruction are shot differently from each other (format, setting, camera, pacing, opening shot). That is why it is part of the API: you can review, choose and edit how an ad is shot before any clip is compiled or rendered.

### Prompts are compiled from a Storyboard

- `prompts.generate` now takes `{storyboard, clip?, ratio?}` instead of `{script, instruction?, ratio?, batch_id?}`. It returns `{prompts}` in clip order, one saved Prompt per clip, each with `data.clip_id`. Pass `clip: 'C01'` for one clip.
- A Prompt only has to fit its Storyboard and the video model; the creative choices are made in the Storyboard.
- A clip compiled before from the same inputs returns its saved Prompt and is not compiled or charged again. In a revised or edited Storyboard, a clip that did not change keeps the text of its base clip's Prompt, if that one was compiled.
- `PartialCreationError.saved` is still `{prompts}`; those Prompts are now based on the Storyboard.

### Video generation

- Unchanged in shape: `videos.generate({prompt})` with a saved Prompt ID, or `videos.generate({input})` with a raw prompt.

### Characters and casting

- Cast a Character in a Storyboard with `cast: {role: characterId}`. Every clip it appears in gets the same image as a reference, and with `voice: 'character'` the same voice recording, so the person looks and sounds the same across clips. Roles left out are cast by the writer.

### Asset label and description

- `assets.upload(file, {kind, label, description})` and `assets.register({..., label?, description?})` say what a file shows. The writers read them to tell a Product's images apart. Registering the same file again replaces them.
- An Asset's `label` is now its own label, or null when none was given; it is no longer a display label.

### Deadlines

- `storyboards.generate` and `prompts.generate` default to 300 seconds. `scripts.generate`, `assets.register` and file uploads stay at 180 seconds; other requests at 8 seconds.

### Migrating from 0.1.0-preview.3

1. Replace `prompts.generate({script, ...})` with `storyboards.generate({script})`, then `prompts.generate({storyboard: storyboard.id, ratio})`. Move `ratio` to `prompts.generate`; drop `instruction` and `batch_id` there (a Storyboard keeps its Script's Batch, and `storyboards.generate` takes the shooting instruction).
2. Keep calling `videos.generate({prompt: prompt.id})` for each returned Prompt.
3. Read Scripts through `format`: use `.content` for `format: 3` and `.legacy` for `format: 2`. Write a new Script for a product whose only Scripts are `format: 2`.
4. Write Scripts you author yourself as Script v3 for `scripts.create` and `scripts.update`.
5. If you displayed `asset.label`, fall back to the Asset ID when it is null.
6. If you set `requestTimeoutMs`, check it allows 300 seconds for `storyboards.generate` and `prompts.generate`.
