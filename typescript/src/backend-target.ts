/** Explicit target overlay. The pinned/deployed OpenAPI does not accept Product attributes. */
import type { BackendSchemas as Deployed } from './backend-types.js';
import type { JsonObject } from './types.js';
export type ProductData = Deployed['ProductDataV1'] & { attributes?: JsonObject };
type WithData<T> = Omit<T, 'data'> & { data: ProductData };
export type BackendSchemas = Omit<Deployed, 'ProductDataV1' | 'Product' | 'ProductCreate' | 'ProductUpdate' | 'ProductPage'> & {
	ProductDataV1: ProductData;
	Product: WithData<Deployed['Product']>;
	ProductCreate: WithData<Deployed['ProductCreate']>;
	ProductUpdate: WithData<Deployed['ProductUpdate']>;
	ProductPage: Omit<Deployed['ProductPage'], 'items'> & { items: WithData<Deployed['Product']>[] };
};
export type DeployedBackendSchemas = Deployed;
