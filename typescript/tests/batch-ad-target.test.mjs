import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNuva } from '../dist/index.js';
import { backendSchema } from '../dist/internal.js';

const id = '01a175e0-31b3-da69-176e-0842e6f6602e';
const created_at = '2026-10-26T12:00:00Z';
const asset = { id, kind: 'video', mime: 'video/mp4', source: 'generated', size_bytes: 10, metadata: { duration_ms: 5000 }, created_at, download_url: 'https://example.com/video.mp4', download_url_expires_at: '2026-10-27T12:00:00Z' };
// As a customer reads it: the Ad's metadata version is the Agent's.
const ad = { id, batch_id: null, schema_version: 1, composition: null, asset, assets: {}, created_at };
const batch = { id, intent: 'Create a clip', created_at, ads: [], jobs: {} };

test('Ads and Batches are written by the Agent: the public contract has no write bodies and no Ad version', async () => {
	const contract = JSON.parse(await readFile(new URL('../schema/backend.openapi.json', import.meta.url), 'utf8')).components.schemas;
	assert.equal(contract.AdOut.properties.version, undefined);
	for (const name of ['AdCreate', 'AdUpdate', 'BatchCreate']) assert.equal(contract[name], undefined, name);
});

test('Batch reads need every field', () => {
	assert.deepEqual(backendSchema('BatchOut').parse(batch), batch);
	for (const key of ['id', 'intent', 'created_at', 'ads', 'jobs']) {
		const partial = { ...batch }; delete partial[key];
		assert.equal(backendSchema('BatchOut').safeParse(partial).success, false, key);
	}
});

test('Ad null metadata is explicit and missing required fields are rejected', () => {
	assert.deepEqual(backendSchema('AdOut').parse(ad), ad);
	// The editor's project data is the Agent's: a customer's composition has the clips and audio only.
	const composition = { clips: [{ asset_id: id }], audio_asset_ids: [] };
	assert.deepEqual(backendSchema('AdOut').parse({ ...ad, batch_id: id, composition }).composition, composition);
	const edited = { ...composition, editor: { zoom: 2 } };
	assert.equal(backendSchema('AdOut').safeParse({ ...ad, composition: edited }).success, false);
	for (const key of ['batch_id', 'composition', 'asset']) {
		const partial = { ...ad }; delete partial[key];
		assert.equal(backendSchema('AdOut').safeParse(partial).success, false, key);
		assert.equal(backendSchema('AdPage').safeParse({ items: [partial], next_cursor: null }).success, false, key);
	}
});

test('mocked customer reads retain nullable Ad metadata, and customers write no Ads or Batches', async () => {
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
		assert.equal(saved.batch_id, null);
		assert.equal(saved.composition, null);
		assert.deepEqual(saved.ref, { kind: 'ad', id });
		const page = await client.ads.list();
		assert.equal(page.items[0].composition, null);
		assert.equal('log' in (await client.batches.get(id)), false);
		assert.equal(client.batches.create, undefined);
		assert.equal(client.batches.appendLog, undefined);
		assert.equal(client.ads.create, undefined);
		assert.equal(client.ads.update, undefined);
		assert.equal(requests.every((request) => request.method === 'GET'), true);
	} finally { client.close(); globalThis.fetch = original; }
});
