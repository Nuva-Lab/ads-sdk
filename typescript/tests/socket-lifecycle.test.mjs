import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva, Message } from '../dist/index.js';
import { acceptanceOf } from '../dist/internal.js';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(read, predicate) {
	for (let index = 0; index < 100; index++) {
		const value = read();
		if (predicate(value)) return value;
		await pause(10);
	}
	throw new Error('Socket state did not settle.');
}
const user = { userId: 'fixture-user', displayName: 'Fixture user' };
const state = {
	version: 1,
	type: 'state',
	sessionId: 'socket-fixture',
	sequence: 1,
	state: {
		session: { id: 'socket-fixture', kind: 'work', title: 'Fixture', owner: user, createdAt: '2026-10-24T00:00:00Z' },
		messages: { items: [], nextCursor: null },
		status: 'idle',
	},
	hostCalls: [],
};
const stateFor = (sessionId) => ({
	...state,
	sessionId,
	state: { ...state.state, session: { ...state.state.session, id: sessionId } },
});
function browserBoundary(mode, { rejectedTokens = new Set(), reauth = 'ack', busyAuths = 0 } = {}) {
	const original = globalThis.WebSocket,
		instances = [];
	let listening = false;
	class Socket {
		static CONNECTING = 0;
		static OPEN = 1;
		static CLOSING = 2;
		static CLOSED = 3;
		readyState = 0;
		sent = [];
		constructor() {
			instances.push(this);
			queueMicrotask(() => {
				if (mode === 'silent') return;
				if (!listening) {
					this.readyState = 3;
					this.onerror?.({});
					return;
				}
				this.readyState = 1;
				this.onopen?.({});
			});
		}
		send(raw) {
			const frame = JSON.parse(raw);
			this.sent.push(frame);
			queueMicrotask(() => {
				if (frame.type === 'auth' && busyAuths > 0) {
					busyAuths--;
					this.onmessage?.({
						data: JSON.stringify({
							version: 1,
							type: 'error',
							id: 'auth',
							error: { code: 'SERVICE_BUSY', message: 'Sign-in could not be checked right now; try again.', retryable: true },
						}),
					});
				} else if (frame.type === 'auth' && rejectedTokens.has(frame.token))
					this.onmessage?.({
						data: JSON.stringify({
							version: 1,
							type: 'error',
							id: 'auth',
							error: { code: 'UNAUTHENTICATED', message: 'Token rejected.', retryable: false },
						}),
					});
				else if (frame.type === 'auth') this.onmessage?.({ data: JSON.stringify({ version: 1, type: 'ready' }) });
				else if (frame.type === 'reauth') {
					if (reauth === 'ack') this.onmessage?.({ data: JSON.stringify({ version: 1, type: 'reauthenticated', id: frame.id }) });
					else if (reauth === 'busy')
						this.onmessage?.({
							data: JSON.stringify({
								version: 1,
								type: 'error',
								id: frame.id,
								error: { code: 'SERVICE_BUSY', message: 'Sign-in could not be checked right now; try again.', retryable: true },
							}),
						});
				} else if (frame.method === 'agent.subscribe') {
					this.onmessage?.({ data: JSON.stringify({ version: 1, type: 'result', id: frame.id, result: { subscribed: true } }) });
					this.onmessage?.({ data: JSON.stringify(stateFor(frame.params.sessionId)) });
				} else if (frame.method === 'agent.snapshot')
					this.onmessage?.({
						data: JSON.stringify({ version: 1, type: 'result', id: frame.id, result: stateFor(frame.params.sessionId) }),
					});
			});
		}
		// Some failed handshake implementations do not produce onclose at all.
		close() {
			this.readyState = 3;
		}
	}
	globalThis.WebSocket = Socket;
	return {
		instances,
		listen() {
			listening = true;
		},
		restore() {
			globalThis.WebSocket = original;
		},
	};
}
async function rejectedWithin(promise) {
	const outcome = await Promise.race([
		promise.then(
			() => ({ resolved: true }),
			(error) => ({ error }),
		),
		pause(150).then(() => ({ timeout: true })),
	]);
	assert.equal(outcome.timeout, undefined, 'Pending connection wait must settle without relying on onclose.');
	assert.ok(outcome.error);
	return outcome.error;
}
test('failed handshake without close settles callers and reconnects when the listener appears; stale events are fenced', async (t) => {
	const boundary = browserBoundary('error'),
		client = createNuva({ baseUrl: 'http://socket.invalid/api', requestTimeoutMs: 30, getAccessToken: async () => 'fixture-token' });
	t.after(() => {
		client.close();
		boundary.restore();
	});
	const agent = client.agent({ sessionId: 'socket-fixture' });
	let current;
	agent.subscribe((value) => {
		current = value;
	});
	await rejectedWithin(agent.refresh());
	boundary.listen();
	await until(
		() => current,
		(value) => value?.status === 'idle',
	);
	assert.equal(boundary.instances.length, 2);
	assert.equal(
		boundary.instances.flatMap((socket) => socket.sent).filter((frame) => frame.method === 'agent.snapshot').length,
		0,
		'The failed command must not be replayed.',
	);
	await agent.refresh();
	const old = boundary.instances[0];
	old.onopen?.({});
	old.onmessage?.({ data: JSON.stringify({ ...state, sequence: 999, state: { ...state.state, status: 'running' } }) });
	old.onclose?.({ code: 1006, reason: 'late', wasClean: false });
	old.onerror?.({});
	assert.equal(current.status, 'idle');
	await agent.refresh();
	await pause(300);
	assert.equal(boundary.instances.length, 2);
});
test('handshake deadline rejects an unsent write even when close emits no event', async (t) => {
	const boundary = browserBoundary('silent'),
		client = createNuva({ baseUrl: 'http://socket.invalid/api', requestTimeoutMs: 20, getAccessToken: async () => 'fixture-token' });
	t.after(() => {
		client.close();
		boundary.restore();
	});
	const error = await rejectedWithin(client.agent({ sessionId: 'socket-fixture' }).send(Message.text('Do not replay')));
	assert.equal(acceptanceOf(error), 'not_accepted');
	assert.equal(boundary.instances.flatMap((socket) => socket.sent).length, 0);
});
test('closing the client rejects pending connection waits without onclose', async (t) => {
	const boundary = browserBoundary('silent'),
		client = createNuva({ baseUrl: 'http://socket.invalid/api', requestTimeoutMs: 5000, getAccessToken: async () => 'fixture-token' });
	t.after(() => {
		client.close();
		boundary.restore();
	});
	const pending = client.agent({ sessionId: 'socket-fixture' }).refresh();
	client.close();
	const error = await rejectedWithin(pending);
	assert.equal(error.code, 'CONNECTION_ERROR');
});

// Any HTTP request makes the SDK fetch a token; the request itself may fail.
function failingHttp(t) {
	const original = globalThis.fetch;
	globalThis.fetch = async () => new Response('{}', { status: 500 });
	t.after(() => {
		globalThis.fetch = original;
	});
}
const lifetime = (ms) => ({ expiresAt: Date.now() + ms });
test('a failed early refresh keeps the unexpired token and the socket, then renews it on the same socket', async (t) => {
	const boundary = browserBoundary();
	boundary.listen();
	let calls = 0;
	const client = createNuva({
		baseUrl: 'http://socket.invalid/api',
		requestTimeoutMs: 200,
		tokenRefreshSkewMs: 300,
		getAccessToken: async () => {
			calls++;
			if (calls === 2) throw new Error('HTTP 503');
			return { token: 'token-' + calls, ...lifetime(calls === 1 ? 800 : 60_000) };
		},
	});
	t.after(() => {
		client.close();
		boundary.restore();
	});
	const agent = client.agent({ sessionId: 'socket-fixture' });
	let current;
	agent.subscribe((value) => {
		current = value;
	});
	await agent.refresh();
	await until(
		() => calls,
		(n) => n >= 2,
	);
	await pause(20);
	assert.equal(boundary.instances.length, 1);
	assert.equal(boundary.instances[0].readyState, 1, 'The socket must stay open while its token is valid.');
	assert.equal(current.error, undefined, 'Subscribers must not see an error.');
	await agent.refresh();
	const socket = boundary.instances[0];
	await until(
		() => socket.sent.find((frame) => frame.type === 'reauth'),
		(frame) => frame?.token === 'token-3',
	);
	await agent.refresh();
	assert.equal(boundary.instances.length, 1);
});
test('after the token expires without a refresh, the next agent call fetches a token, reconnects and resubscribes', async (t) => {
	const boundary = browserBoundary();
	boundary.listen();
	let calls = 0,
		failing = false;
	const client = createNuva({
		baseUrl: 'http://socket.invalid/api',
		requestTimeoutMs: 200,
		tokenRefreshSkewMs: 300,
		getAccessToken: async () => {
			calls++;
			if (failing) throw new Error('HTTP 503');
			failing = calls === 1;
			return { token: 'token-' + calls, ...lifetime(calls === 1 ? 400 : 60_000) };
		},
	});
	t.after(() => {
		client.close();
		boundary.restore();
	});
	const agent = client.agent({ sessionId: 'socket-fixture' });
	let current;
	agent.subscribe((value) => {
		current = value;
	});
	await agent.refresh();
	await until(
		() => current,
		(value) => value?.error?.code === 'UNAUTHENTICATED',
	);
	assert.equal((await rejectedWithin(agent.refresh())).code, 'UNAUTHENTICATED');
	failing = false;
	await agent.refresh();
	assert.ok(boundary.instances[1]?.sent.some((frame) => frame.method === 'agent.subscribe'));
	assert.equal(boundary.instances.length, 2);
	assert.match(boundary.instances[1].sent[0].token, /^token-\d+$/);
	assert.notEqual(boundary.instances[1].sent[0].token, 'token-1');
	await until(
		() => current,
		(value) => value?.status === 'idle' && value.error === undefined,
	);
	await agent.refresh();
});
test('a refused socket token is dropped; HTTP traffic does not reconnect, the next agent call does with the new token', async (t) => {
	const boundary = browserBoundary(undefined, { rejectedTokens: new Set(['token-1']) });
	boundary.listen();
	failingHttp(t);
	let calls = 0;
	const client = createNuva({
		baseUrl: 'http://socket.invalid/api',
		requestTimeoutMs: 200,
		getAccessToken: async () => ({ token: 'token-' + ++calls, ...lifetime(3_600_000) }),
	});
	t.after(() => {
		client.close();
		boundary.restore();
	});
	const agent = client.agent({ sessionId: 'socket-fixture' });
	let current;
	agent.subscribe((value) => {
		current = value;
	});
	assert.equal((await rejectedWithin(agent.refresh())).code, 'UNAUTHENTICATED');
	for (let index = 0; index < 3; index++) await client.sessions.list({ limit: 1 }).catch(() => {});
	assert.equal(calls, 2, 'The refused token is dropped from the cache; the new one is reused.');
	await pause(50);
	assert.equal(boundary.instances.length, 1, 'HTTP traffic must not reopen a socket after a refusal.');
	await agent.refresh();
	assert.equal(boundary.instances.length, 2);
	assert.equal(boundary.instances[1].sent[0].token, 'token-2');
	await until(
		() => current,
		(value) => value?.status === 'idle' && value.error === undefined,
	);
});
test('a provider that returns the refused token again does not reconnect with it', async (t) => {
	const boundary = browserBoundary(undefined, { rejectedTokens: new Set(['same']) });
	boundary.listen();
	let calls = 0;
	const client = createNuva({
		baseUrl: 'http://socket.invalid/api',
		requestTimeoutMs: 200,
		getAccessToken: async () => (calls++, { token: 'same', ...lifetime(3_600_000) }),
	});
	t.after(() => {
		client.close();
		boundary.restore();
	});
	const agent = client.agent({ sessionId: 'socket-fixture' });
	assert.equal((await rejectedWithin(agent.refresh())).code, 'UNAUTHENTICATED');
	for (let index = 0; index < 3; index++) assert.equal((await rejectedWithin(agent.refresh())).code, 'UNAUTHENTICATED');
	assert.equal(boundary.instances.length, 1);
	assert.equal(calls, 2, 'One fetch after the refusal; the same token is then cached, not refetched per call.');
});
test('an agent opened after an auth failure recovers through its own call', async (t) => {
	const boundary = browserBoundary();
	boundary.listen();
	let calls = 0,
		failing = false;
	const client = createNuva({
		baseUrl: 'http://socket.invalid/api',
		requestTimeoutMs: 200,
		tokenRefreshSkewMs: 300,
		getAccessToken: async () => {
			calls++;
			if (failing) throw new Error('HTTP 503');
			failing = calls === 1;
			return { token: 'token-' + calls, ...lifetime(calls === 1 ? 400 : 60_000) };
		},
	});
	t.after(() => {
		client.close();
		boundary.restore();
	});
	const first = client.agent({ sessionId: 'socket-fixture' });
	let current;
	first.subscribe((value) => {
		current = value;
	});
	await first.refresh();
	await until(
		() => current,
		(value) => value?.error?.code === 'UNAUTHENTICATED',
	);
	failing = false;
	await client.agent({ sessionId: 'second-session' }).refresh();
	assert.deepEqual(
		boundary.instances[1].sent.filter((frame) => frame.method === 'agent.subscribe').map((frame) => frame.params.sessionId).sort(),
		['second-session', 'socket-fixture'],
	);
});
for (const reauth of ['silent', 'busy'])
test(`a reauth that is ${reauth === 'silent' ? 'not acknowledged' : 'answered SERVICE_BUSY'} reconnects with a full authentication instead of failing auth`, async (t) => {
	const boundary = browserBoundary(undefined, { reauth });
	boundary.listen();
	let calls = 0;
	const client = createNuva({
		baseUrl: 'http://socket.invalid/api',
		requestTimeoutMs: 100,
		tokenRefreshSkewMs: 300,
		getAccessToken: async () => (calls++, { token: 'token-' + calls, ...lifetime(calls === 1 ? 500 : 60_000) }),
	});
	t.after(() => {
		client.close();
		boundary.restore();
	});
	const agent = client.agent({ sessionId: 'socket-fixture' });
	agent.subscribe(() => {});
	await agent.refresh();
	await until(
		() => boundary.instances[1]?.sent[0],
		(frame) => frame?.type === 'auth',
	);
	assert.equal(boundary.instances[1].sent[0].token, 'token-2');
	await agent.refresh();
});
test('a reconnect timer that fires after an auth failure does not throw', async (t) => {
	const boundary = browserBoundary();
	boundary.listen();
	const uncaught = [];
	const record = (error) => uncaught.push(error);
	process.on('uncaughtException', record);
	let calls = 0;
	const client = createNuva({
		baseUrl: 'http://socket.invalid/api',
		requestTimeoutMs: 200,
		tokenRefreshSkewMs: 300,
		getAccessToken: async () => {
			if (++calls > 1) throw new Error('HTTP 503');
			return { token: 'token-1', ...lifetime(400) };
		},
	});
	t.after(() => {
		process.off('uncaughtException', record);
		client.close();
		boundary.restore();
	});
	const agent = client.agent({ sessionId: 'socket-fixture' });
	agent.subscribe(() => {});
	await agent.refresh();
	await pause(380);
	boundary.instances[0].onclose?.({ code: 1006, reason: 'drop', wasClean: false }); // reconnect timer pending
	await pause(300);
	assert.deepEqual(uncaught, []);
});
test('a token the gateway could not check (SERVICE_BUSY) is kept and the socket reconnects with it', async (t) => {
	const boundary = browserBoundary(undefined, { busyAuths: 2 });
	boundary.listen();
	let calls = 0;
	const client = createNuva({
		baseUrl: 'http://socket.invalid/api',
		requestTimeoutMs: 200,
		getAccessToken: async () => (calls++, { token: 'token-1', ...lifetime(3_600_000) }),
	});
	t.after(() => {
		client.close();
		boundary.restore();
	});
	const agent = client.agent({ sessionId: 'socket-fixture' });
	let current;
	agent.subscribe((value) => {
		current = value;
	});
	const error = await rejectedWithin(agent.refresh());
	assert.equal(error.code, 'SERVICE_BUSY');
	assert.equal(error.retryable, true);
	await until(
		() => current,
		(value) => value?.status === 'idle' && value.error === undefined,
	);
	assert.equal(boundary.instances.length, 3);
	assert.deepEqual(
		boundary.instances.map((socket) => socket.sent[0].token),
		['token-1', 'token-1', 'token-1'],
	);
	assert.equal(calls, 1, 'A token that could not be checked is not refused.');
	await agent.refresh();
});
