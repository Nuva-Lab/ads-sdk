/**
 * Script v3 and Storyboard v1.
 *
 * A Script is the idea a customer approves: concept, beats, roles, and the story as one sequence of panels with the
 * exact lines each role speaks and a target length. It has no clips: where the story is cut into separately rendered
 * clips is a Storyboard decision.
 *
 * A Storyboard is how the Script is shot: who plays each role (`cast`), one `direction` for the whole video, and its
 * clips, each a list of shots written as text. Shots name people, Product images and Script lines with tokens:
 *
 *   {{host}}            the role host, as cast (a cast Character's default image, its first)
 *   {{host:<asset id>}} the role host, with that image of its Character
 *   {{product}}         the Product (its default image, its first)
 *   {{product:<id>}}    that image of the Product
 *   {{L04}}             Script line L04, spoken by its speaker
 *
 * The references each clip renders with are worked out from its tokens (`clipReferences`), so a cast Character's image
 * and voice go into every clip it appears or speaks in.
 */
import { z } from 'zod';
import { CATEGORIES, MAX_CLIP_MS, MAX_REFERENCES, MAX_VIDEO_ASSETS, MIN_CLIP_MS, SPEECH_MODES, factId, factSchema, imageSchema } from './service-schemas.js';
import { backendIdSchema } from './backend-id.js';

const text = z.string().max(32000);
const issue = (ctx: z.RefinementCtx, path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
const duplicates = (values: readonly string[]) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

// ── Script v3 ────────────────────────────────────────────────────────────

/** A speaker who is not a role: an unseen narrator. On screen, `product` stands for the Product. */
export const NARRATOR = 'narrator',
	PRODUCT = 'product';
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
/** A Script draft as a writer submits it, checked without the service-owned fields. */
export const scriptAuthoringSchema = scriptGenerationSchema.superRefine(scriptChecks);
export type ScriptContent = z.infer<typeof scriptSchema>;
export type ScriptGeneration = z.infer<typeof scriptGenerationSchema>;
export type ScriptLine = z.infer<typeof lineSchema>;

/** Every line of a Script in speaking order, with the panel it belongs to. */
export function scriptLines(script: Pick<ScriptGeneration, 'panels'>) {
	return script.panels.flatMap((panel) => panel.lines.map((line) => ({ ...line, panel: panel.id })));
}

// ── Storyboard v1 ────────────────────────────────────────────────────────

/** The Character's own voice file, as opposed to a described voice. */
export const CHARACTER_VOICE = 'character';
export const castEntrySchema = z
	.object({
		character: backendIdSchema.optional().describe('The Character who plays the role; its images and voice keep the person the same in every clip.'),
		look: text.min(1).max(2000).optional().describe('For a role with no Character: one fixed appearance, used in every clip.'),
		voice: z
			.string()
			.min(1)
			.max(2000)
			.optional()
			.describe('"character" uses the cast Character\'s voice file; any other text describes the voice (age, gender, pitch, timbre, accent).'),
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
			.describe('One text per shot, in order: framing, camera, setting, action and acting, with tokens for people, Product images and lines.'),
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
	/** A role ID, `product`, or a line ID. */
	name: string;
	/** The asset ID after a colon, if any. */
	asset?: string;
	index: number;
}
const TOKEN = /\{\{([^{}]*)\}\}/g;
const TOKEN_BODY = /^\s*([A-Za-z][A-Za-z0-9_]{0,39})(?:\s*:\s*([0-9a-fA-F-]{36}))?\s*$/;
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

/** What a Storyboard is checked against: its Script, the Product's images and the Characters it may cast. */
export interface StoryboardContext {
	script: Pick<ScriptGeneration, 'roles' | 'panels' | 'duration_ms'>;
	/** The Product's image asset IDs; the first is its default image. */
	productImages: readonly string[];
	/** Characters by ID: their image asset IDs (the first is the default) and their voice asset, if any. */
	characters: Readonly<Record<string, { images: readonly string[]; voice: string | null }>>;
}
export interface ClipReferences {
	images: string[];
	audio: string[];
}

/** How far a Storyboard's total length may be from its Script's target: 15%, and at least 2 seconds. */
export const durationTolerance = (target: number) => Math.max(2000, Math.round(target * 0.15));

/**
 * The references one clip renders with, worked out from its shots' tokens, in order of first mention: the image of
 * each cast Character and the Product it names (the named image, or the default), and the voice file of each speaker
 * whose line it contains when that role's voice is the Character's. Tokens that do not resolve are skipped; the checks
 * in `storyboardIssues` report them.
 */
export function clipReferences(storyboard: Pick<StoryboardContent, 'cast' | 'clips'>, clip: number, context: StoryboardContext): ClipReferences {
	const images: string[] = [];
	const audio: string[] = [];
	const add = (list: string[], value: string | undefined) => value !== undefined && !list.includes(value) && list.push(value);
	const speakers = new Map(scriptLines(context.script).map((line) => [line.id, line.speaker]));
	for (const shot of storyboard.clips[clip]?.shots ?? [])
		for (const token of storyboardTokens(shot)) {
			if (token.name === PRODUCT) add(images, token.asset ?? context.productImages[0]);
			else if (LINE_ID.test(token.name)) {
				const speaker = speakers.get(token.name);
				const entry = speaker === undefined ? undefined : storyboard.cast[speaker];
				if (entry?.voice === CHARACTER_VOICE && entry.character !== undefined) add(audio, context.characters[entry.character]?.voice ?? undefined);
			} else {
				const character = storyboard.cast[token.name]?.character;
				if (character !== undefined) add(images, token.asset ?? context.characters[character]?.images[0]);
			}
		}
	return { images, audio };
}

/**
 * Checks a Storyboard against its Script, Product and Characters. Returns every problem as a message a writer or a
 * person editing it can act on, so they can be fixed together; an empty list means it is accepted.
 */
export function storyboardIssues(storyboard: StoryboardContent, context: StoryboardContext): string[] {
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
		if (!speaks && entry.voice !== undefined) say(at, `Role ${key} does not speak; leave out the voice.`);
		if (speaks && entry.voice === undefined) say(at, `${key} speaks and needs a voice.`);
		if (entry.voice === CHARACTER_VOICE) {
			if (entry.character === undefined) say(at, '"character" voice needs a cast Character.');
			else if (context.characters[entry.character] !== undefined && context.characters[entry.character]!.voice === null)
				say(at, `Character ${entry.character} has no voice file; describe the voice instead.`);
		}
	}
	for (const repeated of duplicates(characters)) say('cast', `Character ${repeated} plays more than one role.`);

	// Tokens: everything named must exist; asset tokens must be that person's or the Product's image.
	const product = new Set(context.productImages);
	const checkToken = (where: string, token: StoryboardToken, allowLines: boolean) => {
		if (token.name === '') return say(where, `${token.raw} is not a token; write {{role}}, {{role:<image id>}}, {{product}}, {{product:<image id>}} or {{L01}}.`);
		if (LINE_ID.test(token.name)) {
			if (!allowLines) return say(where, `Line ${token.raw} belongs in a shot, not in the direction.`);
			if (!lineById.has(token.name)) say(where, `${token.raw} is not a line of the Script.`);
			if (token.asset !== undefined) say(where, `${token.raw}: a line token takes no image.`);
			return;
		}
		if (token.name === PRODUCT) {
			if (token.asset !== undefined && !product.has(token.asset)) say(where, `${token.raw}: that image is not one of the Product's.`);
			if (token.asset === undefined && product.size === 0) say(where, '{{product}}: the Product has no images.');
			return;
		}
		if (!roles.has(token.name)) return say(where, `${token.raw}: ${token.name} is not a role of the Script.`);
		if (token.asset === undefined) return;
		const character = storyboard.cast[token.name]?.character;
		if (character === undefined) say(where, `${token.raw}: ${token.name} has no Character, so there is no image to name.`);
		else if (!(context.characters[character]?.images ?? []).includes(token.asset)) say(where, `${token.raw}: that image is not one of ${token.name}'s Character's.`);
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
			say(where, `This clip names ${references.images.length} images; at most ${MAX_REFERENCES.image}. Name fewer people or Product images, or split the clip.`);
		if (references.audio.length > MAX_REFERENCES.audio) say(where, `This clip has ${references.audio.length} voice files; at most ${MAX_REFERENCES.audio}.`);
		if (references.images.length + references.audio.length > MAX_VIDEO_ASSETS) say(where, `At most ${MAX_VIDEO_ASSETS} references in total.`);
		if (references.images.length === 0) say(where, 'A clip needs at least one image: name {{product}} or a cast Character in a shot.');
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
	const result = envelope.safeParse(value);
	if (!result.success) throw new TypeError(`Unsupported or invalid ${what} content.`);
	return result.data.content;
}
/** A Script's `data.text`: `{ format: 'nuva.script', version: 3, content }`. v2 Scripts read with decodeScriptPackage. */
export const encodeScript = (content: ScriptContent) => encode(scriptEnvelope, { format: 'nuva.script', version: 3, content }, 'Script');
export const decodeScript = (text: string): ScriptContent => decode(scriptEnvelope, text, 'Script');
/** A Storyboard's `data.text`: `{ format: 'nuva.storyboard', version: 1, content }`. */
export const encodeStoryboard = (content: StoryboardContent) => encode(storyboardEnvelope, { format: 'nuva.storyboard', version: 1, content }, 'Storyboard');
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
