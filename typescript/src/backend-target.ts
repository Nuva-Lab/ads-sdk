/** The backend contract's types (API version 2026-11-07), with the overlays openapi-typescript can't express. */
import type { BackendSchemas as Public } from './backend-types.js';
import type { JsonObject } from './types.js';

/** Product data as it is written; `attributes` holds JSON, typed with the SDK's JsonObject. */
export type ProductData = Public['ProductDataV2'] & { attributes?: JsonObject };
/** Product data as it is read: the backend always returns every list, empty or not. */
export type ProductReadData = Omit<ProductData, 'image_asset_ids' | 'video_asset_ids' | 'selling_points' | 'facts' | 'constraints' | 'attributes'> &
	Required<Pick<ProductData, 'image_asset_ids' | 'video_asset_ids' | 'selling_points' | 'facts' | 'constraints'>> & { attributes: JsonObject };
type WithData<T, D> = Omit<T, 'data'> & { data: D };
type ProductEditData = Public['ProductEditData'] & { attributes?: JsonObject };

// openapi-typescript renders the bare oneOf input object as Record<string, never>; express the
// backend's exactly-one constraint explicitly.
export type RawPromptInput = Public['RawPromptInput'];
type Video<S extends { GenerateVideo: unknown; RawPromptInput: unknown }> = Omit<S['GenerateVideo'], 'prompt' | 'input'> &
	({ prompt: string; input?: null } | { input: S['RawPromptInput']; prompt?: null });
export type GenerateVideoInput = Video<Public>;

/** The overlays, for either contract's schemas (the internal one is typed in internal-backend.ts). */
export type Overlay<S extends Pick<Public, 'GenerateVideo' | 'RawPromptInput' | 'Product' | 'ProductCreate' | 'ProductEdit' | 'ProductPage'>> = {
	GenerateVideo: Video<S>;
	ProductDataV2: ProductData;
	Product: WithData<S['Product'], ProductReadData>;
	ProductCreate: WithData<S['ProductCreate'], ProductData>;
	ProductEdit: Omit<S['ProductEdit'], 'data'> & { data?: ProductEditData };
	ProductEditData: ProductEditData;
	ProductPage: Omit<S['ProductPage'], 'items'> & { items: WithData<S['Product'], ProductReadData>[] };
};
/** The public contract's schemas: what customers send and read. */
export type BackendSchemas = Omit<Public, keyof Overlay<Public>> & Overlay<Public>;
