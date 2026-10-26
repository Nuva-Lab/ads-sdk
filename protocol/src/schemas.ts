import { z } from 'zod';
import type { JsonValue } from './types.js';
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([z.null(), z.boolean(), z.string(), z.number().finite(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
);
export const jsonObjectSchema = z.record(z.string(), jsonValueSchema);
export const resourceRefSchema = z.object({ kind: z.string().min(1), id: z.string().min(1) }).strict();
export const identitySchema = z.object({ userId: z.string().min(1), displayName: z.string().optional() });
export const messageRefSchema = z.object({ sessionId: z.string().min(1), messageId: z.string().min(1) });
export const stopReceiptSchema = z.object({ requestId: z.string().min(1), sessionId: z.string().min(1) }).strict();
export const resourceLinkSchema = z.object({ ref: resourceRefSchema, label: z.string() });
export const errorSchema = z.object({
	code: z.string().min(1),
	message: z.string(),
	retryable: z.boolean(),
	requestId: z.string().optional(),
	acceptance: z.enum(['not_accepted', 'unknown']).optional(),
});
export const sessionSchema = z.object({
	id: z.string().min(1),
	kind: z.enum(['main', 'work']),
	title: z.string(),
	owner: identitySchema,
	createdAt: z.string(),
});
const toolBase = z.object({
	type: z.literal('dynamic-tool'),
	toolCallId: z.string().min(1),
	toolName: z.string().min(1),
	input: jsonObjectSchema,
});
export const clientToolSchema = z.discriminatedUnion('state', [
	toolBase.extend({ state: z.literal('input-available') }),
	toolBase.extend({ state: z.literal('output-available'), output: jsonValueSchema }),
	toolBase.extend({ state: z.literal('output-error'), errorText: z.string() }),
]);
export const clientResponseReceiptSchema = z.object({
	requestId: z.string().min(1),
	call: toolBase.extend({ state: z.literal('output-available'), output: jsonValueSchema }),
});
export const clientFailureReceiptSchema = z.object({
	requestId: z.string().min(1),
	call: toolBase.extend({ state: z.literal('output-error'), errorText: z.string() }),
});
export const hostCallSchema = z.object({
	id: z.string().min(1),
	type: z.literal('data-host-call'),
	data: z.object({ toolName: z.string().min(1), input: jsonObjectSchema }),
});
export const messagePartSchema = z.union([
	z.object({ id: z.string().min(1), type: z.literal('text'), format: z.enum(['plain', 'markdown']), text: z.string() }),
	z.object({ id: z.string().min(1), type: z.literal('resource'), record: resourceLinkSchema }),
	// Explicit compatibility for stored preview mentions: identity and ordering are preserved.
	z
		.object({ id: z.string().min(1), type: z.literal('mention'), record: resourceLinkSchema })
		.transform((part) => ({ id: part.id, type: 'quote' as const, target: part.record })),
	z.object({
		id: z.string().min(1),
		type: z.literal('quote'),
		target: z.union([resourceLinkSchema, messageRefSchema]),
		text: z.string().min(1).optional(),
	}),
	clientToolSchema,
	hostCallSchema,
]);
const messageBase = z.object({
	ref: messageRefSchema,
	createdAt: z.string(),
	content: z.array(messagePartSchema),
	attachments: z.array(resourceLinkSchema),
	replyTo: messageRefSchema.optional(),
	state: z.enum(['streaming', 'complete', 'interrupted', 'failed']),
	error: errorSchema.optional(),
});
export const messageSchema = z
	.discriminatedUnion('role', [
		messageBase.extend({ role: z.literal('user'), metadata: z.object({ user: identitySchema }) }),
		messageBase.extend({ role: z.literal('assistant') }),
	])
	.superRefine((message, ctx) => {
		if (message.state === 'failed' && message.error === undefined)
			ctx.addIssue({ code: 'custom', path: ['error'], message: 'Failed messages require a public error.' });
	});
export const messagePageSchema = z.object({ items: z.array(messageSchema), nextCursor: z.string().nullable() });
const common = z.object({ session: sessionSchema, messages: messagePageSchema, error: errorSchema.optional() });
export const agentStateSchema = z.union([
	z.object({ status: z.literal('loading') }),
	z.object({ status: z.literal('error'), error: errorSchema }),
	common.extend({ status: z.enum(['idle', 'running']) }),
	common.extend({ status: z.literal('waiting_for_response'), callIds: z.array(z.string()) }),
]);
// Missing version is the original implicit v1 format. Declare the field on
// every envelope so an unsupported explicit version is rejected, never stripped.
const envelopeVersion = { version: z.literal(1).optional() };
export const stateEventSchema = z.object({
	...envelopeVersion,
	type: z.literal('state'),
	sessionId: z.string().min(1),
	sequence: z.number().int().nonnegative(),
	state: agentStateSchema,
	hostCalls: z.array(z.union([clientToolSchema, hostCallSchema])),
});
export const serverFrameSchema = z.union([
	stateEventSchema,
	z.object({ ...envelopeVersion, type: z.literal('ready') }),
	z.object({ ...envelopeVersion, type: z.literal('reauthenticated'), id: z.string().min(1) }).strict(),
	z.object({ ...envelopeVersion, type: z.literal('result'), id: z.string(), result: jsonValueSchema }),
	z.object({ ...envelopeVersion, type: z.literal('error'), id: z.string(), error: errorSchema }),
]);

// Client submissions contain user content only. Roles, tool invocations and author metadata are server-owned.
export const clientMessagePartSchema = z.union([
	z.object({ id: z.string().min(1), type: z.literal('text'), format: z.enum(['plain', 'markdown']), text: z.string() }).strict(),
	z
		.object({ id: z.string().min(1), type: z.literal('mention'), record: resourceLinkSchema })
		.strict()
		.transform((part) => ({ id: part.id, type: 'quote' as const, target: part.record })),
	z
		.object({
			id: z.string().min(1),
			type: z.literal('quote'),
			target: z.union([resourceLinkSchema, messageRefSchema]),
			text: z.string().min(1).optional(),
		})
		.strict(),
]);
export const clientMessageInputSchema = z
	.object({
		content: z.array(clientMessagePartSchema),
		attachments: z.array(resourceLinkSchema),
		replyTo: messageRefSchema.optional(),
	})
	.strict()
	.refine((message) => message.content.length > 0 || message.attachments.length > 0, 'Provide message content or an attachment.');
export const clientStopSchema = z.object({ sessionId: z.string().min(1) }).strict();
export const clientSendSchema = z.object({ sessionId: z.string().min(1), message: clientMessageInputSchema }).strict();
export const clientResponseSchema = z
	.object({ sessionId: z.string().min(1), toolCallId: z.string().min(1), output: jsonValueSchema })
	.strict();
export const clientFailureSchema = z
	.object({
		sessionId: z.string().min(1),
		toolCallId: z.string().min(1),
		failure: z.object({ code: z.string().min(1), message: z.string() }).strict(),
	})
	.strict();
export const sessionPageSchema = z.object({ items: z.array(sessionSchema), nextCursor: z.string().nullable() });
export const clientCallSchema = z.union([clientToolSchema, hostCallSchema]);
export const clientCallPageSchema = z.object({ items: z.array(clientToolSchema), nextCursor: z.string().nullable() });

export const requestFrameSchema = z
	.object({ ...envelopeVersion, id: z.string().min(1), method: z.string().min(1), params: jsonValueSchema })
	.strict();
export const clientAuthFrameSchema = z.object({ ...envelopeVersion, type: z.literal('auth'), token: z.string().min(1) }).strict();
export const clientReauthFrameSchema = z
	.object({ ...envelopeVersion, type: z.literal('reauth'), id: z.string().min(1), token: z.string().min(1) })
	.strict();
export const clientFrameSchema = z.union([clientAuthFrameSchema, clientReauthFrameSchema, requestFrameSchema]);
export type ClientStopParams = z.infer<typeof clientStopSchema>;
export type ClientSendParams = z.infer<typeof clientSendSchema>;
export type ClientToolResponseParams = z.infer<typeof clientResponseSchema>;
export type ClientToolFailureParams = z.infer<typeof clientFailureSchema>;
