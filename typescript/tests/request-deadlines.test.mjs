import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { Transport } from '../dist/transport.js';

function fixture(t, options = {}) {
	const original = globalThis.fetch;
	let request, resolve;
	globalThis.fetch = async (url, init) => {
		assert.equal(new URL(url).hostname, 'local-fixture.invalid');
		request = init;
		return new Promise((yes, no) => {
			resolve = yes;
			init.signal.addEventListener('abort', () => no(init.signal.reason), { once: true });
		});
	};
	t.mock.timers.enable({ apis: ['setTimeout'] });
	const transport = new Transport({ baseUrl: 'https://local-fixture.invalid/api', storeBaseUrl: 'https://local-fixture.invalid', generationBaseUrl: 'https://local-fixture.invalid', getAccessToken: async () => 'fixture-only', ...options });
	t.after(() => { transport.close(); globalThis.fetch = original; });
	return { transport, request: () => request, complete: () => resolve(Response.json({ done: true })) };
}
for (const method of ['scripts.generate', 'prompts.generate', 'assets.register']) {
	test(`${method} waits past eight seconds for the real operation result`, async t => {
		const f = fixture(t);
		const result = f.transport.data(method, {}, 'same-request');
		await setImmediate();
		t.mock.timers.tick(12000);
		assert.equal(f.request().signal.aborted, false);
		f.complete();
		assert.deepEqual(await result, { done: true });
	});
}
test('long writer deadline retains uncertain acceptance without automatic resubmission', async t => {
	const f = fixture(t);
	const result = f.transport.data('scripts.generate', {}, 'saved-request-id');
	const rejected = assert.rejects(result, e => e.acceptance === 'unknown' && e.requestId === 'saved-request-id' && /may still complete/.test(e.message));
	await setImmediate();
	t.mock.timers.tick(180000);
	await rejected;
});
test('explicit short deadlines still apply to generation', async t => {
	const f = fixture(t, { requestTimeoutMs: 25 });
	const result = f.transport.data('scripts.generate', {}, 'explicit');
	const rejected = assert.rejects(result, e => e.acceptance === 'unknown');
	await setImmediate(); t.mock.timers.tick(25); await rejected;
});
test('ordinary reads retain the short default deadline', async t => {
	const f = fixture(t);
	const result = f.transport.data('products.list', {}, 'read');
	const rejected = assert.rejects(result, e => /timed out/.test(e.message));
	await setImmediate(); t.mock.timers.tick(8000); await rejected;
});
test('direct media uploads also survive the old eight-second deadline', async t => {
	const f = fixture(t);
	const result = f.transport.upload('https://local-fixture.invalid/upload', new File(['test'], 'test.mp4', { type: 'video/mp4' }));
	await setImmediate(); t.mock.timers.tick(12000);
	assert.equal(f.request().signal.aborted, false);
	f.complete(); await result;
});
