import test from 'node:test';
import assert from 'node:assert/strict';
import {
	clientMessageInputSchema,
	clientSendSchema,
	clientStopSchema,
	stopReceiptSchema,
	messageSchema,
	stateEventSchema,
	clientResponseSchema,
	clientFrameSchema,
	serverFrameSchema,
	CLIENT_PROTOCOL_REVISION,
	identitySchema,
} from '../dist/index.js';
const ref = { sessionId: 'public-session', messageId: 'public-message' };
const publicText = { id: 'part-1', type: 'text', format: 'plain', text: 'Hello' };

test('display names are optional presentation while user identity remains required', () => {
	assert.deepEqual(identitySchema.parse({ userId: 'verified-id' }), { userId: 'verified-id' });
	assert.deepEqual(identitySchema.parse({ userId: 'verified-id', displayName: 'Name' }), { userId: 'verified-id', displayName: 'Name' });
	assert.equal(identitySchema.safeParse({ displayName: 'Name' }).success, false);
	assert.equal(identitySchema.safeParse({ userId: '', displayName: 'Name' }).success, false);
	assert.equal(identitySchema.safeParse({ userId: 'verified-id', displayName: null }).success, false);
});

test('Stop request and receipt expose only the bound Session and receipt identity', () => {
	assert.deepEqual(clientStopSchema.parse({ sessionId: 'work' }), { sessionId: 'work' });
	for (const extra of [{ cutoff: 3 }, { context: {} }, { sessionKind: 'work' }, { requestId: 'inside-params' }])
		assert.equal(clientStopSchema.safeParse({ sessionId: 'work', ...extra }).success, false);
	assert.deepEqual(stopReceiptSchema.parse({ requestId: 'stop', sessionId: 'work' }), { requestId: 'stop', sessionId: 'work' });
	assert.equal(stopReceiptSchema.safeParse({ requestId: 'stop', sessionId: 'work', cutoff: 3 }).success, false);
});

test('client DTOs cannot submit roles, internal tool calls or actor metadata', () => {
	const message = { content: [publicText], attachments: [] };
	assert.equal(clientMessageInputSchema.safeParse(message).success, true);
	for (const extra of [{ role: 'system' }, { metadata: { user: { userId: 'other' } } }, { providerOptions: { apiKey: 'private' } }])
		assert.equal(clientMessageInputSchema.safeParse({ ...message, ...extra }).success, false);
	assert.equal(
		clientMessageInputSchema.safeParse({ content: [{ type: 'tool-call', toolName: 'private.read' }], attachments: [] }).success,
		false,
	);
	assert.equal(clientSendSchema.safeParse({ sessionId: 'public-session', message, actor: 'other' }).success, false);
	assert.equal(
		clientResponseSchema.safeParse({ sessionId: 's', toolCallId: 'public-call', output: { decision: 'approve' } }).success,
		true,
	);
});
test('public message schemas strip unrecognized internal metadata and reject raw parts', () => {
	const raw = {
		ref,
		createdAt: '2026-10-15T00:00:00Z',
		role: 'assistant',
		state: 'complete',
		content: [{ ...publicText, providerMetadata: { secret: 'hidden' } }],
		attachments: [],
		reasoning: 'hidden',
		rawToolResults: ['hidden'],
	};
	const safe = messageSchema.parse(raw);
	assert.equal(JSON.stringify(safe).includes('hidden'), false);
	assert.equal(messageSchema.safeParse({ ...raw, content: [{ type: 'reasoning', text: 'hidden' }] }).success, false);
	assert.equal(messageSchema.safeParse({ ...raw, role: 'tool' }).success, false);
	assert.equal(messageSchema.safeParse({ ...raw, state: 'failed' }).success, false);
	assert.equal(CLIENT_PROTOCOL_REVISION, 1);
});
test('session state and live/replay events use the same public message schema', () => {
	const event = {
		type: 'state',
		sessionId: 's',
		sequence: 1,
		state: {
			session: { id: 's', kind: 'work', title: 'Work', owner: { userId: 'u', displayName: 'User' }, createdAt: 'now' },
			status: 'idle',
			messages: {
				items: [
					{ ref, createdAt: 'now', role: 'assistant', state: 'complete', content: [publicText], attachments: [], privateMemory: 'hidden' },
				],
				nextCursor: null,
			},
		},
		hostCalls: [],
		internalTrace: 'hidden',
	};
	assert.equal(JSON.stringify(stateEventSchema.parse(event)).includes('hidden'), false);
});

test('all public envelopes accept implicit or explicit v1 and reject unknown explicit versions', () => {
	const cases = [
		['request', clientFrameSchema, { id: 'request', method: 'sessions.history', params: { sessionId: 's' } }],
		['auth', clientFrameSchema, { type: 'auth', token: 'synthetic-token' }],
		['ready', serverFrameSchema, { type: 'ready' }],
		['result', serverFrameSchema, { type: 'result', id: 'request', result: null }],
		[
			'error',
			serverFrameSchema,
			{ type: 'error', id: 'request', error: { code: 'INVALID_INPUT', message: 'Invalid request.', retryable: false } },
		],
		['state', serverFrameSchema, { type: 'state', sessionId: 's', sequence: 1, state: { status: 'loading' }, hostCalls: [] }],
	];
	for (const [name, schema, frame] of cases) {
		assert.deepEqual(schema.parse(frame), frame, `${name}: existing unversioned shape must be preserved`);
		assert.deepEqual(schema.parse({ ...frame, version: CLIENT_PROTOCOL_REVISION }), { ...frame, version: 1 }, `${name}: explicit v1`);
		for (const version of [0, 2, 999, '1', null])
			assert.equal(schema.safeParse({ ...frame, version }).success, false, `${name}: unsupported version ${JSON.stringify(version)}`);
	}
});
