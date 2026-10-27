import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNuva } from '../dist/index.js';
import { backendSchema } from '../dist/schemas.js';

const id = '01a175e0-31b3-da69-176e-0842e6f6602e';
const created_at = '2026-10-26T12:00:00Z';
const asset = { id, kind: 'video', mime: 'video/mp4', source: 'generated', size_bytes: 10, metadata: { duration_ms: 5000 }, created_at, download_url: 'https://example.com/video.mp4', download_url_expires_at: '2026-10-27T12:00:00Z' };
const ad = { id, version: 1, batch_id: null, schema_version: 1, composition: null, asset, assets: {}, created_at };
const batch = { id, intent: 'Create a clip', created_at, ads: [], jobs: {} };
const log = [{ id, text: 'Previously approved production update.', created_at }];

test('Ad and Batch definitions are PR targets; observed schemas remain separately pinned', async () => {
	const target = JSON.parse(await readFile(new URL('../schema/backend-video.openapi.json', import.meta.url), 'utf8')).components.schemas;
	const observed = JSON.parse(await readFile(new URL('../schema/backend.openapi.json', import.meta.url), 'utf8')).components.schemas;
	assert.equal(target.BatchOut.properties.log, undefined);
	assert.equal(target.BatchOut.required.includes('log'), false);
	assert.equal(observed.BatchOut.required.includes('log'), true);
	assert.equal(observed.AdOut.properties.version, undefined);
	assert.equal(target.AdOut.required.includes('version'), true);
	assert.deepEqual(target.AdCreate.required, ['schema_version', 'asset_id']);
});

test('Batch reads omit public logs and reject a legacy backend response', () => {
	assert.deepEqual(backendSchema('BatchOut').parse(batch), batch);
	for (const entries of [[], log]) assert.equal(backendSchema('BatchOut').safeParse({ ...batch, log: entries }).success, false);
	for (const invalid of [null, [{ text: 'Missing identity and timestamp' }]])
		assert.equal(backendSchema('BatchOut').safeParse({ ...batch, log: invalid }).success, false);
	for (const key of ['id', 'intent', 'created_at', 'ads', 'jobs']) {
		const partial = { ...batch }; delete partial[key];
		assert.equal(backendSchema('BatchOut').safeParse(partial).success, false, key);
	}
});

test('Ad null metadata is explicit and missing legacy version or required fields are rejected', () => {
	assert.deepEqual(backendSchema('AdOut').parse(ad), ad);
	const composition = { clips: [{ asset_id: id }], audio_asset_ids: [], editor: { zoom: 2 } };
	assert.deepEqual(backendSchema('AdOut').parse({ ...ad, version: 3, batch_id: id, composition }).composition, composition);
	for (const key of ['version', 'batch_id', 'composition', 'asset']) {
		const partial = { ...ad }; delete partial[key];
		assert.equal(backendSchema('AdOut').safeParse(partial).success, false, key);
		assert.equal(backendSchema('AdPage').safeParse({ items: [partial], next_cursor: null }).success, false, key);
	}
	const minimal = { schema_version: 1, asset_id: id };
	assert.deepEqual(backendSchema('AdCreate').parse(minimal), minimal, 'Omission stays omission; SDK does not invent composition or a Batch');
	assert.deepEqual(backendSchema('AdCreate').parse({ ...minimal, batch_id: null, composition: null }), { ...minimal, batch_id: null, composition: null });
	assert.deepEqual(backendSchema('BatchCreate').parse({ intent: 'Create', log_uri: null }), { intent: 'Create', log_uri: null });
	assert.equal(backendSchema('BatchCreate').parse({ intent: 'Create', log_uri: 'r2://agent-logs/batches/log.jsonl' }).log_uri, 'r2://agent-logs/batches/log.jsonl');
	assert.equal(backendSchema('BatchCreate').safeParse({ intent: 'Create', log_uri: 'https://example.com/log' }).success, false);
});

test('mocked customer reads retain nullable Ad metadata and versions without public Batch logs', async () => {
	const original = globalThis.fetch;
	const requests = [];
	globalThis.fetch = async (url, options) => {
		requests.push({ url: String(url), method: options.method });
		const path = new URL(url).pathname;
		if (path === '/v1/ads') return Response.json({ items: [ad], next_cursor: null });
		if (path === `/v1/ads/${id}`) return Response.json(ad);
		if (path === `/v1/batches/${id}`) return Response.json(batch);
		throw new Error(`Unexpected mocked request: ${path}`);
	};
	const client = createNuva({ baseUrl: 'http://127.0.0.1:9010/api', storeBaseUrl: 'http://127.0.0.1:9011', getAccessToken: async () => 'local-test-only' });
	try {
		const saved = await client.ads.get(id);
		assert.equal(saved.version, 1);
		assert.equal(saved.batch_id, null);
		assert.equal(saved.composition, null);
		assert.deepEqual(saved.ref, { kind: 'ad', id });
		const page = await client.ads.list();
		assert.equal(page.items[0].composition, null);
		assert.equal(page.items[0].version, 1);
		assert.equal('log' in (await client.batches.get(id)), false);
		assert.equal(client.batches.create, undefined);
		assert.equal(client.batches.appendLog, undefined);
		assert.equal(client.ads.create, undefined);
		assert.equal(client.ads.update, undefined);
		assert.equal(requests.every((request) => request.method === 'GET'), true);
	} finally { client.close(); globalThis.fetch = original; }
});
