import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';
import { dataRequest } from '../dist/data-routes.js';

test('customer Job access retains reads and subscriptions without exposing cancellation', () => {
	const client = createNuva({ baseUrl: 'http://127.0.0.1:1/api', getAccessToken: async () => 'local-test-only' });
	try {
		assert.equal(typeof client.jobs.get, 'function');
		assert.equal(typeof client.jobs.subscribe, 'function');
		assert.equal('cancel' in client.jobs, false);
		assert.throws(
			() => dataRequest('jobs.cancel', { id: '11111111-1111-4111-8111-111111111111' }),
			(error) => error.code === 'UNSUPPORTED_OPERATION',
		);
	} finally {
		client.close();
	}
});
