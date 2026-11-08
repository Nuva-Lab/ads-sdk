import { serverFrameSchema, stateEventSchema, sessionSchema, messageSchema, messagePageSchema } from '@nuva/protocol';
import { z } from 'zod';
import { AdsError } from './errors.js';
import type { StateEvent, ServerFrame, Session, MessageView, Page } from '@nuva/protocol';
import type { SessionFile } from './types.js';
function parse<T>(schema: { parse(v: unknown): unknown }, value: unknown): T {
	try {
		return schema.parse(value) as T;
	} catch (e) {
		throw new AdsError({
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
/** `files.get`: unknown extra fields are dropped, so later additions (other media types included) never break a client. */
export const sessionFileSchema = z.object({
	id: z.string().min(1),
	mime: z.string().min(1),
	label: z.string(),
	download_url: z.string().min(1),
	download_url_expires_at: z.string().min(1),
});
export const parseSessionFile = (value: unknown) => parse<SessionFile>(sessionFileSchema, value);
