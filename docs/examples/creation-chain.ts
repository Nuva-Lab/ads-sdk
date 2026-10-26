import type { NuvaClient, Asset } from '@nuva/sdk';

/** Generate editable Product clips from an image. Calling this function creates resources and submits generation Jobs. */
export async function createProductVideo(nuva: NuvaClient, file: File, revisionInstruction?: string) {
	const brand = await nuva.brands.create({ data: { name: 'Example Brand' } });
	const product = await nuva.products.create({
		brand_id: brand.id,
		data: {
			name: 'Travel cup',
			facts: ['350 ml capacity'],
			// Additional Product fields expressed as JSON.
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
	return {
		productId: uploaded.productId,
		imageAssetId: uploaded.assetId,
		scriptId: script.id,
		promptIds: prompts.map((prompt) => prompt.id),
		batchId,
		clips: assets,
	};
}
