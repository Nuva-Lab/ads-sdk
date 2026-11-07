import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';
import { dataRequest } from '../dist/data-routes.js';

test('customers read, subscribe to and cancel their Jobs', () => {
	const client = createNuva({ baseUrl: 'http://127.0.0.1:1/api', getAccessToken: async () => 'local-test-only' });
	try {
		assert.equal(typeof client.jobs.get, 'function');
		assert.equal(typeof client.jobs.subscribe, 'function');
		assert.equal(typeof client.jobs.cancel, 'function');
		const id = '11111111-1111-4111-8111-111111111111';
		assert.deepEqual(dataRequest('jobs.cancel', { id }), { method: 'POST', path: `/v1/jobs/${id}/cancel` });
	} finally {
		client.close();
	}
});
