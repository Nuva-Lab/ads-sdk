/** Wire envelopes: request, reply and state frames, and the parameters of the base Session methods. */
import { z } from 'zod';
import {
	clientMessageInputSchema,
	errorSchema,
	jsonValueSchema,
	sessionSnapshotSchema,
	type NuvaErrorInfo,
	type SessionSnapshot,
} from './model.js';

/** Initial client-visible contract revision; distinct from agent/provider formats. */
export const CLIENT_PROTOCOL_REVISION = 1 as const;
export interface RequestFrame {
	/** Omission preserves the original implicit v1 contract. Other explicit versions are rejected. */
	version?: 1;
	id: string;
	method: string;
	params: unknown;
}
export type ReplyFrame = ({ type: 'result'; id: string; result: unknown } | { type: 'error'; id: string; error: NuvaErrorInfo }) & {
	version?: 1;
};
export type StateEvent = { version?: 1; type: 'state' } & SessionSnapshot;
export type ServerFrame = ReplyFrame | StateEvent | { type: 'ready'; version?: 1 } | { type: 'reauthenticated'; id: string; version?: 1 };

export type ClientFrame =
	| { type: 'auth'; token: string; version?: 1 }
	| { type: 'reauth'; id: string; token: string; version?: 1 }
	| RequestFrame;

// Missing version is the original implicit v1 format. Declare the field on
// every envelope so an unsupported explicit version is rejected, never stripped.
const envelopeVersion = { version: z.literal(1).optional() };
export const stateEventSchema = z.object({ ...envelopeVersion, type: z.literal('state'), ...sessionSnapshotSchema.shape });
export const serverFrameSchema = z.union([
	stateEventSchema,
	z.object({ ...envelopeVersion, type: z.literal('ready') }),
	z.object({ ...envelopeVersion, type: z.literal('reauthenticated'), id: z.string().min(1) }).strict(),
	z.object({ ...envelopeVersion, type: z.literal('result'), id: z.string(), result: jsonValueSchema }),
	z.object({ ...envelopeVersion, type: z.literal('error'), id: z.string(), error: errorSchema }),
]);
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
