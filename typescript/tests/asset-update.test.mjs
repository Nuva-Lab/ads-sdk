import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';

const id = '01a175e0-31b3-da69-176e-0842e6f6602e';
const asset = {
	id,
	kind: 'image',
	mime: 'image/png',
	source: 'uploaded',
	size_bytes: 10,
	metadata: { width: 1, height: 1 },
	label: '正面',
	description: null,
	created_at: '2026-11-07T00:00:00Z',
	download_url: 'https://files.invalid/a',
	download_url_expires_at: '2026-11-07T01:00:00Z',
};

function client(respond) {
	const requests = [];
	const original = globalThis.fetch;
	globalThis.fetch = async (url, options) => {
		requests.push({ url: String(url), method: options.method, body: typeof options.body === 'string' ? JSON.parse(options.body) : undefined, headers: options.headers });
		return respond(requests.at(-1));
	};
	const nuva = createNuva({ baseUrl: 'http://127.0.0.1:1/api', storeBaseUrl: 'https://store.invalid', getAccessToken: async () => 'fixture' });
	return { nuva, requests, restore: () => { nuva.close(); globalThis.fetch = original; } };
}

test('assets.update sends only the changed text as a PATCH, with null to remove a value', async () => {
	const { nuva, requests, restore } = client(() => Response.json(asset));
	try {
		const updated = await nuva.assets.update(id, { label: '正面', description: null });
		assert.deepEqual(updated.ref, { kind: 'asset', id });
		assert.deepEqual(requests.map(({ url, method, body }) => ({ url, method, body })), [
			{ url: `https://store.invalid/v1/assets/${id}`, method: 'PATCH', body: { label: '正面', description: null } },
		]);
	} finally {
		restore();
	}
});

test('assets.update refuses unknown fields and empty text before sending', async () => {
	const { nuva, requests, restore } = client(() => Response.json(asset));
	try {
		for (const changes of [{ kind: 'video' }, { label: '' }])
			await assert.rejects(nuva.assets.update(id, changes), (error) => error.code === 'INVALID_INPUT' && error.acceptance === 'not_accepted');
		assert.equal(requests.length, 0);
	} finally {
		restore();
	}
});

test('a file upload sends no Idempotency-Key; a URL registration does', async () => {
	const { nuva, requests, restore } = client(({ url }) =>
		url.endsWith('/v1/assets/uploads')
			? Response.json({ upload_url: 'https://files.invalid/put', upload_token: 't', expires_at: '2026-11-07T01:00:00Z', max_bytes: 100 }, { status: 201 })
			: url === 'https://files.invalid/put'
				? new Response(null, { status: 200 })
				: Response.json(asset, { status: 201 }),
	);
	const key = (request) => new Headers(request.headers).get('idempotency-key');
	try {
		await nuva.assets.upload(new File([new Uint8Array(10)], 'a.png', { type: 'image/png' }), { idempotencyKey: 'k-1' });
		await nuva.assets.upload({ url: 'https://example.com/a.png' }, { kind: 'image', idempotencyKey: 'k-2' });
		const registrations = requests.filter(({ url }) => url === 'https://store.invalid/v1/assets');
		assert.deepEqual(registrations.map(key), [null, 'k-2']);
	} finally {
		restore();
	}
});
