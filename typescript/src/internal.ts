/**
 * Everything in `@nuva/sdk/schemas` plus the Script v3 and Storyboard helpers the Agent, the mock server and the
 * playground share with the SDK. A workspace entry: the release leaves it out of the npm package and its `exports`.
 */
export * from './schemas.js';
export { MIN_CLIP_MS, MAX_CLIP_MS, MAX_REFERENCES, MAX_VIDEO_ASSETS, SPEECH_MODES, factSchema, imageSchema } from './service-schemas.js';
export {
	scriptGenerationSchema,
	scriptAuthoringSchema,
	storyboardClipSchema,
	castEntrySchema,
	storyboardTokens,
	clipReferences,
	namesAsset,
	scriptLines,
	durationTolerance,
	scriptVersion,
	NARRATOR,
	PRODUCT,
	ASSET,
	CHARACTER_VOICE,
	ROLE_ID,
	LINE_ID,
	MAX_CLIPS,
	MAX_SCRIPT_MS,
} from './script-v3.js';
export type { ScriptGeneration, ScriptLine, CastEntry, StoryboardToken, ClipReferences } from './script-v3.js';
