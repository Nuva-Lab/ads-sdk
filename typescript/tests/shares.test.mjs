import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';
import { dataRequest } from '../dist/data-routes.js';

const id = '01a175e0-31b3-da69-176e-0842e6f6602e';
const item = { kind: 'product', id };
const share = { kind: 'product', id, scope: 'team a1', access: 'read', created_at: '2026-11-07T00:00:00Z' };

async function withFetch(answer, run) {
	const original = globalThis.fetch;
	const requests = [];
	globalThis.fetch = async (url, options) => {
		requests.push({ url: String(url), method: options.method, body: options.body });
		return answer(String(url), options);
	};
	const nuva = createNuva({ baseUrl: 'http://127.0.0.1:1/api', storeBaseUrl: 'https://store.invalid', getAccessToken: async () => 'fixture' });
	try {
		await run(nuva, requests);
	} finally {
		nuva.close();
		globalThis.fetch = original;
	}
}

test('shares: list, set and remove an item\'s shares with a scope', async () => {
	await withFetch(
		(url, options) =>
			options.method === 'DELETE'
				? new Response(null, { status: 204 })
				: Response.json(options.method === 'GET' ? { items: [share] } : share),
		async (nuva, requests) => {
			assert.deepEqual(await nuva.shares.set(item, 'team a1', 'read'), share);
			assert.deepEqual(await nuva.shares.list(item), [share]);
			assert.equal(await nuva.shares.remove(item, 'team a1'), undefined);
			assert.deepEqual(requests, [
				{ url: `https://store.invalid/v1/shares/product/${id}/team%20a1`, method: 'PUT', body: '{"access":"read"}' },
				{ url: `https://store.invalid/v1/shares/product/${id}`, method: 'GET', body: undefined },
				{ url: `https://store.invalid/v1/shares/product/${id}/team%20a1`, method: 'DELETE', body: undefined },
			]);
		},
	);
});

test('shares: a share for another item, or a body on remove, is a service error', async () => {
	await withFetch(
		(url, options) => (options.method === 'DELETE' ? Response.json({}) : Response.json({ ...share, id: '01a175e0-31b3-da69-176e-0842e6f6602f' })),
		async (nuva) => {
			await assert.rejects(nuva.shares.set(item, 'team a1', 'read'), (error) => error.code === 'SERVICE_ERROR');
			await assert.rejects(nuva.shares.remove(item, 'team a1'), (error) => error.code === 'SERVICE_ERROR');
		},
	);
});

test('shares: inputs are checked before anything is sent', () => {
	for (const [method, params] of [
		['shares.list', { item: { kind: 'batch', id } }],
		['shares.list', { item: { kind: 'product', id: 'p1' } }],
		['shares.set', { item, scope: 'a/b', access: 'read' }],
		['shares.set', { item, scope: '', access: 'read' }],
		['shares.set', { item, scope: 'a1', access: 'delete' }],
		['shares.set', { item, scope: '..', access: 'read' }],
		['shares.remove', { item, scope: '.' }],
	])
		assert.throws(() => dataRequest(method, params), (error) => error.code === 'INVALID_INPUT', method);
	assert.deepEqual(dataRequest('shares.remove', { item, scope: 'customer' }), { method: 'DELETE', path: `/v1/shares/product/${id}/customer` });
});

test('sessions.list passes owner, so an admin lists a member\'s Sessions', async () => {
	await withFetch(
		() => Response.json({ items: [], nextCursor: null }),
		async (nuva, requests) => {
			await nuva.sessions.list({ owner: id, limit: 10 });
			assert.equal(new URL(requests[0].url).searchParams.get('owner'), id);
			assert.equal(new URL(requests[0].url).pathname, '/v1/sessions');
		},
	);
});

test("shares: an Artifact named by a later version's ID, in any case, gets the share of its first version", async () => {
	const first = '01a175e0-31b3-da69-176e-0842e6f66000';
	await withFetch(
		() => Response.json({ kind: 'script', id: first, scope: 'customer', access: 'write', created_at: '2026-11-07T00:00:00Z' }),
		async (nuva, requests) => {
			const share = await nuva.shares.set({ kind: 'script', id: id.toUpperCase() }, 'customer', 'write');
			assert.equal(share.id, first);
			assert.equal(requests[0].url, `https://store.invalid/v1/shares/script/${id}/customer`);
			await assert.rejects(nuva.shares.set({ kind: 'product', id }, 'customer', 'read'), (error) => error.code === 'SERVICE_ERROR');
		},
	);
});
