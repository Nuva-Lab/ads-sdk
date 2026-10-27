/** Explicit target overlays; observed/deployed definitions stay pinned separately. */
import type { BackendSchemas as Deployed } from './backend-types.js';
import type { BackendSchemas as VideoTarget } from './backend-video-types.js';
import type { JsonObject } from './types.js';
/** Source-verified PR target; recursive JSON attributes use the SDK JsonObject type. */
export type ProductData = Deployed['ProductDataV1'] & { attributes?: JsonObject };
type WithData<T> = Omit<T, 'data'> & { data: ProductData };
// Verified PR #2371 at e2fe0f45f7940b16f31826ce4b4c34fc0d86e764.
// openapi-typescript renders the bare oneOf input object as Record<string, never>;
// express the source's exactly-one constraint explicitly without narrowing raw data.
export type RawPromptInput = VideoTarget['RawPromptInput'];
export type GenerateVideoInput = Omit<Deployed['GenerateVideo'], 'prompt'> & (
	| { prompt: string; input?: null }
	| { input: RawPromptInput; prompt?: null }
);
type VideoOverlay = Pick<VideoTarget,
	'RawPromptInput' | 'PromptDataV1' | 'Prompt' | 'PromptCreate' | 'PromptVersionCreate' | 'ArtifactRelationship' | 'ArtifactTarget' | 'AdOut' | 'AdCreate' | 'AdPage' | 'BatchCreate' | 'Script' | 'ScriptCreate' | 'ScriptVersionCreate' | 'ScriptDataV1' | 'DirectingPlan' | 'DirectingPlanCreate' | 'DirectingPlanVersionCreate' | 'DirectingPlanDataV1' | 'Error' | 'ErrorResponse'
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
