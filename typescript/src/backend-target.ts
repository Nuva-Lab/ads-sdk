/** Explicit target overlays; observed/deployed definitions stay pinned separately. */
import type { BackendSchemas as Deployed } from './backend-types.js';
import type { BackendSchemas as VideoTarget } from './backend-video-types.js';
import type { JsonObject } from './types.js';
/** Source-verified PR target; recursive JSON attributes use the SDK JsonObject type. */
export type ProductData = Deployed['ProductDataV1'] & { attributes?: JsonObject };
type WithData<T> = Omit<T, 'data'> & { data: ProductData };
// Verified ads_backend source at 47b9f5fa0844fa1ccfd78d5c98e7ed7853fd8007 (PR #2374).
// openapi-typescript renders the bare oneOf input object as Record<string, never>;
// express the source's exactly-one constraint explicitly without narrowing raw data.
export type RawPromptInput = VideoTarget['RawPromptInput'];
export type GenerateVideoInput = Omit<Deployed['GenerateVideo'], 'prompt'> & (
	| { prompt: string; input?: null }
	| { input: RawPromptInput; prompt?: null }
);
type VideoOverlay = Pick<VideoTarget,
	'RawPromptInput' | 'PromptDataV1' | 'Prompt' | 'PromptCreate' | 'PromptVersionCreate' | 'ArtifactRelationship' | 'ArtifactTarget' | 'AdOut' | 'AdCreate' | 'AdUpdate' | 'AdPage' | 'BatchCreate' | 'Script' | 'ScriptCreate' | 'ScriptVersionCreate' | 'ScriptDataV1' | 'DirectingPlan' | 'DirectingPlanCreate' | 'DirectingPlanVersionCreate' | 'DirectingPlanDataV1' | 'Error' | 'ErrorResponse'
> & {
	GenerateVideo: GenerateVideoInput;
	BatchOut: VideoTarget['BatchOut'];
};
export type BackendSchemas = Omit<Deployed, keyof VideoOverlay | 'ProductDataV1' | 'Product' | 'ProductCreate' | 'ProductUpdate' | 'ProductPage'> & VideoOverlay & {
	ProductDataV1: ProductData;
	Product: WithData<Deployed['Product']>;
	ProductCreate: WithData<Deployed['ProductCreate']>;
	ProductUpdate: WithData<Deployed['ProductUpdate']>;
	ProductPage: Omit<Deployed['ProductPage'], 'items'> & { items: WithData<Deployed['Product']>[] };
};
export type DeployedBackendSchemas = Deployed;
