/**
 * Everything in `@nuva/sdk/schemas` plus the Script v3 and Storyboard helpers the Agent, the playground and the admin
 * page share with the SDK. Workspace-only: the release removes this entry from the package `exports`, so customers
 * cannot import it.
 */
export * from './schemas.js';
export { MIN_CLIP_MS, MAX_CLIP_MS, MAX_REFERENCES, MAX_VIDEO_ASSETS, SPEECH_MODES, factSchema, imageSchema } from './service-schemas.js';
export {
	scriptGenerationSchema,
	scriptAuthoringSchema,
	storyboardClipSchema,
	castEntrySchema,
	storyboardTokens,
	scriptLines,
	durationTolerance,
	scriptVersion,
	NARRATOR,
	PRODUCT,
	CHARACTER_VOICE,
	ROLE_ID,
	LINE_ID,
	MAX_CLIPS,
	MAX_SCRIPT_MS,
} from './script-v3.js';
export type { ScriptGeneration, ScriptLine, CastEntry, StoryboardToken } from './script-v3.js';
