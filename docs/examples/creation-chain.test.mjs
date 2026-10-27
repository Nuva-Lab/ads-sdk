import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../typescript/package.json', import.meta.url));
const ts = require('typescript');
const source = readFileSync(new URL('./creation-chain.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const example = {};
new Function('exports', compiled)(example);
const fresh = () => ({ started: false, scriptIds: [], promptIds: [], videos: [] });

function fixture() {
	const counts = { brands: 0, submissions: 0, waits: [], reads: [] };
	const accepted = new Map();
	const snapshots = [];
	let loseSubmission = false, failWait;
	const nuva = {
		brands: { create: async () => ({ id: `brand-${++counts.brands}` }) },
		products: {
			create: async () => ({ id: 'product' }),
			uploadImage: async () => ({ productId: 'product', assetId: 'image' }),
		},
		scripts: { generate: async () => ({ id: 'script', batch_id: 'batch' }) },
		prompts: { generate: async () => ({ prompts: [{ id: 'prompt-1' }, { id: 'prompt-2' }] }) },
		videos: { generate: async (input, options) => {
			counts.submissions++;
			assert.ok(snapshots.some(snapshot => snapshot.videos.some(item => item.idempotencyKey === options.idempotencyKey && JSON.stringify(item.input) === JSON.stringify(input))), 'Persist the exact key/input before submitting.');
			if (!accepted.has(options.idempotencyKey)) accepted.set(options.idempotencyKey, { id: `job-${accepted.size + 1}`, input: structuredClone(input) });
			assert.deepEqual(accepted.get(options.idempotencyKey).input, input);
			if (loseSubmission) { loseSubmission = false; throw new Error('Response lost after acceptance'); }
			return accepted.get(options.idempotencyKey);
		} },
		jobs: { get: async id => {
			counts.waits.push(id);
			if (failWait === id) { failWait = undefined; return { id, status: 'running', asset: null, error: null }; }
			return { id, status: 'completed', asset: { id: `asset-${id}` }, error: null };
		} },
		assets: { get: async id => { counts.reads.push(id); return { id }; } },
	};
	return { nuva, counts, accepted, snapshots, save: async value => snapshots.push(structuredClone(value)), loseNextSubmission: () => { loseSubmission = true; }, failNextWait: id => { failWait = id; } };
}

test('a timed-out wait retains Job IDs and resumes reads without new generation', async () => {
	const f = fixture(), progress = fresh();
	await example.createProductVideo(f.nuva, {}, progress, f.save);
	assert.equal(f.counts.waits.length, 0, 'Submission returns accepted IDs before waiting.');
	f.failNextWait('job-1');
	await assert.rejects(example.waitForProductVideos(f.nuva, progress, f.save, 0), /timed out/);
	assert.deepEqual(progress.videos.map(item => item.jobId), ['job-1', 'job-2']);
	assert.deepEqual((await example.waitForProductVideos(f.nuva, progress, f.save)).map(asset => asset.id), ['asset-job-1', 'asset-job-2']);
	assert.equal(f.counts.brands, 1);
	assert.equal(f.counts.submissions, 2);
	await assert.rejects(example.createProductVideo(f.nuva, {}, progress, f.save), /saved progress/);
	assert.equal(f.counts.brands, 1);
});

test('an uncertain submission retries only its saved key/input and preserves earlier resources', async () => {
	const f = fixture(), progress = fresh();
	f.loseNextSubmission();
	await assert.rejects(example.createProductVideo(f.nuva, {}, progress, f.save), /Response lost/);
	const key = progress.videos[0].idempotencyKey;
	assert.equal(progress.brandId, 'brand-1');
	assert.equal(progress.productId, 'product');
	assert.equal(progress.imageAssetId, 'image');
	assert.deepEqual(progress.scriptIds, ['script']);
	assert.deepEqual(progress.promptIds, ['prompt-1', 'prompt-2']);
	await example.submitPendingVideos(f.nuva, progress, f.save);
	assert.equal(progress.videos[0].idempotencyKey, key);
	assert.equal(progress.videos[0].jobId, 'job-1');
	assert.equal(f.accepted.size, 2);
	assert.equal(f.counts.brands, 1);
});

test('partial clip completion is retained when a later clip times out', async () => {
	const f = fixture(), progress = fresh();
	await example.createProductVideo(f.nuva, {}, progress, f.save);
	f.failNextWait('job-2');
	await assert.rejects(example.waitForProductVideos(f.nuva, progress, f.save, 0), /timed out/);
	assert.equal(progress.videos[0].assetId, 'asset-job-1');
	await example.waitForProductVideos(f.nuva, progress, f.save);
	assert.deepEqual(f.counts.waits, ['job-1', 'job-2', 'job-2']);
	assert.deepEqual(f.counts.reads, ['asset-job-1', 'asset-job-1', 'asset-job-2']);
	assert.equal(f.counts.submissions, 2);
});

test('a failed persistence callback still leaves an accepted Job in caller-owned progress', async () => {
	const f = fixture(), progress = fresh();
	let fail = true;
	const save = async snapshot => {
		await f.save(snapshot);
		if (fail && snapshot.videos[0]?.jobId) { fail = false; throw new Error('Progress storage unavailable'); }
	};
	await assert.rejects(example.createProductVideo(f.nuva, {}, progress, save), /storage unavailable/);
	assert.equal(progress.videos[0].jobId, 'job-1');
	await example.submitPendingVideos(f.nuva, progress, save);
	assert.equal(f.counts.submissions, 2);
	assert.equal(f.accepted.size, 2);
});
