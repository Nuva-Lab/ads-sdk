import { backendIdSchema } from './backend-id.js';
export { backendIdSchema } from './backend-id.js';
import { backendSchema as pinnedSchema } from './backend-schema.js';
import { z } from 'zod';
import { scriptResponseSchema, clipResponseSchema, videoRequestSchema, scriptRequestSchema } from './service-schemas.js';
import type { ArtifactSchema } from './stores.js';
export { scriptResponseSchema, clipResponseSchema, videoRequestSchema, scriptRequestSchema };
export type { ScriptPackage, ScriptRequest, ClipResponse, VideoRequest } from './service-schemas.js';
import { jsonValueSchema, jsonObjectSchema, resourceRefSchema } from '@nuva/protocol';
export { jsonValueSchema, jsonObjectSchema, resourceRefSchema };
export * from './generation-schemas.js';
export const ScriptSchema = Object.freeze({
	kind: 'script',
	schemaVersion: 1,
	parse: (data: unknown) => pinnedSchema('ScriptDataV1').parse(data),
} as const);
export const PromptSchema = Object.freeze({
	kind: 'prompt',
	schemaVersion: 1,
	parse: (data: unknown) => pinnedSchema('PromptDataV1').parse(data),
} as const);
/** The snapshot payload schema is not frozen; this codec checks its JSON shape. */
export const PerformanceSnapshotSchema = Object.freeze({
	kind: 'performance_snapshot',
	schemaVersion: 1,
	parse: (data: unknown) => jsonObjectSchema.parse(data),
} as const);
export function defineArtifactSchema<K extends string, D>(schema: ArtifactSchema<K, D>): ArtifactSchema<K, D> {
	return Object.freeze({ ...schema });
}

export { backendSchema } from './backend-schema.js';
export type { BackendSchemas, DeployedBackendSchemas } from './backend-target.js';
export { encodeScriptPackage, decodeScriptPackage } from './script-content.js';
// Script v3 and Storyboard v1: the codecs, their schemas and the Storyboard checks. Other helpers are internal.
export { scriptSchema, storyboardSchema, encodeScript, decodeScript, encodeStoryboard, decodeStoryboard, storyboardIssues } from './script-v3.js';
export type { ScriptContent, StoryboardContent, StoryboardContext } from './script-v3.js';

export type { GenerateVideoInput, RawPromptInput } from './stores.js';
