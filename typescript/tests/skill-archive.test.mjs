import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';

const skill = (archived_at) => ({
	id: '01a17000-0000-4000-8000-000000000001',
	name: 'brand-voice',
	platform: false,
	main_version: 1,
	created_at: '2026-11-12T00:00:00Z',
	archived_at,
	version: 1,
	description: 'Brand voice',
	note: null,
	attributes: {},
	files: [],
	download_url_expires_at: '2099-01-01T00:00:00Z',
});

test('skills.list leaves archived Skills to the backend and lists them with archived: true', async () => {
	const original = globalThis.fetch;
	const requests = [];
	globalThis.fetch = async (url) => {
		const parsed = new URL(String(url));
		requests.push(parsed.pathname + parsed.search);
		const archived = parsed.searchParams.get('archived') === 'true';
		return Response.json({ items: [skill(archived ? '2026-11-13T00:00:00Z' : null)], next_cursor: null });
	};
	const nuva = createNuva({ baseUrl: 'http://127.0.0.1:1/api', storeBaseUrl: 'https://store.invalid', getAccessToken: async () => 'fixture' });
	try {
		assert.equal((await nuva.skills.list()).items[0].archived_at, null);
		const archived = await nuva.skills.list({ archived: true });
		assert.equal(archived.items[0].archived_at, '2026-11-13T00:00:00Z');
		assert.equal(archived.items[0].label, 'brand-voice');
		assert.deepEqual(requests, ['/v1/skills', '/v1/skills?archived=true']);
	} finally {
		nuva.close();
		globalThis.fetch = original;
	}
});
