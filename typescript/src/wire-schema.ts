import { serverFrameSchema, stateEventSchema, sessionSchema, messageSchema, messagePageSchema } from '@nuva/protocol';
import { z } from 'zod';
import { NuvaError } from './errors.js';
import type { StateEvent, ServerFrame, Session, MessageView, Page } from '@nuva/protocol';
function parse<T>(schema: { parse(v: unknown): unknown }, value: unknown): T {
	try {
		return schema.parse(value) as T;
	} catch (e) {
		throw new NuvaError({
			code: 'SERVICE_ERROR',
			message: 'Malformed service response: ' + (e instanceof Error ? e.message : String(e)),
			retryable: false,
		});
	}
}
export const parseFrame = (value: unknown) => parse<ServerFrame>(serverFrameSchema, value);
export const parseStateEvent = (value: unknown) => parse<StateEvent>(stateEventSchema, value);
export const parseSession = (value: unknown) => parse<Session>(sessionSchema, value);
export const parseMessage = (value: unknown) => parse<MessageView>(messageSchema, value);
export const parseMessages = (value: unknown) => parse<Page<MessageView>>(messagePageSchema, value);
export const parseSessions = (value: unknown) =>
	parse<Page<Session>>(z.object({ items: z.array(sessionSchema), nextCursor: z.string().nullable() }), value);
