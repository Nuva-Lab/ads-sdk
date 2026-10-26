import assert from 'node:assert/strict';
import test from 'node:test';
import { createNuva } from '../dist/index.js';

test('unpublished Agent origin fails before acquiring a customer token or sending traffic', () => {
	let tokens = 0;
	assert.throws(
		() =>
			createNuva({
				getAccessToken: async () => {
					tokens++;
					return 'unused';
				},
			}),
		/Agent service origin.*not configured/,
	);
	assert.equal(tokens, 0);
});

test('explicit local Agent override uses the approved Store origin without a customer Store option', async () => {
	const saved = globalThis.fetch;
	const requests = [];
	globalThis.fetch = async (url) => {
		requests.push(String(url));
		return Response.json({ items: [], next_cursor: null });
	};
	const client = createNuva({ baseUrl: 'https://local-agent.invalid', getAccessToken: async () => 'fixture' });
	try {
		await client.products.list();
		assert.deepEqual(requests, ['https://api.nuvalab.ai/v1/products']);
		assert.equal('workflows' in client, false);
		assert.equal('workflowRuns' in client, false);
	} finally {
		client.close();
		globalThis.fetch = saved;
	}
});
