import type { NuvaClient, Asset } from '@nuva/sdk';

export interface VideoSubmission {
	input: { prompt: string; batch_id: string };
	idempotencyKey: string;
	jobId?: string;
	assetId?: string;
}
export interface CreationProgress {
	started: boolean;
	brandId?: string;
	productId?: string;
	imageAssetId?: string;
	scriptIds: string[];
	batchId?: string;
	promptIds: string[];
	videos: VideoSubmission[];
}
export type SaveProgress = (snapshot: CreationProgress) => Promise<void>;

/**
 * Application example, not an SDK method. Start with
 * { started: false, scriptIds: [], promptIds: [], videos: [] }.
 * Keep this object when a call fails, and persist snapshots in your application.
 * This starts new work once. Resume video submission/waiting with the functions below;
 * do not rerun the entire creation flow to recover an accepted Job.
 */
export async function createProductVideo(
	nuva: NuvaClient,
	file: File,
	progress: CreationProgress,
	saveProgress: SaveProgress,
	revisionInstruction?: string,
) {
	if (progress.started) throw new Error('Inspect the saved progress instead of restarting this creation.');
	progress.started = true;
	await saveProgress(structuredClone(progress));

	const brand = await nuva.brands.create({ data: { name: 'Example Brand' } });
	progress.brandId = brand.id;
	await saveProgress(structuredClone(progress));
	const product = await nuva.products.create({
		brand_id: brand.id,
		data: { name: 'Travel cup', facts: ['350 ml capacity'], attributes: { catalog: { color: 'ocean blue', capacityMl: 350 } } },
	});
	progress.productId = product.id;
	await saveProgress(structuredClone(progress));
	const uploaded = await nuva.products.uploadImage({ base: product, file });
	progress.imageAssetId = uploaded.assetId;
	await saveProgress(structuredClone(progress));
	let script = await nuva.scripts.generate({
		product: uploaded.productId,
		acceptable_duration_ms: { min: 8000, max: 15000 },
		instruction: 'Use supplied product facts.',
	});
	progress.scriptIds.push(script.id);
	await saveProgress(structuredClone(progress));
	if (revisionInstruction !== undefined) {
		script = await nuva.scripts.generate({
			product: uploaded.productId, base: script.id,
			acceptable_duration_ms: { min: 8000, max: 15000 }, instruction: revisionInstruction,
		});
		progress.scriptIds.push(script.id);
		await saveProgress(structuredClone(progress));
	}
	if (script.batch_id === null) throw new Error('Generated Script must have its creation Batch.');
	const batchId = script.batch_id;
	progress.batchId = batchId;
	await saveProgress(structuredClone(progress));
	const { prompts } = await nuva.prompts.generate({ script: script.id });
	progress.promptIds = prompts.map(prompt => prompt.id);
	progress.videos = prompts.map(prompt => ({ input: { prompt: prompt.id, batch_id: batchId }, idempotencyKey: crypto.randomUUID() }));
	// Persist exact submission inputs and keys BEFORE contacting the video service.
	await saveProgress(structuredClone(progress));
	await submitPendingVideos(nuva, progress, saveProgress);
	return progress;
}

/** Explicit retry of saved video submissions. Requires the backend's documented idempotency support. */
export async function submitPendingVideos(nuva: NuvaClient, progress: CreationProgress, saveProgress: SaveProgress) {
	for (const submission of progress.videos) {
		if (submission.jobId !== undefined) continue;
		await saveProgress(structuredClone(progress));
		const job = await nuva.videos.generate(submission.input, { idempotencyKey: submission.idempotencyKey });
		submission.jobId = job.id;
		// The caller's progress also retains this ID if saving the snapshot fails.
		await saveProgress(structuredClone(progress));
	}
}

/** Call again after a timeout to resume reads; this function never submits a new Job. */
export async function waitForProductVideos(nuva: NuvaClient, progress: CreationProgress, saveProgress: SaveProgress, timeoutMs = 120000) {
	if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new Error('timeoutMs must be a nonnegative finite number.');
	const clips: Asset[] = [];
	for (const submission of progress.videos) {
		if (submission.jobId === undefined) throw new Error('Reconcile the saved submission before waiting for its result.');
		if (submission.assetId === undefined)
			submission.assetId = await waitForSavedJob(nuva, submission.jobId, timeoutMs);
		await saveProgress(structuredClone(progress));
		// Read the SDK Asset resource for current authorized media URLs.
		clips.push(await nuva.assets.get(submission.assetId));
	}
	return clips;
}

// jobs.get returns a saved Job state, not the handle returned by videos.generate.
async function waitForSavedJob(nuva: NuvaClient, jobId: string, timeoutMs: number): Promise<string> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const state = await nuva.jobs.get(jobId);
		if (state.status === 'completed') {
			if (state.asset === null) throw new Error(`Completed Job ${jobId} has no Asset.`);
			return state.asset.id;
		}
		if (state.status === 'failed' || state.status === 'cancelled')
			throw new Error(`Job ${jobId} is ${state.status}.${state.error === null ? '' : ' ' + state.error}`);
		const remaining = deadline - Date.now();
		if (remaining <= 0) throw new Error(`Wait timed out for Job ${jobId}; the Job continues.`);
		await new Promise(resolve => setTimeout(resolve, Math.min(1500, remaining)));
	}
}
