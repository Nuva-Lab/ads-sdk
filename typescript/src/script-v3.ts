/**
 * Script v3 and Storyboard v1.
 *
 * A Script is the idea a customer approves: concept, beats, roles, and the story as one sequence of panels with the
 * exact lines each role speaks and a target length. It has no clips: where the story is cut into separately rendered
 * clips is a Storyboard decision.
 *
 * A Storyboard is how the Script is shot: who plays each role (`cast`), one `direction` for the whole video, and its
 * clips, each a list of shots written as text. Shots name people, the Product, other files and Script lines with tokens:
 *
 *   {{host}}             the role host, as cast (a cast Character's default image, its first)
 *   {{host:<asset id>}}  the role host, with that file of its Character
 *   {{product}}          the Product (its default image, its first)
 *   {{product:<id>}}     that file of the Product
 *   {{asset:<id>}}       any image, video or audio Asset the user may use
 *   {{L04}}              Script line L04, spoken by its speaker
 *
 * A token never names a kind: the Asset's own kind (image, video, audio) decides it. The references each clip renders
 * with are worked out from its tokens (`clipReferences`), so a cast Character's image and voice go into every clip it
 * appears or speaks in.
 */
import { z } from 'zod';
import { CATEGORIES, MAX_CLIP_MS, MAX_REFERENCES, MAX_VIDEO_ASSETS, MIN_CLIP_MS, SPEECH_MODES, factId, factSchema, imageSchema } from './service-schemas.js';
import { backendIdPattern, backendIdSchema } from './backend-id.js';

const text = z.string().max(32000);
const issue = (ctx: z.RefinementCtx, path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
const duplicates = (values: readonly string[]) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

// ── Script v3 ────────────────────────────────────────────────────────────

/** A speaker who is not a role: an unseen narrator. On screen, `product` stands for the Product; `asset` names any file. */
export const NARRATOR = 'narrator',
	PRODUCT = 'product',
	ASSET = 'asset';
export const ROLE_ID = /^[a-z][a-z0-9_]{0,39}$/,
	LINE_ID = /^L\d{2,3}$/;
const roleId = z
	.string()
	.regex(ROLE_ID, 'Role IDs are lowercase words, e.g. presenter or son.')
	.refine((value) => value !== NARRATOR && value !== PRODUCT, 'narrator and product are reserved.');
const beatId = z.string().regex(/^B\d{2}$/, 'Beat IDs use B01, B02, ...');
const panelId = z.string().regex(/^P\d{2,3}$/, 'Panel IDs use P01, P02, ...');
const lineId = z.string().regex(LINE_ID, 'Line IDs use L01, L02, ...');
/** The longest story a Script can hold: as many full clips as a Storyboard can have. */
export const MAX_CLIPS = 30,
	MAX_SCRIPT_MS = MAX_CLIPS * MAX_CLIP_MS;

export const conceptSchema = z
	.object({
		name: text.min(1),
		category: z.enum(CATEGORIES),
		purchase_task: text.min(1),
		proposition: text.min(1),
		route: text.min(1),
		route_reason: text,
		speaker_relation: text,
	})
	.strict();
/** A role is who someone is in the idea (age range, relationship, persona), not how they look or who plays them. */
export const roleSchema = z.object({ id: roleId, name: text.min(1), description: text.min(1), speaks: z.boolean() }).strict();
export const lineSchema = z
	.object({ id: lineId, speaker: z.union([roleId, z.literal(NARRATOR)]), mode: z.enum(SPEECH_MODES), text: text.min(1) })
	.strict()
	.describe('Exact words. A narrator line is voiceover; an on-camera or dialogue speaker must be on screen in the panel.');
export const panelSchema = z
	.object({
		id: panelId,
		beat_id: beatId,
		on_screen: z.array(z.union([roleId, z.literal(PRODUCT)])).max(20),
		action: text.min(1),
		fact_ids: z.array(factId),
		lines: z.array(lineSchema).max(20),
		notes: text.describe('Anything else the moment needs, in words: on-screen text with its exact words, an effect, a request.'),
	})
	.strict();
/** What the Script writer authors. */
export const scriptGenerationSchema = z
	.object({
		schema_version: z.literal(3),
		concept: conceptSchema,
		duration_ms: z.number().int().min(MIN_CLIP_MS).max(MAX_SCRIPT_MS).describe('The target length of the whole ad.'),
		beats: z.array(z.object({ id: beatId, purpose: text.min(1), fact_ids: z.array(factId) }).strict()).min(1).max(30),
		roles: z.array(roleSchema).max(20),
		panels: z.array(panelSchema).min(1).max(60),
	})
	.strict();
type ScriptShape = z.infer<typeof scriptGenerationSchema> & { facts?: readonly { id: string }[] };
function scriptChecks(value: ScriptShape, ctx: z.RefinementCtx) {
	for (const key of ['beats', 'roles', 'panels'] as const)
		for (const repeated of duplicates(value[key].map((item) => item.id))) issue(ctx, [key], `Duplicate ID ${repeated}.`);
	for (const repeated of duplicates(value.panels.flatMap((panel) => panel.lines.map((line) => line.id)))) issue(ctx, ['panels'], `Line ID ${repeated} is used twice.`);
	const roles = new Map(value.roles.map((role) => [role.id, role]));
	const beats = new Map(value.beats.map((beat, index) => [beat.id, index]));
	const facts = value.facts === undefined ? undefined : new Set(value.facts.map((fact) => fact.id));
	const unknownFacts = (ids: readonly string[]) => facts !== undefined && ids.some((id) => !facts.has(id));
	const used = new Set<string>();
	let last = 0;
	value.beats.forEach((beat, index) => unknownFacts(beat.fact_ids) && issue(ctx, ['beats', index, 'fact_ids'], 'Unknown fact ID.'));
	value.panels.forEach((panel, p) => {
		const path = ['panels', p];
		const beat = beats.get(panel.beat_id);
		if (beat === undefined) issue(ctx, [...path, 'beat_id'], 'Unknown beat ID.');
		else {
			if (beat < last) issue(ctx, [...path, 'beat_id'], 'Panels follow beat order.');
			last = beat;
			used.add(panel.beat_id);
		}
		panel.on_screen.forEach((who, i) => who !== PRODUCT && !roles.has(who) && issue(ctx, [...path, 'on_screen', i], `Unknown role ${who}.`));
		if (unknownFacts(panel.fact_ids)) issue(ctx, [...path, 'fact_ids'], 'Unknown fact ID.');
		panel.lines.forEach((line, i) => {
			const at = [...path, 'lines', i];
			if (line.speaker === NARRATOR) {
				if (line.mode !== 'voiceover') issue(ctx, [...at, 'mode'], 'A narrator line is voiceover.');
				return;
			}
			const role = roles.get(line.speaker);
			if (!role) issue(ctx, [...at, 'speaker'], `Unknown role ${line.speaker}.`);
			else if (!role.speaks) issue(ctx, [...at, 'speaker'], `Role ${role.id} does not speak.`);
			if (line.mode !== 'voiceover' && !panel.on_screen.includes(line.speaker))
				issue(ctx, [...at, 'mode'], 'An on-camera or dialogue line needs its speaker on screen in the panel; otherwise use voiceover.');
		});
	});
	value.beats.forEach((beat, index) => !used.has(beat.id) && issue(ctx, ['beats', index], 'Every beat needs at least one panel.'));
}
const productMaterial = { facts: z.array(factSchema).max(6), images: z.array(imageSchema).max(12) };
/** A stored Script: what the writer authored plus the Product facts and images and the instruction the service supplied. */
export const scriptSchema = scriptGenerationSchema
	.extend({ ...productMaterial, instruction: text.optional() })
	.superRefine((value, ctx) => {
		scriptChecks(value, ctx);
		if (duplicates(value.images.map((image) => image.asset_id)).length) issue(ctx, ['images'], 'Duplicate asset IDs.');
	});
/**
 * A Script draft as a writer submits it, checked without the service-owned fields. `asset` is reserved: a stored
 * Script with a role called `asset` (from before the name was reserved) still reads, and there `{{asset}}` names that
 * role, but it cannot be revised; generate a new Script instead.
 */
export const scriptAuthoringSchema = scriptGenerationSchema.superRefine((value, ctx) => {
	scriptChecks(value, ctx);
	value.roles.forEach((role, index) => role.id === ASSET && issue(ctx, ['roles', index, 'id'], 'narrator, product and asset are reserved.'));
});
/** Whether a stored Script has a role called `asset` (from before the name was reserved), so it cannot be revised. */
export const hasAssetRole = (script: Pick<ScriptGeneration, 'roles'>) => script.roles.some((role) => role.id === ASSET);
export const ASSET_ROLE_MESSAGE = 'This Script has a role called asset, a name now reserved for {{asset:<id>}} files, so it cannot be revised: generate a new Script instead.';
export type ScriptContent = z.infer<typeof scriptSchema>;
export type ScriptGeneration = z.infer<typeof scriptGenerationSchema>;
export type ScriptLine = z.infer<typeof lineSchema>;

/** Every line of a Script in speaking order, with the panel it belongs to. */
export function scriptLines(script: Pick<ScriptGeneration, 'panels'>) {
	return script.panels.flatMap((panel) => panel.lines.map((line) => ({ ...line, panel: panel.id })));
}

// ── Storyboard v1 ────────────────────────────────────────────────────────

/** What Storyboards saved before `own_voice` wrote in `voice` for the Character's own voice file. */
const LEGACY_OWN_VOICE = 'character';
export const castEntrySchema = z
	.object({
		character: backendIdSchema.optional().describe('The Character who plays the role; its images and voice keep the person the same in every clip.'),
		look: text.min(1).max(2000).optional().describe('For a role with no Character: one fixed appearance, used in every clip.'),
		voice: z
			.string()
			.min(1)
			.max(2000)
			.optional()
			.describe('A description of the voice: age, gender, pitch, timbre, accent.'),
		own_voice: z
			.literal(true)
			.optional()
			.describe('Speak with the cast Character\'s own voice file instead of a described voice; needs a `character` that has one.'),
	})
	.strict();
export const storyboardClipSchema = z
	.object({
		id: z.string().regex(/^C\d{2}$/, 'Clip IDs use C01, C02, ...'),
		duration_ms: z.number().int().min(MIN_CLIP_MS).max(MAX_CLIP_MS),
		shots: z
			.array(z.string().min(1).max(3000))
			.min(1)
			.max(20)
			.describe('One text per shot, in order: framing, camera, setting, action and acting, with tokens for people, the Product, other files and lines.'),
	})
	.strict();
export const storyboardSchema = z
	.object({
		script: backendIdSchema.describe('The Script this Storyboard shoots.'),
		cast: z.record(z.string().max(40), castEntrySchema).describe('One entry per Script role, and narrator when the Script has narrator lines.'),
		direction: z.string().max(8000).describe('What holds for the whole video: look, setting, sound, music, on-screen text and other packaging.'),
		clips: z.array(storyboardClipSchema).min(1).max(MAX_CLIPS),
	})
	.strict();
export type StoryboardContent = z.infer<typeof storyboardSchema>;
export type CastEntry = z.infer<typeof castEntrySchema>;

export interface StoryboardToken {
	/** The token as written, braces included. */
	raw: string;
	/** A role ID, `product`, `asset`, or a line ID. */
	name: string;
	/** The asset ID after a colon, if any. */
	asset?: string;
	index: number;
}
const TOKEN = /\{\{([^{}]*)\}\}/g;
/** An Asset ID as the backend issues it (OrderedUUID). */
const ID = backendIdPattern.slice(1, -1);
/** A token's body: a name and, after a colon (ASCII or full-width, as Chinese input methods type it), an Asset ID. */
const TOKEN_BODY = new RegExp(`^\\s*([A-Za-z][A-Za-z0-9_]{0,39})(?:\\s*[:：]\\s*(${ID}))?\\s*$`);
/** The tokens in a shot or direction text; a malformed one has an empty `name`. */
export function storyboardTokens(value: string): StoryboardToken[] {
	return [...value.matchAll(TOKEN)].map((match) => {
		const body = TOKEN_BODY.exec(match[1]!);
		return {
			raw: match[0],
			name: body?.[1] ?? '',
			...(body?.[2] === undefined ? {} : { asset: body[2].toLowerCase() }),
			index: match.index,
		};
	});
}

/** What a Storyboard is checked against: its Script, the Product's and Characters' files and the Assets it may name. */
export interface StoryboardContext {
	script: Pick<ScriptGeneration, 'roles' | 'panels' | 'duration_ms'>;
	/** The Product's files (asset IDs of any kind); its first image is the default. */
	product: { media: readonly string[] };
	/** Characters by ID: their files (asset IDs of any kind; the first image is the default) and their voice asset, if any. */
	characters: Readonly<Record<string, { media: readonly string[]; voice: string | null }>>;
	/**
	 * Files by ID, as the user may use them: each one's kind, label and description. An `{{asset:<id>}}` must be one
	 * of them. A Product or Character file missing here is taken to be an image; a Character's voice is audio.
	 */
	assets?: Readonly<Record<string, { kind: 'image' | 'video' | 'audio'; label?: string | null; description?: string | null }>>;
}
export interface ClipReferences {
	images: string[];
	videos: string[];
	audio: string[];
}
/**
 * Whether a token names a file with `{{asset:<id>}}`. In a stored Script with a role called `asset` (from before the
 * name was reserved), the token keeps naming that role.
 */
export function namesAsset(token: Pick<StoryboardToken, 'name'>, script: Pick<ScriptGeneration, 'roles'>) {
	return token.name === ASSET && !script.roles.some((role) => role.id === ASSET);
}
/** Session files (`sf_…`) are not Assets: a token names one only after it is promoted to an Asset. */
const SESSION_FILE_TOKEN = /^\{\{\s*[A-Za-z][A-Za-z0-9_]{0,39}\s*[:：]\s*sf_[0-9a-f]{32}\s*\}\}$/;
const SESSION_FILE_MESSAGE = (raw: string) => `${raw} names a Session file, which is not an Asset: promote it to an Asset first and use the Asset ID.`;
/** A name, a colon and any value: what an attempted file token looks like before its ID is checked. */
const LOOSE_TOKEN = /^\{\{\s*([A-Za-z][A-Za-z0-9_]{0,39})\s*[:：]\s*([\s\S]*?)\s*\}\}$/;
/** A run of hex digits and hyphens long enough to be an Asset ID, mistyped, cut off or with something added. */
const ID_ATTEMPT = /[0-9a-fA-F-]{20,}/;
/**
 * The problems with the file tokens in an instruction (`scripts.generate`, `storyboards.generate`). An instruction is
 * free text, so braces are reported only when they clearly try to name a file: a Session file (`sf_…`), `{{asset}}`
 * or `{{asset:…}}` without a valid Asset ID, or a value holding something like an Asset ID that is not exactly one
 * (`{{product:<id>.}}`, `{{product: <id> 主图}}`, `{{product:<id>,<id>}}`). Anything else, such as
 * `{{host}}`, `{{L01}}` or `{{时间: 3秒}}`, is left as text. With `script`, `{{asset}}` names that Script's role called
 * `asset` if it has one.
 */
export function instructionTokenIssues(instruction: string, script?: Pick<ScriptGeneration, 'roles'>): string[] {
	return storyboardTokens(instruction).flatMap((token) => {
		if (token.name === '') {
			const loose = LOOSE_TOKEN.exec(token.raw);
			if (loose === null) return [];
			const [, name, value] = loose;
			if (/^sf_/i.test(value!)) return [SESSION_FILE_MESSAGE(token.raw)];
			if (name === ASSET || ID_ATTEMPT.test(value!))
				return [`${token.raw} is not a file token: write {{asset:<asset id>}}, {{product:<asset id>}} or {{role:<asset id>}} with the full Asset ID.`];
			return [];
		}
		if (token.name === ASSET && token.asset === undefined && (script === undefined || namesAsset(token, script))) return ['{{asset}} needs an Asset ID: {{asset:<asset id>}}.'];
		return [];
	});
}

/** How far a Storyboard's total length may be from its Script's target: 15%, and at least 2 seconds. */
export const durationTolerance = (target: number) => Math.max(2000, Math.round(target * 0.15));

type FileKind = 'image' | 'video' | 'audio';
/** A Product or Character file's kind: as `assets` says, the voice is audio, anything else an image. */
const fileKind = (context: StoryboardContext, id: string, voice?: string | null): FileKind => context.assets?.[id]?.kind ?? (id === voice ? 'audio' : 'image');
/** An owner's default file: its first image. */
const defaultImage = (context: StoryboardContext, media: readonly string[] | undefined) => media?.find((id) => fileKind(context, id) === 'image');
/** Whether a file is one of a Character's: one of its files, or its voice. */
const characterHas = (entry: StoryboardContext['characters'][string] | undefined, id: string) => entry !== undefined && (entry.media.includes(id) || entry.voice === id);

/**
 * The references one clip renders with, worked out from its shots' tokens, in order of first mention within each
 * kind: the file of each cast Character and the Product it names (the named file, or the default image), each
 * `{{asset:<id>}}`, and the voice file of each speaker whose line it contains when that role's voice is the
 * Character's. Each file goes in the list of its own kind. Tokens that do not resolve are skipped; the checks in
 * `storyboardIssues` report them.
 */
export function clipReferences(storyboard: Pick<StoryboardContent, 'cast' | 'clips'>, clip: number, context: StoryboardContext): ClipReferences {
	const references: ClipReferences = { images: [], videos: [], audio: [] };
	const lists = { image: references.images, video: references.videos, audio: references.audio };
	const add = (value: string | undefined, kind: FileKind) => value !== undefined && !lists[kind].includes(value) && lists[kind].push(value);
	const speakers = new Map(scriptLines(context.script).map((line) => [line.id, line.speaker]));
	for (const shot of storyboard.clips[clip]?.shots ?? [])
		for (const token of storyboardTokens(shot)) {
			if (token.name === PRODUCT) {
				const id = token.asset ?? defaultImage(context, context.product.media);
				if (id !== undefined) add(id, fileKind(context, id));
			} else if (namesAsset(token, context.script)) {
				const asset = token.asset === undefined ? undefined : context.assets?.[token.asset];
				if (asset !== undefined) add(token.asset, asset.kind);
			} else if (LINE_ID.test(token.name)) {
				const speaker = speakers.get(token.name);
				const entry = speaker === undefined ? undefined : storyboard.cast[speaker];
				if (entry?.own_voice === true && entry.character !== undefined) add(context.characters[entry.character]?.voice ?? undefined, 'audio');
			} else {
				const character = storyboard.cast[token.name]?.character;
				const entry = character === undefined ? undefined : context.characters[character];
				const id = token.asset ?? defaultImage(context, entry?.media);
				if (character !== undefined && id !== undefined) add(id, fileKind(context, id, entry?.voice));
			}
		}
	return references;
}

/**
 * Checks a Storyboard against its Script, Product and Characters. Returns every problem as a message a writer or a
 * person editing it can act on, so they can be fixed together; an empty list means it is accepted. With `stored`, it
 * checks a saved Storyboard before it is compiled: a file named in its direction reaches no clip, so such a token is
 * not checked at all (Storyboards saved before files were refused there still compile); its shots get every check.
 */
export function storyboardIssues(storyboard: StoryboardContent, context: StoryboardContext, options: { stored?: boolean } = {}): string[] {
	const problems: string[] = [];
	const say = (where: string, message: string) => problems.push(`${where}: ${message}`);
	const { script } = context;
	const roles = new Map(script.roles.map((role) => [role.id, role]));
	const lines = scriptLines(script);
	const lineById = new Map(lines.map((line) => [line.id, line]));
	const narrated = lines.some((line) => line.speaker === NARRATOR);

	// Casting: every role (and the narrator, if there is one) once, played by a Character or described.
	for (const role of script.roles) if (storyboard.cast[role.id] === undefined) say('cast', `Role ${role.id} needs a cast entry.`);
	if (narrated && storyboard.cast[NARRATOR] === undefined) say('cast', 'The Script has narrator lines; cast the narrator with a voice.');
	const characters: string[] = [];
	for (const [key, entry] of Object.entries(storyboard.cast)) {
		const at = `cast.${key}`;
		const role = roles.get(key);
		if (key === NARRATOR) {
			if (!narrated) say(at, 'The Script has no narrator lines; remove this entry.');
			if (entry.look !== undefined) say(at, 'The narrator is never seen; give only a voice.');
		} else if (role === undefined) {
			say(at, `${key} is not a role of the Script.`);
			continue;
		} else if ((entry.character === undefined) === (entry.look === undefined)) say(at, 'Give either a Character or a look, not both.');
		if (entry.character !== undefined) {
			characters.push(entry.character);
			if (context.characters[entry.character] === undefined) say(at, `Character ${entry.character} is not available.`);
		}
		const speaks = key === NARRATOR || role!.speaks;
		const voiced = entry.voice !== undefined || entry.own_voice === true;
		if (!speaks && voiced) say(at, `Role ${key} does not speak; leave out the voice.`);
		if (speaks && !voiced) say(at, `${key} speaks and needs a voice: a description, or own_voice for a cast Character's voice file.`);
		if (entry.voice !== undefined && entry.own_voice === true) say(at, 'Give a voice description or own_voice, not both.');
		if (entry.own_voice === true) {
			if (entry.character === undefined) say(at, 'own_voice needs a cast Character.');
			else if (context.characters[entry.character] !== undefined && context.characters[entry.character]!.voice === null)
				say(at, `Character ${entry.character} has no voice file; describe the voice instead.`);
		}
	}
	for (const repeated of duplicates(characters)) say('cast', `Character ${repeated} plays more than one role.`);

	// Tokens: everything named must exist; a file named for a person or the Product must be theirs; an {{asset:…}} one the user may use.
	const product = new Set(context.product.media);
	const checkToken = (where: string, token: StoryboardToken, inShot: boolean) => {
		// A stored Storyboard compiles as saved: a file named in its direction reaches no clip, so it is not checked.
		if (!inShot && options.stored && token.asset !== undefined) return;
		if (token.name === '') {
			if (SESSION_FILE_TOKEN.test(token.raw)) return say(where, SESSION_FILE_MESSAGE(token.raw));
			return say(where, `${token.raw} is not a token; write {{role}}, {{role:<asset id>}}, {{product}}, {{product:<asset id>}}, {{asset:<asset id>}} or {{L01}}.`);
		}
		if (LINE_ID.test(token.name)) {
			if (!inShot) return say(where, `Line ${token.raw} belongs in a shot, not in the direction.`);
			if (!lineById.has(token.name)) say(where, `${token.raw} is not a line of the Script.`);
			if (token.asset !== undefined) say(where, `${token.raw}: a line token takes no file.`);
			return;
		}
		if (namesAsset(token, script)) {
			if (token.asset === undefined) return say(where, '{{asset}} needs an Asset ID: {{asset:<asset id>}}.');
			if (context.assets?.[token.asset] === undefined) return say(where, `${token.raw}: there is no image, video or audio Asset with this ID that you may use.`);
			if (!inShot) say(where, `${token.raw} belongs in the shots that use it: a clip renders only the files its shots name.`);
			return;
		}
		// A file reaches only the clips whose shots name it, so a named file in the direction reaches none.
		if (!inShot && token.asset !== undefined) return say(where, `${token.raw} belongs in the shots that use it: a clip renders only the files its shots name.`);
		if (token.name === PRODUCT) {
			if (token.asset !== undefined && !product.has(token.asset)) say(where, `${token.raw}: that file is not one of the Product's files.`);
			if (token.asset === undefined && defaultImage(context, context.product.media) === undefined) say(where, '{{product}}: the Product has no images.');
			return;
		}
		if (!roles.has(token.name)) return say(where, `${token.raw}: ${token.name} is not a role of the Script.`);
		if (token.asset === undefined) return;
		const character = storyboard.cast[token.name]?.character;
		if (character === undefined) say(where, `${token.raw}: ${token.name} has no Character, so there is no file to name.`);
		else if (!characterHas(context.characters[character], token.asset)) say(where, `${token.raw}: that file is not one of ${token.name}'s Character's files.`);
	};
	for (const token of storyboardTokens(storyboard.direction)) checkToken('direction', token, false);

	// Clips: in order, each 5–15 s; lines placed exactly once, in Script order; an on-camera speaker is in the shot.
	const placed: string[] = [];
	storyboard.clips.forEach((clip, c) => {
		const where = clip.id;
		const expected = `C${String(c + 1).padStart(2, '0')}`;
		if (clip.id !== expected) say(where, `Clips are numbered in order; this one is ${expected}.`);
		clip.shots.forEach((shot, s) => {
			const at = `${where} shot ${s + 1}`;
			const tokens = storyboardTokens(shot);
			const named = new Set(tokens.map((token) => token.name));
			for (const token of tokens) {
				checkToken(at, token, true);
				const line = lineById.get(token.name);
				if (line === undefined) continue;
				placed.push(line.id);
				if (line.mode !== 'voiceover' && line.speaker !== NARRATOR && !named.has(line.speaker))
					say(at, `${token.raw} is spoken on camera by ${line.speaker}; name {{${line.speaker}}} in this shot.`);
			}
		});
		const references = clipReferences(storyboard, c, context);
		if (references.images.length > MAX_REFERENCES.image)
			say(where, `This clip names ${references.images.length} images; at most ${MAX_REFERENCES.image}. Name fewer people, Product images or image Assets, or split the clip.`);
		if (references.videos.length > MAX_REFERENCES.video) say(where, `This clip names ${references.videos.length} videos; at most ${MAX_REFERENCES.video}.`);
		if (references.audio.length > MAX_REFERENCES.audio) say(where, `This clip has ${references.audio.length} audio files (voices and named audio); at most ${MAX_REFERENCES.audio}.`);
		const count = references.images.length + references.videos.length + references.audio.length;
		if (count > MAX_VIDEO_ASSETS) say(where, `This clip has ${count} references in all; at most ${MAX_VIDEO_ASSETS}.`);
		// The video model needs something to see: an image or a video.
		if (references.images.length === 0 && references.videos.length === 0)
			say(where, 'A clip needs at least one image or video: name {{product}}, a cast Character or an image or video {{asset:…}} in a shot.');
	});
	for (const repeated of duplicates(placed)) say('clips', `Line ${repeated} is placed more than once; each line is spoken once.`);
	for (const line of lines) if (!placed.includes(line.id)) say('clips', `Line ${line.id} is not placed in any shot.`);
	const order = lines.map((line) => line.id).filter((id) => placed.includes(id));
	const first = [...new Set(placed)];
	if (first.join() !== order.join()) say('clips', `Lines are placed in Script order: ${order.join(', ')}.`);
	const total = storyboard.clips.reduce((sum, clip) => sum + clip.duration_ms, 0);
	if (Math.abs(total - script.duration_ms) > durationTolerance(script.duration_ms))
		say('clips', `The clips add up to ${total} ms; the Script is ${script.duration_ms} ms. Keep within ${durationTolerance(script.duration_ms)} ms of it.`);
	return problems;
}

// ── Storage ──────────────────────────────────────────────────────────────

const MAX_TEXT = 65_536;
const scriptEnvelope = z.object({ format: z.literal('nuva.script'), version: z.literal(3), content: scriptSchema }).strict();
const storyboardEnvelope = z.object({ format: z.literal('nuva.storyboard'), version: z.literal(1), content: storyboardSchema }).strict();
function encode<T>(envelope: z.ZodType<{ content: T }>, value: unknown, what: string): string {
	const text = JSON.stringify(envelope.parse(value));
	if (text.length > MAX_TEXT) throw new TypeError(`Encoded ${what} exceeds the backend text limit of 65,536 characters.`);
	return text;
}
function decode<T>(envelope: z.ZodType<{ content: T }>, text: string, what: string): T {
	if (text.length > MAX_TEXT) throw new TypeError(`Encoded ${what} exceeds the backend text limit of 65,536 characters.`);
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new TypeError(`This text is not an encoded ${what}.`);
	}
	const result = envelope.safeParse(what === 'Storyboard' ? ownVoices(value) : value);
	if (!result.success) throw new TypeError(`Unsupported or invalid ${what} content.`);
	return result.data.content;
}
/** A stored Storyboard as it reads now: its stored `voice: "character"` (legacyVoices) is own_voice. */
function ownVoices(value: unknown): unknown {
	const cast = (value as { content?: { cast?: Record<string, Record<string, unknown>> } } | null)?.content?.cast;
	if (cast === null || typeof cast !== 'object') return value;
	const updated = Object.fromEntries(
		Object.entries(cast).map(([role, entry]) => {
			if (entry === null || typeof entry !== 'object' || entry.voice !== LEGACY_OWN_VOICE) return [role, entry];
			const { voice: _, ...rest } = entry;
			return [role, { ...rest, own_voice: true }];
		}),
	);
	const content = (value as { content: Record<string, unknown> }).content;
	return { ...(value as object), content: { ...content, cast: updated } };
}
/** A Script's `data.text`: `{ format: 'nuva.script', version: 3, content }`. v2 Scripts read with decodeScriptPackage. */
export const encodeScript = (content: ScriptContent) => encode(scriptEnvelope, { format: 'nuva.script', version: 3, content }, 'Script');
export const decodeScript = (text: string): ScriptContent => decode(scriptEnvelope, text, 'Script');
/** A Storyboard's `data.text`: `{ format: 'nuva.storyboard', version: 1, content }`. */
export const encodeStoryboard = (content: StoryboardContent) =>
	legacyVoices(encode(storyboardEnvelope, { format: 'nuva.storyboard', version: 1, content }, 'Storyboard'));
/**
 * The stored form of `own_voice`: `voice: "character"`, as Storyboard version 1 has always stored it, so SDKs up to
 * 0.1.0-preview.4 and an earlier Agent still read every saved Storyboard. `decodeStoryboard` reads it back as own_voice.
 */
function legacyVoices(text: string): string {
	const value = JSON.parse(text) as { content: { cast: Record<string, Record<string, unknown>> } };
	let changed = false;
	for (const [role, entry] of Object.entries(value.content.cast)) {
		if (entry.own_voice !== true) continue;
		const { own_voice: _, ...rest } = entry;
		value.content.cast[role] = { ...rest, voice: LEGACY_OWN_VOICE };
		changed = true;
	}
	return changed ? JSON.stringify(value) : text;
}
export const decodeStoryboard = (text: string): StoryboardContent => decode(storyboardEnvelope, text, 'Storyboard');
/** Which Script format a stored text is: 3, or 2 for a read-only legacy ScriptPackage. */
export function scriptVersion(text: string): 2 | 3 | undefined {
	try {
		const value = JSON.parse(text) as { format?: unknown; version?: unknown };
		if (value.format === 'nuva.script' && value.version === 3) return 3;
		if (value.format === 'nuva.script-package' && value.version === 2) return 2;
	} catch {}
	return undefined;
}
