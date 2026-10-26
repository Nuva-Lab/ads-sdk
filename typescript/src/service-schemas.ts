import { z } from 'zod';
import { isPublicUrl } from './public-url.js';
export const factId = z.enum([
	'fact_product_brand',
	'fact_product_name',
	'fact_product_tags',
	'fact_product_selling_points',
	'fact_product_target_audience',
	'fact_product_video_requirements',
]);
const id = z.string().min(1).max(160),
	text = z.string().max(32000),
	ms = z.number().int().nonnegative();
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const publicUrl = (protocols: readonly string[], message: string) =>
	z
		.url()
		.max(2048)
		.refine((v) => isPublicUrl(v, protocols), message);
const publicHttps = publicUrl(['https:'], 'URL must be a public HTTPS hostname without port or credentials.');
const publicAssetUrl = publicUrl(['https:', 'http:'], 'URL must be a public HTTP(S) hostname without port or credentials.');
export const factSchema = z
	.object({ id: factId, claim: text.min(1), source_field: z.string().min(1).max(160), source_excerpt: text })
	.strict();
// Image URLs are passed unchanged to /v1/videos, which fetches public HTTP(S) URLs up to 2048 characters.
export const imageSchema = z
	.object({
		asset_id: id,
		role: z.literal('product_appearance'),
		mime_type: z.enum(IMAGE_MIME_TYPES),
		url: publicAssetUrl,
	})
	.strict();
const product = { facts: z.array(factSchema).max(6), images: z.array(imageSchema).max(12) };
function products(value: { facts: { id: string }[]; images: { asset_id: string }[] }, ctx: z.RefinementCtx) {
	if (new Set(value.facts.map((x) => x.id)).size !== value.facts.length)
		ctx.addIssue({ code: 'custom', path: ['facts'], message: 'Duplicate fact IDs.' });
	if (new Set(value.images.map((x) => x.asset_id)).size !== value.images.length)
		ctx.addIssue({ code: 'custom', path: ['images'], message: 'Duplicate asset IDs.' });
}
export const scriptRequestSchema = z
	.object({
		...product,
		instruction: text.optional(),
		acceptable_duration_ms: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).strict(),
	})
	.strict()
	.superRefine((v, c) => {
		products(v, c);
		if (v.acceptable_duration_ms.min > v.acceptable_duration_ms.max)
			c.addIssue({ code: 'custom', path: ['acceptable_duration_ms'], message: 'min must not exceed max.' });
		if (v.acceptable_duration_ms.max < MIN_CLIP_MS)
			c.addIssue({
				code: 'custom',
				path: ['acceptable_duration_ms', 'max'],
				message: `max must allow at least one ${MIN_CLIP_MS / 1000}-second clip.`,
			});
		if (!v.facts.length && !v.images.length) c.addIssue({ code: 'custom', path: ['facts'], message: 'Provide product facts or images.' });
	});
export const CATEGORIES = ['beauty', 'food', 'cleaning', 'care-pets', 'apparel-home', 'other'] as const;
const beatId = z.string().regex(/^B\d{2}$/, 'Beat IDs use B01, B02, ...');
const shotId = z.string().regex(/^B\d{2}-S\d{2}$/, 'Shot IDs use <beat_id>-S01, e.g. B02-S01.');
export const entitySchema = z
	.object({ id, kind: z.string().min(1).max(80), name: text, description: text, appearance_source_asset_ids: z.array(id).max(12) })
	.strict();
// A voice is one fixed speaker identity. entity_id is the visible person who owns it, or null for an unseen narrator.
const voice = z
	.object({ id, entity_id: id.nullable(), language: z.enum(['zh-CN', 'en-US']), description: text.min(1) })
	.strict()
	.describe('description fixes age, gender, pitch, timbre, pace, accent and attitude for every clip.');
export const SPEECH_MODES = ['on_camera', 'dialogue', 'voiceover'] as const;
const speech = z
	.object({
		voice_id: id,
		mode: z.enum(SPEECH_MODES),
		text: text.min(1),
		start_ms: ms,
		end_ms: z.number().int().positive(),
		delivery: z.object({ emotion: text, pace: text, intent: text }).strict(),
	})
	.strict();
const sound = z.object({ description: text.min(1), start_ms: ms, end_ms: z.number().int().positive() }).strict();
const screenText = z.object({ text: text.min(1), fact_ids: z.array(factId), start_ms: ms, end_ms: z.number().int().positive() }).strict();
const beatSchema = z.object({ id: beatId, purpose: text.min(1), fact_ids: z.array(factId) }).strict();
export const shotSchema = z
	.object({
		id: shotId,
		beat_id: beatId,
		start_ms: ms,
		end_ms: z.number().int().positive(),
		scene: text.min(1),
		composition: text,
		camera: text,
		action: text.min(1),
		key_detail: text,
		visible_entity_ids: z.array(id),
		fact_ids: z.array(factId),
		speech: z.array(speech).max(30),
		sound_cues: z.array(sound).max(30),
		text_cues: z.array(screenText).max(30),
	})
	.strict();
// A planned clip is one /v1/videos job, so it shares that API's 5-15 s range.
export const MIN_CLIP_MS = 5000,
	MAX_CLIP_MS = 15000;
export const plannedClipSchema = z
	.object({ id, duration_ms: z.number().int().min(MIN_CLIP_MS).max(MAX_CLIP_MS), shots: z.array(shotSchema).min(1).max(100) })
	.strict();
// H3 generates speech and sound with the picture; screen text is added in postproduction.
export const productionSchema = z
	.object({ speech: z.literal('h3'), sound: z.literal('h3'), music: z.literal('none'), text: z.literal('postproduction') })
	.strict();
export const PRODUCTION = { speech: 'h3', sound: 'h3', music: 'none', text: 'postproduction' } as const;
// The model authors this plan directly. Facts, image URLs and production policy are copied by the service.
export const scriptGenerationSchema = z
	.object({
		schema_version: z.literal(2),
		concept: z
			.object({
				name: text.min(1),
				category: z.enum(CATEGORIES),
				purchase_task: text.min(1),
				proposition: text.min(1),
				route: text.min(1),
				route_reason: text,
				speaker_relation: text,
			})
			.strict(),
		beats: z.array(beatSchema).min(1).max(30),
		entities: z.array(entitySchema).max(100),
		voices: z.array(voice).max(30),
		clips: z.array(plannedClipSchema).min(1).max(30),
		open_issues: z.array(text).max(30),
	})
	.strict();
function planChecks(value: z.infer<typeof scriptGenerationSchema>, ctx: z.RefinementCtx) {
	const problem = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
	for (const k of ['beats', 'entities', 'voices', 'clips'] as const)
		if (new Set(value[k].map((x) => x.id)).size !== value[k].length) problem([k], 'Duplicate IDs.');
	const allShots = value.clips.flatMap((x) => x.shots.map((s) => s.id));
	if (new Set(allShots).size !== allShots.length) problem(['clips'], 'Shot IDs must be globally unique.');
	const entities = new Set(value.entities.map((x) => x.id)),
		voices = new Map(value.voices.map((x) => [x.id, x])),
		beatOrder = new Map(value.beats.map((x, i) => [x.id, i]));
	value.voices.forEach((v, i) => {
		if (v.entity_id !== null && !entities.has(v.entity_id)) problem(['voices', i, 'entity_id'], 'Unknown entity ID.');
	});
	const usedBeats = new Set<string>();
	let lastBeat = 0;
	value.clips.forEach((clip, ci) => {
		let end = 0;
		clip.shots.forEach((shot, si) => {
			const path = ['clips', ci, 'shots', si];
			const beat = beatOrder.get(shot.beat_id);
			if (beat === undefined) problem([...path, 'beat_id'], 'Unknown beat ID.');
			else {
				if (beat < lastBeat) problem([...path, 'beat_id'], 'Shots must follow beat order.');
				lastBeat = beat;
				usedBeats.add(shot.beat_id);
			}
			if (!shot.id.startsWith(`${shot.beat_id}-`)) problem([...path, 'id'], 'Shot ID must start with its beat ID.');
			if (shot.start_ms !== end || shot.end_ms <= shot.start_ms || shot.end_ms > clip.duration_ms)
				problem(path, 'Shots must cover the clip contiguously from 0, with valid increasing boundaries.');
			end = shot.end_ms;
			if (shot.visible_entity_ids.some((x) => !entities.has(x))) problem([...path, 'visible_entity_ids'], 'Unknown entity ID.');
			for (const k of ['speech', 'sound_cues', 'text_cues'] as const)
				shot[k].forEach((cue, i) => {
					// Cue starts in its owning shot; it may continue across later shots within this clip, never across clips.
					if (cue.start_ms < shot.start_ms || cue.start_ms >= shot.end_ms || cue.end_ms <= cue.start_ms || cue.end_ms > clip.duration_ms)
						problem([...path, k, i], 'Cue must start in its owning shot and end within the clip; times are clip-relative.');
				});
			shot.speech.forEach((cue, i) => {
				const owner = voices.get(cue.voice_id);
				if (!owner) problem([...path, 'speech', i, 'voice_id'], 'Unknown voice ID.');
				else if (cue.mode !== 'voiceover' && (owner.entity_id === null || !shot.visible_entity_ids.includes(owner.entity_id)))
					problem(
						[...path, 'speech', i, 'mode'],
						'Visible speech needs a voice owned by an entity visible in the shot; otherwise use voiceover.',
					);
			});
		});
		if (end !== clip.duration_ms) problem(['clips', ci, 'shots'], 'Shot coverage must end at duration_ms.');
	});
	value.beats.forEach((b, i) => {
		if (!usedBeats.has(b.id)) problem(['beats', i], 'Every beat needs at least one shot.');
	});
}
function packageChecks(value: z.infer<typeof scriptGenerationSchema> & z.infer<typeof productSchema>, ctx: z.RefinementCtx) {
	products(value, ctx);
	planChecks(value, ctx);
	const facts = new Set(value.facts.map((x) => x.id)),
		assets = new Set(value.images.map((x) => x.asset_id));
	const unknownFact = (path: (string | number)[]) => ctx.addIssue({ code: 'custom', path, message: 'Unknown fact ID.' });
	value.entities.forEach((e, i) => {
		if (e.appearance_source_asset_ids.some((x) => !assets.has(x)))
			ctx.addIssue({ code: 'custom', path: ['entities', i, 'appearance_source_asset_ids'], message: 'Unknown image asset ID.' });
	});
	value.beats.forEach((b, i) => {
		if (b.fact_ids.some((x) => !facts.has(x))) unknownFact(['beats', i, 'fact_ids']);
	});
	value.clips.forEach((clip, ci) =>
		clip.shots.forEach((shot, si) => {
			if (shot.fact_ids.some((x) => !facts.has(x)) || shot.text_cues.some((t) => t.fact_ids.some((x) => !facts.has(x))))
				unknownFact(['clips', ci, 'shots', si, 'fact_ids']);
		}),
	);
}
const productSchema = z.object(product);
export const scriptResponseSchema = scriptGenerationSchema
	.extend({ ...product, instruction: text.optional(), production: productionSchema })
	.superRefine(packageChecks);
// The Generate script response is the Generate clip prompts request. An optional instruction can be added for prompt-specific direction.
export const clipRequestSchema = scriptResponseSchema;
export const MAX_CLIP_ASSETS = 3;
export const MAX_PROMPT_CHARS = 10000;
// asset_ids order defines <Picture 1>, <Picture 2>, ... in the prompt.
export const clipPlanSchema = z
	.object({
		clips: z
			.array(z.object({ id, prompt: z.string().min(1).max(MAX_PROMPT_CHARS), asset_ids: z.array(id).max(MAX_CLIP_ASSETS) }).strict())
			.min(1)
			.max(30),
	})
	.strict();
// Each clip is a POST /v1/videos body without seed, batch_id and callback_url, which the caller owns.
const clipAsset = z.object({ type: z.literal('image'), mime_type: z.enum(IMAGE_MIME_TYPES), url: z.string() }).strict();
export const clipResponseSchema = z
	.object({
		clips: z
			.array(
				z
					.object({
						id,
						seconds: z
							.number()
							.min(MIN_CLIP_MS / 1000)
							.max(MAX_CLIP_MS / 1000),
						prompt: z.string(),
						assets: z.array(clipAsset).max(MAX_CLIP_ASSETS),
					})
					.strict(),
			)
			.min(1)
			.max(30),
	})
	.strict();
export const MAX_IMAGE_BYTES = 5_000_000;
export const MAX_MEDIA_BYTES = 30_000_000;
const base64 = (maxBytes: number) =>
	z
		.string()
		.max(Math.ceil(maxBytes / 3) * 4)
		.regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Invalid base64.');
const source = (maxBytes: number) => ({ url: publicAssetUrl.optional(), base64: base64(maxBytes).optional() });
const oneSource = (v: { url?: string | undefined; base64?: string | undefined }) => (v.url === undefined) !== (v.base64 === undefined);
const duration = z
	.number()
	.positive()
	.max(MAX_CLIP_MS / 1000)
	.optional();
export const VIDEO_ASSET_MIME_TYPES = { video: ['video/mp4'], audio: ['audio/mpeg', 'audio/wav', 'audio/mp4'] } as const;
const videoAssetSchema = z
	.discriminatedUnion('type', [
		z.object({ type: z.literal('image'), mime_type: z.enum(IMAGE_MIME_TYPES), ...source(MAX_IMAGE_BYTES) }).strict(),
		z
			.object({
				type: z.literal('video'),
				mime_type: z.enum(VIDEO_ASSET_MIME_TYPES.video),
				...source(MAX_MEDIA_BYTES),
				duration_seconds: duration,
			})
			.strict(),
		z
			.object({
				type: z.literal('audio'),
				mime_type: z.enum(VIDEO_ASSET_MIME_TYPES.audio),
				...source(MAX_MEDIA_BYTES),
				duration_seconds: duration,
			})
			.strict(),
	])
	.refine(oneSource, 'Provide exactly one of url or base64.');
export const VIDEO_RESOLUTIONS = ['480P', '768P'] as const;
export const VIDEO_RATIOS = ['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'] as const;
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];
export type VideoRatio = (typeof VIDEO_RATIOS)[number];
export const VIDEO_STATUSES = ['queued', 'running', 'completed', 'failed'] as const;
// Ref2VA reference limits per job. Images are downscaled on the GPU host before inference, so the
// sequence budget holds nine images next to 15 s of reference video; see apis/uniserve_h3/README.md.
export const MAX_REFERENCES = { image: 9, video: 3, audio: 3 } as const;
export const MAX_VIDEO_ASSETS = 12;
// SQLite's length() stops at a NUL, so a NUL would trip the jobs table CHECK constraints.
const noNul = (message: string) => [(v: string) => !v.includes('\0'), message] as const;
export const videoRequestSchema = z
	.object({
		prompt: z
			.string()
			.min(1)
			.max(MAX_PROMPT_CHARS)
			.refine(...noNul('prompt must not contain NUL characters.')),
		seconds: z
			.number()
			.min(MIN_CLIP_MS / 1000)
			.max(MAX_CLIP_MS / 1000)
			.optional(),
		seed: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
		batch_id: z
			.string()
			.min(1)
			.max(128)
			.refine(...noNul('batch_id must not contain NUL characters.'))
			.optional(),
		callback_url: publicHttps.optional(),
		resolution: z.enum(VIDEO_RESOLUTIONS).optional(),
		ratio: z.enum(VIDEO_RATIOS).optional(),
		assets: z.array(videoAssetSchema).min(1).max(MAX_VIDEO_ASSETS),
	})
	.strict()
	.superRefine((v, c) => {
		for (const type of ['image', 'video', 'audio'] as const) {
			if (v.assets.filter((asset) => asset.type === type).length > MAX_REFERENCES[type])
				c.addIssue({ code: 'custom', path: ['assets'], message: `At most ${MAX_REFERENCES[type]} ${type} assets.` });
		}
		if (!v.assets.some((asset) => asset.type !== 'audio'))
			c.addIssue({ code: 'custom', path: ['assets'], message: 'assets must include at least one image or video.' });
	});
export const videoCreatedSchema = z
	.object({
		id: z.string().describe('视频任务ID（32位十六进制）。'),
		status: z.literal('queued'),
		batch_id: z.string().optional(),
		status_url: z.string(),
	})
	.strict();
export const videoStatusSchema = z
	.object({
		id: z.string().describe('视频任务ID（32位十六进制）。'),
		status: z.enum(VIDEO_STATUSES),
		batch_id: z.string().optional(),
		url: z.url().optional(),
		expires_at: z.number().int().optional(),
	})
	.strict();
export type VideoRequest = z.infer<typeof videoRequestSchema>;
export type VideoAsset = NonNullable<VideoRequest['assets']>[number];
export type ScriptRequest = z.infer<typeof scriptRequestSchema>;
export type ScriptGeneration = z.infer<typeof scriptGenerationSchema>;
export type ScriptPackage = z.infer<typeof scriptResponseSchema>;
export type ClipRequest = z.infer<typeof clipRequestSchema>;
export type ClipResponse = z.infer<typeof clipResponseSchema>;
export type ProductImage = z.infer<typeof imageSchema>;
