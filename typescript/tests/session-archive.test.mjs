import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';
import { dataRequest } from '../dist/data-routes.js';

const session = { id: 'session-1', kind: 'work', title: 'Test run', owner: { userId: 'u1' }, createdAt: '2026-11-12T00:00:00.000Z' };

test('sessions.archive and unarchive POST to the Agent directory and return the Session', async () => {
	const original = globalThis.fetch;
	const requests = [];
	globalThis.fetch = async (url, options) => {
		requests.push({ url: String(url), method: options.method });
		const path = new URL(String(url)).pathname;
		if (path.endsWith('/archive')) return Response.json({ ...session, archivedAt: '2026-11-12T01:00:00.000Z' });
		if (path.endsWith('/unarchive')) return Response.json(session);
		return Response.json({ items: [{ ...session, archivedAt: '2026-11-12T01:00:00.000Z' }], nextCursor: null });
	};
	const nuva = createNuva({ baseUrl: 'http://127.0.0.1:1/api', storeBaseUrl: 'https://store.invalid', getAccessToken: async () => 'fixture' });
	try {
		assert.equal((await nuva.sessions.archive('session-1')).archivedAt, '2026-11-12T01:00:00.000Z');
		assert.deepEqual(await nuva.sessions.unarchive('session-1'), session);
		assert.equal((await nuva.sessions.list({ archived: true })).items[0].archivedAt, '2026-11-12T01:00:00.000Z');
		assert.deepEqual(requests, [
			{ url: 'http://127.0.0.1:1/v1/sessions/session-1/archive', method: 'POST' },
			{ url: 'http://127.0.0.1:1/v1/sessions/session-1/unarchive', method: 'POST' },
			{ url: 'http://127.0.0.1:1/v1/sessions?archived=true', method: 'GET' },
		]);
	} finally {
		nuva.close();
		globalThis.fetch = original;
	}
});

test('an archive route needs a Session ID and encodes it', () => {
	assert.deepEqual(dataRequest('sessions.archive', { sessionId: 'a/b' }), { method: 'POST', path: '/v1/sessions/a%2Fb/archive', agent: true });
	assert.throws(() => dataRequest('sessions.unarchive', {}), TypeError);
});
