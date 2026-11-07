/**
 * Schemas customers validate with: the backend contract (API version 2026-11-07) and the Script and Storyboard
 * content codecs. Everything else the Agent shares with the SDK is in the workspace-only `@nuva/sdk/internal`.
 */
export { backendIdSchema } from './backend-id.js';
export { backendSchema } from './backend-schema.js';
export type { BackendSchemas } from './backend-target.js';
// Script v3 and Storyboard v1: the codecs and their schemas.
export { scriptSchema, storyboardSchema, encodeScript, decodeScript, encodeStoryboard, decodeStoryboard } from './script-v3.js';
export type { ScriptContent, StoryboardContent } from './script-v3.js';
export type { GenerateVideoInput, RawPromptInput } from './stores.js';
