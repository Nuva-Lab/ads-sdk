// Client Store SDK examples, checked against the current SDK and backend types.
import {
	createNuva,
	type NuvaClient,
	type AccessToken,
	type Product,
	type Artifact,
	type ResourceRef,
	type ScriptPackage,
	type JobState,
} from '@nuva/sdk';
import { encodeScriptPackage, type BackendSchemas } from '@nuva/sdk/schemas';

export function initialize(getAccessToken: () => Promise<string | AccessToken>) {
	// #region initialize
	const nuva = createNuva({ getAccessToken });
	// #endregion initialize
	return nuva;
}
export async function createProduct(nuva: NuvaClient, brandId: string, productData: BackendSchemas['ProductDataV1']) {
	// #region product-create
	const product = await nuva.products.create({ brand_id: brandId, data: productData });
	// #endregion product-create
	return product;
}
export async function readProduct(nuva: NuvaClient, productId: string) {
	// #region product-read
	const product = await nuva.products.get(productId);
	// product.id survives edits; product.revision identifies this exact version.
	// #endregion product-read
	return product;
}
export async function updateProduct(nuva: NuvaClient, product: Product, editedData: BackendSchemas['ProductDataV1']) {
	// #region product-update
	const saved = await nuva.products.update({ base: product, brand_id: product.brand_id, data: editedData });
	// Use saved as the base for the next update.
	// #endregion product-update
	return saved;
}
export async function readArtifact(nuva: NuvaClient, scriptRef: ResourceRef) {
	// #region artifact-read
	const script = await nuva.artifacts.get(scriptRef);
	// #endregion artifact-read
	return script;
}
export async function createArtifact(nuva: NuvaClient, content: ScriptPackage, product: Product) {
	// #region artifact-create
	const script = await nuva.artifacts.create({
		kind: 'script',
		schema_version: 1,
		data: { text: encodeScriptPackage(content) },
	});
	// #endregion artifact-create
	return script;
}
export async function updateArtifact(nuva: NuvaClient, script: Artifact, editedData: BackendSchemas['ScriptDataV1']) {
	// #region artifact-update
	const revised = await nuva.artifacts.update(script.ref, { data: editedData });
	// The new version has a new ID; base_id points to its parent.
	// #endregion artifact-update
	return revised;
}
export async function uploadAsset(nuva: NuvaClient, file: File, kind: BackendSchemas['AssetOut']['kind']) {
	// #region asset-upload
	const asset = await nuva.assets.upload(file, { kind });
	// The SDK requests an upload, PUTs bytes, then registers the Asset.
	// #endregion asset-upload
	return asset;
}
export async function readAsset(nuva: NuvaClient, assetId: string) {
	// #region asset-read
	const asset = await nuva.assets.get(assetId);
	// download_url_expires_at bounds access; read the same ID for a fresh URL.
	// #endregion asset-read
	return asset;
}
export async function generateVideo(nuva: NuvaClient, promptId: string, onProgress: (state: JobState) => void) {
	// #region video-job
	const job = await nuva.videos.generate({ prompt: promptId });
	const unsubscribe = job.subscribe(onProgress);
	try {
		return await job.result();
	} finally {
		unsubscribe();
	}
	// #endregion video-job
}
export async function generateScript(nuva: NuvaClient, productId: string) {
	// #region script-generate
	const script = await nuva.scripts.generate({
		product: productId,
		acceptable_duration_ms: { min: 8000, max: 15000 },
	});
	const structuredContent = script.content;
	// #endregion script-generate
	return { script, structuredContent };
}
export async function generatePrompts(nuva: NuvaClient, scriptId: string) {
	// #region prompt-generate
	const { prompts } = await nuva.prompts.generate({ script: scriptId });
	// Each independent Prompt represents a clip; pass its saved ID to videos.generate.
	// #endregion prompt-generate
	return { prompts };
}
export async function readAd(nuva: NuvaClient, adId: string) {
	// #region ad-read
	const ad = await nuva.ads.get(adId);
	// #endregion ad-read
	return ad;
}
export async function readWorkspaces(nuva: NuvaClient, batchId: string) {
	// #region workspaces-read
	const batch = await nuva.batches.get(batchId);
	// Read intent, Ads and Job counts. Do not depend on the legacy public log field.
	// #endregion workspaces-read
	return batch;
}

export async function createBrand(nuva: NuvaClient) {
	// #region brand-create
	const brand = await nuva.brands.create({ data: { name: 'Example Brand' } });
	// #endregion brand-create
	return brand;
}
export async function attachProductImage(nuva: NuvaClient, product: Product, file: File) {
	// #region product-upload-image
	const uploaded = await nuva.products.uploadImage({ base: product, file });
	// Use uploaded.product as the base for the next Product update.
	// #endregion product-upload-image
	return uploaded;
}
export async function reviseScript(nuva: NuvaClient, productId: string, scriptId: string) {
	// #region script-revise
	const revised = await nuva.scripts.generate({
		product: productId,
		base: scriptId,
		acceptable_duration_ms: { min: 8000, max: 15000 },
		instruction: 'Keep the approved facts and revise the opening.',
	});
	// #endregion script-revise
	return revised;
}

export function initializePreview(
	getAccessToken: () => Promise<string | AccessToken>,
	origins: { agent: string; generation: string; store: string },
) {
	// #region preview-initialize
	// Service URLs supplied for your environment.
	const nuva = createNuva({
		getAccessToken,
		baseUrl: origins.agent,
		generationBaseUrl: origins.generation,
		storeBaseUrl: origins.store,
	});
	// #endregion preview-initialize
	return nuva;
}
