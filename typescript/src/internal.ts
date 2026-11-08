/**
 * Everything in `@nuva/sdk/schemas` plus the Script v3 and Storyboard helpers the Agent, the mock server and the
 * playground share with the SDK. A workspace entry: the release leaves it out of the npm package and its `exports`.
 */
export * from './schemas.js';
export { storyboardIssues } from './script-v3.js';
export type { StoryboardContext } from './script-v3.js';
// The generate inputs' schemas: the Agent's writer endpoints validate with them.
export * from './generation-schemas.js';
// The frozen generation-api's contract and read-only v2 Scripts (ScriptPackage).
export { scriptResponseSchema, clipResponseSchema, videoRequestSchema, scriptRequestSchema } from './service-schemas.js';
export type { ScriptPackage, ScriptRequest, ClipResponse, VideoRequest } from './service-schemas.js';
export { encodeScriptPackage, decodeScriptPackage } from './script-content.js';
export { jsonValueSchema, jsonObjectSchema, resourceRefSchema } from '@nuva/protocol';
/** The API version the SDK and the Agent are written for (Nuva-Api-Version). */
export { API_VERSION } from './transport.js';
export { MIN_CLIP_MS, MAX_CLIP_MS, MAX_REFERENCES, MAX_VIDEO_ASSETS, SPEECH_MODES, factSchema, imageSchema } from './service-schemas.js';
export {
	scriptGenerationSchema,
	scriptAuthoringSchema,
	hasAssetRole,
	ASSET_ROLE_MESSAGE,
	instructionTokenIssues,
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
	ROLE_ID,
	LINE_ID,
	MAX_CLIPS,
	MAX_SCRIPT_MS,
} from './script-v3.js';
export type { ScriptGeneration, ScriptLine, CastEntry, StoryboardToken, ClipReferences } from './script-v3.js';
// What the Agent's internal contract (agents/ads-agent/packages/internal-contract in WhatIf) is compiled with.
export { adapted, compiler } from './backend-schema.js';
export type { Overlay as BackendOverlay } from './backend-target.js';
// The admin page records SDK traffic with it (wire-trace.ts).
export { withWireTrace } from './wire-trace.js';
export type { WireTraceEntry } from './protocol.js';
// Whether a failed write was taken (the SDK's replay decisions; not on the public error), for tests.
export { acceptanceOf } from './errors.js';
