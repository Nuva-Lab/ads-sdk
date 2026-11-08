import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva, AdsError } from '../dist/index.js';

const brand = { id: '01a175e0-31b3-da69-176e-0842e6f6602e', version: 1, schema_version: 1, data: { name: 'B' }, created_at: '2026-11-07T00:00:00Z', assets: {} };
function client(respond) {
	const requests = [];
	const original = globalThis.fetch;
	globalThis.fetch = async (url, options) => {
		requests.push({ url: String(url), method: options.method, key: new Headers(options.headers).get('idempotency-key'), id: new Headers(options.headers).get('x-request-id') });
		return respond(requests.length);
	};
	const nuva = createNuva({ baseUrl: 'http://127.0.0.1:1/api', storeBaseUrl: 'https://store.invalid', getAccessToken: async () => 'fixture' });
	return { nuva, requests, restore: () => { nuva.close(); globalThis.fetch = original; } };
}

test('a keyed write that loses its connection is sent again with the same key', async () => {
	const { nuva, requests, restore } = client((n) => {
		if (n === 1) throw new TypeError('fetch failed');
		return Response.json(brand, { status: 201 });
	});
	try {
		const made = await nuva.brands.create({ data: { name: 'B' } });
		assert.equal(made.id, brand.id);
		assert.equal(requests.length, 2);
		assert.ok(requests[0].key);
		assert.equal(requests[1].key, requests[0].key, 'The retry reuses the key.');
	} finally {
		restore();
	}
});

test('a write that keeps failing ends as a retryable error naming its method and request; a refusal is not retried', async () => {
	const failing = client(() => { throw new TypeError('fetch failed'); });
	try {
		await assert.rejects(failing.nuva.brands.create({ data: { name: 'B' } }, { idempotencyKey: 'k-1' }), (error) => {
			assert.ok(error instanceof AdsError);
			assert.deepEqual([error.code, error.retryable, error.method, error.requestId], ['CONNECTION_ERROR', true, 'brands.create', failing.requests[0].id]);
			assert.equal('acceptance' in error.toJSON(), false);
			return true;
		});
		assert.deepEqual(failing.requests.map((r) => r.key), ['k-1', 'k-1', 'k-1'], 'Sent once and retried twice.');
	} finally {
		failing.restore();
	}
	const refused = client(() => Response.json({ error: { code: 'FORBIDDEN', message: 'No.', retryable: false }, request_id: 'server-id' }, { status: 403 }));
	try {
		await assert.rejects(refused.nuva.brands.create({ data: { name: 'B' } }), (error) => error.code === 'FORBIDDEN' && error.requestId === 'server-id' && error.method === 'brands.create');
		assert.equal(refused.requests.length, 1);
	} finally {
		refused.restore();
	}
});

test('bad input is refused before anything is sent, naming the method', async () => {
	const { nuva, requests, restore } = client(() => Response.json(brand));
	try {
		await assert.rejects(nuva.assets.update(brand.id, { kind: 'video' }), (error) => error.code === 'INVALID_INPUT' && error.method === 'assets.update' && error.details === undefined || Array.isArray(error.details));
		assert.equal(requests.length, 0);
	} finally {
		restore();
	}
});

test('a new Session is not sent again after a dropped connection: a repeat would open a second one', async () => {
	const { nuva, requests, restore } = client(() => { throw new TypeError('fetch failed'); });
	try {
		await assert.rejects(nuva.sessions.create({ title: 'One' }), (error) => error.code === 'CONNECTION_ERROR');
		assert.equal(requests.length, 1);
	} finally {
		restore();
	}
});
