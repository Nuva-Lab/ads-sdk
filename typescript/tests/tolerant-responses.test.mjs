import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';

// A newer backend may add fields and enum values to what it returns. The SDK passes them through instead of failing,
// and still refuses to send a value the backend doesn't take.
const id = '01a175e0-31b3-da69-176e-0842e6f6602e';
const at = '2026-11-24T00:00:00Z';
const asset = {
	id,
	kind: 'hologram',
	mime: 'model/gltf-binary',
	source: 'synthesized',
	size_bytes: 10,
	metadata: {},
	created_at: at,
	download_url: 'https://store.invalid/a',
	download_url_expires_at: at,
	rating: 5,
};
const job = (status) => ({
	id,
	status,
	prompt: id,
	seed: 1,
	resolution: null,
	batch_id: null,
	asset: null,
	error: null,
	callback: null,
	created_at: at,
	error_code: null,
	queue_position: 3,
});

async function withFetch(answer, run, options = {}) {
	const original = globalThis.fetch;
	const requests = [];
	globalThis.fetch = async (url, init) => {
		requests.push({ url: String(url), method: init.method, body: init.body });
		return answer(String(url), init, requests.length);
	};
	const nuva = createNuva({ baseUrl: 'http://127.0.0.1:1/api', storeBaseUrl: 'https://store.invalid', getAccessToken: async () => 'fixture', ...options });
	try {
		await run(nuva, requests);
	} finally {
		nuva.close();
		globalThis.fetch = original;
	}
}

test('an Asset of a kind and source the SDK does not know, with a field it does not know, is read', async () => {
	await withFetch(
		() => Response.json(asset),
		async (nuva) => {
			const read = await nuva.assets.get(id);
			assert.equal(read.kind, 'hologram');
			assert.equal(read.source, 'synthesized');
			assert.equal(read.rating, 5);
		},
	);
});

test('a field added to a data object the SDK used to refuse it in is kept', async () => {
	const product = {
		id,
		version: 1,
		schema_version: 2,
		brand_id: id,
		created_at: at,
		assets: {},
		data: { name: 'Lipstick', image_asset_ids: [], video_asset_ids: [], selling_points: [], facts: [], constraints: [], attributes: {}, tagline: 'Bold' },
	};
	await withFetch(
		() => Response.json(product),
		async (nuva) => assert.equal((await nuva.products.get(id)).data.tagline, 'Bold'),
	);
});

test('a Job in a status the SDK does not know is still under way: subscribe reports it and keeps waiting', async () => {
	const statuses = ['queued', 'uploading', 'completed'];
	await withFetch(
		(url, init, n) => Response.json(job(statuses[Math.min(n, statuses.length) - 1])),
		async (nuva) => {
			const seen = [];
			await new Promise((resolve, reject) =>
				nuva.jobs.subscribe(
					id,
					(state) => {
						seen.push(state.status);
						if (state.status === 'completed') resolve();
					},
					reject,
				),
			);
			assert.deepEqual(seen, statuses);
		},
		{ jobPollIntervalMs: 10 },
	);
});

test('an error with a field the SDK does not know is still the backend error', async () => {
	const body = { error: { code: 'NOT_FOUND', message: 'No such Asset.', retryable: false, hint: 'x' }, request_id: id, trace: 't' };
	await withFetch(
		() => Response.json(body, { status: 404 }),
		async (nuva) => assert.rejects(nuva.assets.get(id), (error) => error.code === 'NOT_FOUND'),
	);
});

test('requests are still checked: an unknown kind or field is refused before anything is sent', async () => {
	await withFetch(
		() => Response.json({}),
		async (nuva, requests) => {
			await assert.rejects(nuva.assets.upload({ url: 'https://example.com/a.glb' }, { kind: 'hologram' }), (error) => error.code === 'INVALID_INPUT');
			await assert.rejects(nuva.products.create({ brand_id: id, data: { name: 'Cup', tagline: 'x' } }), (error) => error.code === 'INVALID_INPUT');
			await assert.rejects(nuva.shares.set({ kind: 'product', id }, 'team', 'admin'), (error) => error.code === 'INVALID_INPUT');
			assert.deepEqual(requests, []);
		},
	);
});
