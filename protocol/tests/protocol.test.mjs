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
	agentStateSchema,
	sessionSchema,
	messagePageSchema,
	errorSchema,
	sessionWaitingSchema,
} from '../dist/index.js';
import { z } from 'zod';
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

test('waiting is optional state: it parses with its exact fields, and clients built before it ignore it', () => {
	const base = {
		status: 'idle',
		session: { id: 'work', kind: 'work', title: 'Work', owner: { userId: 'owner' }, createdAt: '2026-11-03T00:00:00Z' },
		messages: { items: [], nextCursor: null },
	};
	const waiting = {
		jobs: [
			{ record: { ref: { kind: 'job', id: 'job-1' }, label: 'Clip 03' }, status: 'running' },
			{ record: { ref: { kind: 'job', id: 'job-2' }, label: 'Clip 04' }, status: 'queued' },
		],
		estimated_done_at: '2026-11-03T00:04:00Z',
	};
	assert.deepEqual(agentStateSchema.parse({ ...base, waiting }).waiting, waiting);
	assert.equal('waiting' in agentStateSchema.parse(base), false, 'Absent while nothing is pending.');
	assert.deepEqual(sessionWaitingSchema.parse({ jobs: waiting.jobs }), { jobs: waiting.jobs }, 'The estimate is optional.');
	for (const invalid of [{ jobs: [] }, { jobs: [{ ...waiting.jobs[0], status: 'completed' }] }, { jobs: [{ status: 'queued' }] }])
		assert.equal(sessionWaitingSchema.safeParse(invalid).success, false, JSON.stringify(invalid));
	// The state schema of the release before `waiting`, as an old client compiled it: the frame still parses and the
	// field is dropped, so old clients keep working unchanged.
	const previous = z.union([z.object({ session: sessionSchema, messages: messagePageSchema, error: errorSchema.optional() }).extend({ status: z.enum(['idle', 'running']) })]);
	const old = previous.parse({ ...base, waiting });
	assert.equal(old.status, 'idle');
	assert.equal('waiting' in old, false);
});

test('a steered send is an explicit mode, and a user message is unread until the Agent reads it; clients built before them are unaffected', () => {
	const message = { content: [publicText], attachments: [] };
	assert.equal(clientSendSchema.parse({ sessionId: 'work', message, mode: 'steer' }).mode, 'steer');
	assert.equal('mode' in clientSendSchema.parse({ sessionId: 'work', message }), false, 'Without a mode, a busy Session rejects the send.');
	for (const mode of ['queue', 'later', null]) assert.equal(clientSendSchema.safeParse({ sessionId: 'work', message, mode }).success, false, String(mode));
	const user = { ref, role: 'user', metadata: { user: { userId: 'owner' } }, createdAt: '2026-11-04T00:00:01Z', content: [publicText], attachments: [], state: 'complete' };
	assert.equal(messageSchema.parse({ ...user, unread: true }).unread, true);
	assert.equal('unread' in messageSchema.parse(user), false, 'Absent once read.');
	assert.equal(messageSchema.safeParse({ ...user, unread: false }).success, false, 'Only `true`; a read message has no field.');
	assert.equal('unread' in messageSchema.parse({ ...user, role: 'assistant', metadata: undefined, unread: true }), false, 'Not an assistant field.');
	// The message schema of the release before `unread`, as an old client compiled it: the field is dropped.
	const previous = z.object({ ref: z.object({ sessionId: z.string(), messageId: z.string() }), role: z.literal('user'), metadata: z.object({ user: identitySchema }) });
	assert.equal('unread' in previous.parse({ ...user, unread: true }), false);
});
