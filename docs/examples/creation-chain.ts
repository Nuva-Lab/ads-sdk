import type { NuvaClient, Asset } from '@nuva/sdk';

/** Explicitly invoked example. Running this function can submit generation work.
 * Requires configured generation and assembly services; it is not executed by
 * the documentation build. Product attributes are available on Core staging;
 * the Agent/writer/assembly deployment is a separate step. */
export async function createProductVideo(nuva: NuvaClient, file: File, revisionInstruction?: string) {
	const brand = await nuva.brands.create({ data: { name: 'Example Brand' } });
	const product = await nuva.products.create({
		brand_id: brand.id,
		data: {
			name: 'Travel cup',
			facts: ['350 ml capacity'],
			// Nested JSON supported by the staging Product contract.
			attributes: { catalog: { color: 'ocean blue', capacityMl: 350 } },
		},
	});
	const uploaded = await nuva.products.uploadImage({ base: product, file });
	let script = await nuva.scripts.generate({
		product: uploaded.productId,
		acceptable_duration_ms: { min: 8000, max: 15000 },
		instruction: 'Use supplied product facts.',
	});
	if (revisionInstruction !== undefined)
		script = await nuva.scripts.generate({
			product: uploaded.productId,
			base: script.id,
			acceptable_duration_ms: { min: 8000, max: 15000 },
			instruction: revisionInstruction,
		});
	if (script.batch_id === null) throw new Error('Generated Script must have its creation Batch.');
	const batchId = script.batch_id;
	const { prompts } = await nuva.prompts.generate({ script: script.id });
	const assets: Asset[] = [];
	for (const prompt of prompts) {
		const job = await nuva.videos.generate({ prompt: prompt.id, batch_id: batchId });
		assets.push(await job.result({ timeoutMs: 120000 }));
	}
	const clips = assets.map((asset) => {
		const duration = asset.metadata.duration_ms;
		if (typeof duration !== 'number' || !Number.isSafeInteger(duration) || duration <= 0)
			throw new Error('Registered video duration_ms is required for explicit trim bounds.');
		return { asset_id: asset.id, start_ms: 0, end_ms: duration };
	});
	const assembled = await nuva.videos.assemble({
		batch_id: batchId,
		composition: { version: 1, clips, width: 720, height: 1280, fps: 30, audio: 'preserve' },
	});
	return {
		productId: uploaded.productId,
		imageAssetId: uploaded.assetId,
		scriptId: script.id,
		promptIds: prompts.map((prompt) => prompt.id),
		assetId: assembled.assetId,
		uri: assembled.uri,
	};
}
