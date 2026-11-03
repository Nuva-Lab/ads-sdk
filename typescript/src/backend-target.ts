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
export type StoryboardClip = VideoTarget['StoryboardClip'];
export type GenerateVideoInput = Omit<VideoTarget['GenerateVideo'], 'prompt' | 'input' | 'storyboard'> & (
	| { prompt: string; input?: null; storyboard?: null }
	| { input: RawPromptInput; prompt?: null; storyboard?: null }
	| { storyboard: StoryboardClip; prompt?: null; input?: null }
);
type VideoOverlay = Pick<VideoTarget,
	'RawPromptInput' | 'PromptDataV1' | 'Prompt' | 'PromptCreate' | 'PromptVersionCreate' | 'ArtifactRelationship' | 'ArtifactTarget' | 'AdOut' | 'AdCreate' | 'AdUpdate' | 'AdPage' | 'BatchCreate' | 'Script' | 'ScriptCreate' | 'ScriptVersionCreate' | 'ScriptDataV1' | 'DirectingPlan' | 'DirectingPlanCreate' | 'DirectingPlanVersionCreate' | 'DirectingPlanDataV1' | 'Error' | 'ErrorResponse' | 'Storyboard' | 'StoryboardCreate' | 'StoryboardVersionCreate' | 'StoryboardDataV1' | 'StoryboardClip' | 'AssetOut' | 'AssetCreate'
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
