import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createNuva, PartialCreationError } from '../dist/index.js';
import { backendSchema } from '../dist/schemas.js';

// OrderedUUID deliberately does not require an RFC UUID version/variant.
const id = '01a175e0-31b3-da69-176e-0842e6f6602e';
const promptId = '01a175e0-2000-0000-ffff-abcdefabcdef';
const jobId = '01a175e0-3000-cccc-1111-abcdefabcdef';
const relationships = [{ type: 'based_on', target: { kind: 'script', id } }];
const data = {
	prompt: '<Picture 2> follows <Picture 1> with <Video 1> and <Audio 1>.',
	image_asset_ids: [promptId, id],
	video_asset_ids: [id],
	audio_asset_ids: [id],
	characters: [id],
	seconds: 5,
	ratio: '9:16',
};
const input = { schema_version: 1, data };
const queued = {
	id: jobId, prompt: promptId, status: 'queued', seed: 7, resolution: '768P',
	batch_id: id, asset: null, checkpoint: null, error: null, callback: null,
	created_at: '2026-10-26T12:00:00Z',
};
const savedPrompt = {
	kind: 'prompt', id: promptId, lineage_id: promptId, base_id: null, schema_version: 1,
	data, relationships, batch_id: id, created_at: queued.created_at,
	assets: {}, entities: {}, skills: {},
};

async function withClient(fetcher, run) {
	const savedFetch = globalThis.fetch;
	globalThis.fetch = fetcher;
	const client = createNuva({
		baseUrl: 'http://127.0.0.1:9010/api', storeBaseUrl: 'http://127.0.0.1:9011',
		getAccessToken: async () => 'local-contract-test-only',
	});
	try { await run(client); }
	finally { client.close(); globalThis.fetch = savedFetch; }
}

test('video target has separate provenance and leaves the observed contract intact', async () => {
	const raw = await readFile(new URL('../schema/backend-video.openapi.json', import.meta.url), 'utf8');
	const source = JSON.parse(await readFile(new URL('../schema/backend-video.source.json', import.meta.url), 'utf8'));
	const observed = JSON.parse(await readFile(new URL('../schema/backend.openapi.json', import.meta.url), 'utf8'));
	const target = JSON.parse(raw).components.schemas;
	assert.equal(createHash('sha256').update(raw).digest('hex'), source.sha256);
	assert.equal(source.commit, 'e2fe0f45f7940b16f31826ce4b4c34fc0d86e764');
	assert.equal(source.pullRequest, 'https://github.com/Nuva-Lab/WhatIf/pull/2371');
	assert.match(source.status, /target-only/);
	assert.equal(observed.components.schemas.GenerateVideo.properties.input, undefined);
	assert.equal(target.GenerateVideo.oneOf.length, 2);
	for (const name of Object.keys(target).filter((name) => !source.overlaySchemas.includes(name)))
		assert.deepEqual(target[name], observed.components.schemas[name], `${name} dependency must stay equal to the observed schema`);
});

test('saved ID and raw input accept the backend null/omission and option boundaries', () => {
	const schema = backendSchema('GenerateVideo');
	assert.deepEqual(schema.parse({ prompt: id }), { prompt: id, seed: 0 });
	assert.deepEqual(schema.parse({ prompt: id, input: null }), { prompt: id, input: null, seed: 0 });
	for (const other of [{}, { prompt: null }]) {
		const value = { input, ...other, seed: Number.MAX_SAFE_INTEGER, resolution: null, callback_url: null, batch_id: null };
		assert.deepEqual(schema.parse(value), value);
	}
	for (const relationships of [undefined, null, []]) {
		const raw = { schema_version: 1, data: { prompt: 'Raw text' }, ...(relationships === undefined ? {} : { relationships }) };
		const parsed = schema.parse({ input: raw });
		assert.equal(parsed.input.data.prompt, 'Raw text');
		assert.deepEqual(parsed.input.relationships, relationships);
	}
	const boundaries = { ...data, prompt: 'x'.repeat(10000), image_asset_ids: Array(9).fill(id), video_asset_ids: Array(3).fill(id), audio_asset_ids: Array(3).fill(id), characters: Array(10).fill(id), seconds: 15 };
	// Cross-list model limits and Asset ownership/kinds remain backend checks.
	assert.equal(schema.safeParse({ input: { schema_version: 1, data: boundaries, relationships: Array(100).fill(relationships[0]) } }).success, true);
	for (const ratio of ['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16', null])
		assert.equal(schema.safeParse({ input: { schema_version: 1, data: { prompt: 'Raw', ratio, seconds: null } } }).success, true);
});

const invalidBodies = [
	{}, { prompt: null }, { input: null }, { prompt: null, input: null },
	{ prompt: id, input }, { prompt: 'raw text' }, { input: 'raw text' },
	{ input: {} }, { input: { schema_version: 2, data } },
	{ input, seed: -1 }, { input, seed: 0.5 }, { input, seed: Number.MAX_SAFE_INTEGER + 1 },
	{ input, resolution: '720p' }, { input, batch_id: 'bad-id' },
	{ input, callback_url: 'x'.repeat(2049) }, { input, invented: true },
	{ input: { ...input, invented: true } },
	...[
		{ prompt: '' }, { prompt: 'x'.repeat(10001) }, { image_asset_ids: ['https://example.com/image.png'] },
		{ image_asset_ids: [id + '\n'] }, { video_asset_ids: ['bad-id'] }, { audio_asset_ids: ['bad-id'] },
		{ characters: ['bad-id'] }, { image_asset_ids: Array(10).fill(id) },
		{ video_asset_ids: Array(4).fill(id) }, { audio_asset_ids: Array(4).fill(id) },
		{ characters: Array(11).fill(id) }, { seconds: 4.9 }, { seconds: 15.1 },
		{ ratio: 'bad-ratio' }, { image_asset_ids: null }, { plan: id }, { clip_key: 'clip' }, { seed: 7 },
	].map((change) => ({ input: { ...input, data: { ...data, ...change } } })),
	{ input: { ...input, relationships: Array(101).fill(relationships[0]) } },
	{ input: { ...input, relationships: [{ type: 'reference', target: { kind: 'script', id } }] } },
	{ input: { ...input, relationships: [{ type: 'based_on', target: { kind: 'batch', id } }] } },
	{ input: { ...input, relationships: [{ type: 'based_on', target: { kind: 'script', id: 'bad-id' } }] } },
];

test('invalid video requests fail locally before HTTP submission', async () => {
	let requests = 0;
	await withClient(async () => { requests++; throw new Error('Invalid input reached HTTP'); }, async (client) => {
		for (const body of invalidBodies) {
			assert.equal(backendSchema('GenerateVideo').safeParse(body).success, false, JSON.stringify(body).slice(0, 500));
			await assert.rejects(client.videos.generate(body), (error) => error.code === (body.input && Object.hasOwn(body.input, 'relationships') ? 'UNSUPPORTED_OPERATION' : 'INVALID_INPUT'));
		}
	});
	assert.equal(requests, 0);
});

test('raw generation forwards ordered Asset IDs and stable keys, then reads its saved Prompt', async () => {
	const requests = [];
	const body = { input, seed: 7, resolution: '768P', batch_id: id, callback_url: 'https://example.com/video-done' };
	await withClient(async (url, options) => {
		requests.push({ url: String(url), options });
		return Response.json(options.method === 'GET' ? savedPrompt : queued, { status: options.method === 'GET' ? 200 : 202 });
	}, async (client) => {
		const options = { idempotencyKey: 'raw-video-stable-key', requestId: 'local-video-request' };
		const first = await client.videos.generate(body, options);
		const replay = await client.videos.generate(body, options);
		assert.equal(first.id, jobId);
		assert.equal(first.prompt, promptId);
		assert.equal(first.status, 'queued');
		assert.equal(first.asset, null);
		assert.equal(replay.id, first.id);
		assert.equal(replay.prompt, first.prompt);
		assert.equal(typeof first.result, 'function');
		assert.equal(typeof first.subscribe, 'function');
		const saved = await client.prompts.get({ kind: 'prompt', id: first.prompt });
		assert.deepEqual(saved.data, data);
		assert.deepEqual(saved.relationships, relationships);
		assert.equal(saved.id, first.prompt);
		assert.deepEqual(saved.ref, { kind: 'prompt', id: promptId });
	});
	assert.equal(requests.length, 3, 'No separate Prompt creation, polling or provider invocation');
	for (const request of requests.slice(0, 2)) {
		assert.equal(request.url, 'http://127.0.0.1:9011/v1/generate/video');
		assert.deepEqual(JSON.parse(request.options.body), body);
		assert.equal(new Headers(request.options.headers).get('Idempotency-Key'), 'raw-video-stable-key');
	}
	assert.equal(requests[2].url, `http://127.0.0.1:9011/v1/artifacts/prompt/${promptId}`);
	assert.deepEqual(input.data.image_asset_ids, [promptId, id], 'Caller reference ordering remains unchanged');
});

test('saved Prompt mode retains its original keyed request and does not invent a key', async () => {
	const requests = [];
	await withClient(async (_url, options) => { requests.push(options); return Response.json({ ...queued, prompt: id }, { status: 202 }); }, async (client) => {
		for (const options of [{ idempotencyKey: 'existing-key' }, undefined]) {
			const job = await client.videos.generate({ prompt: id }, options);
			assert.equal(job.prompt, id);
		}
	});
	for (const request of requests) assert.deepEqual(JSON.parse(request.body), { prompt: id, seed: 0 });
	assert.equal(new Headers(requests[0].headers).get('Idempotency-Key'), 'existing-key');
	assert.equal(new Headers(requests[1].headers).get('Idempotency-Key'), null);
});

test('backend validation failures preserve reference paths and idempotency conflicts', async () => {
	const detail = { path: 'input.data.video_asset_ids.0', message: 'Not a video asset.' };
	for (const [status, code, details] of [[422, 'INVALID_REFERENCE', [detail]], [409, 'IDEMPOTENCY_CONFLICT', []]]) {
		await withClient(async () => Response.json({ error: { code, message: 'Backend rejected request', details, retryable: false }, request_id: 'local-backend-error' }, { status }), async (client) => {
			await assert.rejects(client.videos.generate({ input }, { idempotencyKey: 'same-key' }), (error) => {
				assert.equal(error.code, code);
				assert.deepEqual(error.details, details);
				return true;
			});
		});
	}
});

test('Prompt partial receipts retain relationships and still reject Plan associations', () => {
	const info = { code: 'PARTIAL_CREATION', message: 'Saved one Prompt', retryable: false };
	const error = new PartialCreationError(info, { prompts: [savedPrompt] });
	assert.deepEqual(error.saved.prompts[0].relationships, relationships);
	const planned = { ...savedPrompt, relationships: [{ type: 'based_on', target: { kind: 'directing_plan', id } }] };
	assert.throws(() => new PartialCreationError(info, { prompts: [planned] }), (error) => error.code === 'SERVICE_ERROR');
	assert.throws(() => new PartialCreationError(info, { prompts: [{ ...savedPrompt, data: { ...data, plan: id } }] }), (error) => error.code === 'SERVICE_ERROR');
});
