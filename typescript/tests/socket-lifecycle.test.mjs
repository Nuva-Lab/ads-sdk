import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva, Message } from '../dist/index.js';
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
function browserBoundary(mode) {
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
				if (frame.type === 'auth') this.onmessage?.({ data: JSON.stringify({ version: 1, type: 'ready' }) });
				else if (frame.method === 'agent.subscribe') {
					this.onmessage?.({ data: JSON.stringify({ version: 1, type: 'result', id: frame.id, result: { subscribed: true } }) });
					this.onmessage?.({ data: JSON.stringify(state) });
				} else if (frame.method === 'agent.snapshot')
					this.onmessage?.({ data: JSON.stringify({ version: 1, type: 'result', id: frame.id, result: state }) });
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
	assert.equal(error.acceptance, 'not_accepted');
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
