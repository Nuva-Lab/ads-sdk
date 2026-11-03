import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';

// agent.files.get: one RPC call for the bound Session, a strictly shaped result, and no fabricated fields.
test('files.get reads a Session file for the bound Session and returns only the documented fields', async (t) => {
	const original = globalThis.fetch;
	const requests = [];
	const file = { id: 'sf_' + 'a'.repeat(32), kind: 'image', mime: 'image/png', size_bytes: 2_500_000, label: 'Mia (1 of 4)', url: 'https://files.example/one.png?sig', url_expires_at: '2026-11-04T12:00:00.000Z' };
	let answer = { ...file, path: '/generated/images/x.png' };
	globalThis.fetch = async (url, init) => {
		const body = JSON.parse(init.body);
		requests.push({ url: String(url), auth: new Headers(init.headers).get('authorization'), body });
		return Response.json({ version: 1, type: 'result', id: body.id, result: answer });
	};
	t.after(() => { globalThis.fetch = original; });
	const client = createNuva({ baseUrl: 'https://agent.fixture.invalid/api', getAccessToken: async () => 'user-token' });
	t.after(() => client.close());
	const agent = client.agent({ sessionId: 'work-session' });
	assert.deepEqual(await agent.files.get(file.id), file);
	assert.equal(requests[0].url, 'https://agent.fixture.invalid/api/rpc');
	assert.equal(requests[0].auth, 'Bearer user-token');
	assert.equal(requests[0].body.method, 'files.get');
	assert.deepEqual(requests[0].body.params, { sessionId: 'work-session', id: file.id });
	answer = { ...file, kind: 'video' };
	await assert.rejects(agent.files.get(file.id), /Invalid Session file response/);
	await assert.rejects(agent.files.get(''), TypeError);
	assert.equal(Object.isFrozen(agent.files), true);
});
