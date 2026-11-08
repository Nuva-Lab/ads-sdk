// Client Store SDK examples, checked against the current SDK and backend types.
import {
	createNuva,
	type NuvaClient,
	type AccessToken,
	type Product,
	type Script,
	type ResourceRef,
	type JobState,
	type AdsErrorInfo,
} from '@nuva/sdk';
import type { BackendSchemas, ScriptContent } from '@nuva/sdk/schemas';

export function initialize(getAccessToken: () => Promise<string | AccessToken>) {
	// #region initialize
	const nuva = createNuva({ getAccessToken });
	// #endregion initialize
	return nuva;
}
export async function createProduct(nuva: NuvaClient, brandId: string, productData: BackendSchemas['ProductDataV2']) {
	// #region product-create
	const product = await nuva.products.create({ brand_id: brandId, data: productData });
	// #endregion product-create
	return product;
}
export async function readProduct(nuva: NuvaClient, productId: string) {
	// #region product-read
	const product = await nuva.products.get(productId);
	// product.id survives edits; product.version is the version you read.
	// #endregion product-read
	return product;
}
export async function updateProduct(nuva: NuvaClient, product: Product, sellingPoints: string[]) {
	// #region product-update
	// Only the fields in data change. A newer version saved since fails with REVISION_CONFLICT.
	const saved = await nuva.products.update(product, { data: { selling_points: sellingPoints } });
	// Use saved for the next update.
	// #endregion product-update
	return saved;
}
export async function readScript(nuva: NuvaClient, scriptRef: ResourceRef<'script'>) {
	// #region artifact-read
	const script = await nuva.scripts.get(scriptRef);
	// #endregion artifact-read
	return script;
}
export async function editScript(nuva: NuvaClient, script: Script, changes: Partial<ScriptContent>) {
	// #region script-update
	// The writer writes Scripts (scripts.generate, scripts.generateFrom); createFrom saves your own changes.
	const edited = await nuva.scripts.createFrom(script.ref, changes);
	// A new Script with a new ID; base_id is the one it came from, which stays as it was.
	// #endregion script-update
	return edited;
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
export function followVideo(nuva: NuvaClient, jobId: string, onProgress: (state: JobState) => void, onError: (error: AdsErrorInfo) => void) {
	// Reopen progress using the saved ID, without submitting another Job.
	// Return the unsubscribe function to the UI owner; unsubscribing does not cancel the Job.
	return nuva.jobs.subscribe(jobId, onProgress, onError);
}
export async function generateScript(nuva: NuvaClient, productId: string) {
	// #region script-generate
	const script = await nuva.scripts.generate({
		product: { id: productId },
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
	const storyboard = await nuva.storyboards.generate({ script: scriptId, cast: { host: { id: characterId } } });
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
	const image = await nuva.assets.upload(file, { kind: 'image', label: 'Cup, side' });
	// If the update fails, the Asset is still saved: retry the update with image.id instead of uploading again.
	const saved = await nuva.products.update(product, { data: { image_asset_ids: [...(product.data.image_asset_ids ?? []), image.id] } });
	// #endregion product-upload-image
	return saved;
}
export async function reviseScript(nuva: NuvaClient, scriptId: string) {
	// #region script-revise
	const revised = await nuva.scripts.generateFrom(
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
