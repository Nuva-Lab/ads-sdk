import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';

// agent.files.get: one RPC for the bound Session, the documented fields only, and server or response errors that reach
// the caller with the request ID.
const file = { id: 'sf_' + 'a'.repeat(32), mime: 'image/png', label: 'Mia (1 of 4)', download_url: 'https://files.example/one.png?sig', download_url_expires_at: '2026-11-04T12:00:00.000Z' };
function fixture(t, answer) {
	const original = globalThis.fetch;
	const requests = [];
	globalThis.fetch = async (url, init) => {
		const body = JSON.parse(init.body);
		requests.push({ url: String(url), auth: new Headers(init.headers).get('authorization'), body });
		return answer(body);
	};
	t.after(() => { globalThis.fetch = original; });
	const client = createNuva({ baseUrl: 'https://agent.fixture.invalid/api', getAccessToken: async () => 'user-token' });
	t.after(() => client.close());
	return { agent: client.agent({ sessionId: 'work-session' }), requests };
}
test('files.get reads a Session file for the bound Session and returns only the documented fields', async (t) => {
	const { agent, requests } = fixture(t, (body) => Response.json({ version: 1, type: 'result', id: body.id, result: { ...file, kind: 'image', size_bytes: 2_500_000, path: '/generated/images/x.png' } }));
	assert.deepEqual(await agent.files.get(file.id), file);
	assert.equal(requests[0].url, 'https://agent.fixture.invalid/api/rpc');
	assert.equal(requests[0].auth, 'Bearer user-token');
	assert.equal(requests[0].body.method, 'files.get');
	assert.deepEqual(requests[0].body.params, { sessionId: 'work-session', id: file.id });
	await assert.rejects(agent.files.get(''), TypeError);
	assert.equal(Object.isFrozen(agent.files), true);
});
test('any media type is accepted: callers decide by mime', async (t) => {
	const { agent } = fixture(t, (body) => Response.json({ version: 1, type: 'result', id: body.id, result: { ...file, mime: 'video/mp4' } }));
	assert.equal((await agent.files.get(file.id)).mime, 'video/mp4');
});
for (const code of ['NOT_FOUND', 'FORBIDDEN', 'UNSUPPORTED_OPERATION']) {
	test(`a ${code} answer reaches the caller with its code and the request ID`, async (t) => {
		const { agent, requests } = fixture(t, (body) => Response.json({ version: 1, type: 'error', id: body.id, error: { code, message: `fixture ${code}`, retryable: false } }));
		await assert.rejects(agent.files.get(file.id), (error) => error.code === code && error.message === `fixture ${code}` && error.requestId === requests[0].body.id);
	});
}
test('a malformed result is a SERVICE_ERROR with the request ID', async (t) => {
	const { agent, requests } = fixture(t, (body) => Response.json({ version: 1, type: 'result', id: body.id, result: { ...file, download_url: undefined } }));
	await assert.rejects(agent.files.get(file.id), (error) => error.code === 'SERVICE_ERROR' && /Malformed service response/.test(error.message) && error.requestId === requests[0].body.id);
});
