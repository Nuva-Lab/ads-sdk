// Client Store SDK examples, checked against the current SDK and backend types.
import {
	createNuva,
	type NuvaClient,
	type AccessToken,
	type Product,
	type Script,
	type ResourceRef,
	type JobState,
	type NuvaErrorInfo,
} from '@nuva/sdk';
import type { BackendSchemas, ScriptContent } from '@nuva/sdk/schemas';

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
export async function editScript(nuva: NuvaClient, script: Script, content: ScriptContent) {
	// #region script-update
	// Scripts are written by the writer (scripts.generate) and changed with scripts.revise or scripts.update.
	const revised = await nuva.scripts.update(script.ref, { content });
	// The new version has a new ID; base_id points to its parent.
	// #endregion script-update
	return revised;
}
export async function uploadAsset(nuva: NuvaClient, file: File, kind: BackendSchemas['AssetOut']['kind']) {
	// #region asset-upload
	const asset = await nuva.assets.upload(file, { kind, label: 'Box, front', description: 'The front of the gift box.' });
	// The SDK requests an upload, PUTs bytes, then registers the Asset with its label and description.
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
export async function submitVideo(nuva: NuvaClient, promptId: string, requestKey: string) {
	// #region video-job
	// Persist the Prompt ID and requestKey before calling; keep the returned Job ID.
	const job = await nuva.videos.generate({ prompt: promptId }, { idempotencyKey: requestKey });
	return job;
	// #endregion video-job
}
export function followVideo(nuva: NuvaClient, jobId: string, onProgress: (state: JobState) => void, onError: (error: NuvaErrorInfo) => void) {
	// Reopen progress using the saved ID, without submitting another Job.
	// Return the unsubscribe function to the UI owner; unsubscribing does not cancel the Job.
	return nuva.jobs.subscribe(jobId, onProgress, onError);
}
export async function generateScript(nuva: NuvaClient, productId: string) {
	// #region script-generate
	const script = await nuva.scripts.generate({
		product: productId,
		acceptable_duration_ms: { min: 8000, max: 15000 },
	});
	// A new Script is v3: concept, roles and panels with exact lines.
	const structuredContent = script.format === 3 ? script.content : undefined;
	// #endregion script-generate
	return { script, structuredContent };
}
export async function generateStoryboard(nuva: NuvaClient, scriptId: string, characterId: string) {
	// #region storyboard-generate
	// cast is keyed by the Script's role IDs; roles left out are cast by the writer.
	const storyboard = await nuva.storyboards.generate({ script: scriptId, cast: { host: characterId } });
	// #endregion storyboard-generate
	return storyboard;
}
export async function compileStoryboard(nuva: NuvaClient, storyboardId: string) {
	// #region prompts-generate
	// One saved Prompt per clip, in clip order; a clip compiled before from the same inputs keeps its Prompt.
	const { prompts } = await nuva.prompts.generate({ storyboard: storyboardId, ratio: '9:16' });
	// Render each one with videos.generate({ prompt: prompt.id }).
	// #endregion prompts-generate
	return prompts;
}
export async function createCharacter(nuva: NuvaClient, imageAssetId: string, voiceAssetId: string) {
	// #region character-create
	const character = await nuva.characters.create({
		data: { name: 'Mia', description: 'Late twenties, warm, standard Mandarin.', image_asset_ids: [imageAssetId], voice_asset_id: voiceAssetId },
	});
	// #endregion character-create
	return character;
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
	// Read intent, Ads and Job counts.
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
export async function reviseScript(nuva: NuvaClient, scriptId: string) {
	// #region script-revise
	const revised = await nuva.scripts.revise(
		{ kind: 'script', id: scriptId },
		{ instruction: 'Keep the approved facts and revise the opening.', acceptable_duration_ms: { min: 8000, max: 15000 } },
	);
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
