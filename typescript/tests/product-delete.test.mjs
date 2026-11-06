import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';
import { dataRequest } from '../dist/data-routes.js';

const id = '01a175e0-31b3-da69-176e-0842e6f6602e';

test('products.delete sends DELETE for the Product and resolves on 204', async () => {
	const original = globalThis.fetch;
	const requests = [];
	globalThis.fetch = async (url, options) => {
		requests.push({ url: String(url), method: options.method, body: options.body });
		return new Response(null, { status: 204 });
	};
	const nuva = createNuva({ baseUrl: 'http://127.0.0.1:1/api', storeBaseUrl: 'https://store.invalid', getAccessToken: async () => 'fixture' });
	try {
		assert.equal(await nuva.products.delete(id), undefined);
		assert.deepEqual(requests, [{ url: `https://store.invalid/v1/products/${id}`, method: 'DELETE', body: undefined }]);
	} finally {
		nuva.close();
		globalThis.fetch = original;
	}
});

test('products.delete reports an unknown Product as NOT_FOUND, and a body on success as a service error', async () => {
	const original = globalThis.fetch;
	let found = false;
	globalThis.fetch = async () =>
		found
			? Response.json({ id })
			: Response.json({ error: { code: 'NOT_FOUND', message: 'No Product has this id.', retryable: false }, request_id: 'r1' }, { status: 404 });
	const nuva = createNuva({ baseUrl: 'http://127.0.0.1:1/api', storeBaseUrl: 'https://store.invalid', getAccessToken: async () => 'fixture' });
	try {
		await assert.rejects(nuva.products.delete(id), (error) => error.code === 'NOT_FOUND' && error.requestId === 'r1');
		found = true;
		await assert.rejects(nuva.products.delete(id), (error) => error.code === 'SERVICE_ERROR');
	} finally {
		nuva.close();
		globalThis.fetch = original;
	}
});

test('only Products can be deleted, by a canonical ID', () => {
	assert.deepEqual(dataRequest('products.delete', { id }), { method: 'DELETE', path: `/v1/products/${id}` });
	assert.throws(() => dataRequest('products.delete', { id: 'not-an-id' }), (error) => error.code === 'INVALID_INPUT');
	for (const method of ['brands.delete', 'characters.delete'])
		assert.throws(() => dataRequest(method, { id }), (error) => error.code === 'UNSUPPORTED_OPERATION');
});
