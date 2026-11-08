import type { AdsErrorCode } from '@nuva/protocol';
import type { AdsErrorInfo } from './types.js';

/** Whether the service took a failed write: the SDK's own replay decisions read it; it is not part of the error. */
export type Acceptance = 'not_accepted' | 'unknown';
/** What an AdsError is made from inside the SDK. */
export interface AdsErrorInit {
	readonly code: AdsErrorCode;
	readonly message: string;
	readonly retryable: boolean;
	readonly requestId?: string;
	readonly method?: string;
	readonly details?: { path: string; message: string }[] | null;
	readonly acceptance?: Acceptance;
}
const acceptances = new WeakMap<AdsError, Acceptance>();

export class AdsError extends Error implements AdsErrorInfo {
	readonly code: AdsErrorCode;
	readonly retryable: boolean;
	readonly requestId?: string;
	readonly method?: string;
	readonly details?: { path: string; message: string }[];
	constructor(init: AdsErrorInit) {
		super(init.message);
		this.name = 'AdsError';
		this.code = init.code;
		this.retryable = init.retryable;
		if (init.requestId !== undefined) this.requestId = init.requestId;
		if (init.method !== undefined) this.method = init.method;
		if (init.details != null && init.details.length > 0) this.details = init.details;
		if (init.acceptance !== undefined) acceptances.set(this, init.acceptance);
	}
	toJSON(): AdsErrorInfo {
		return {
			code: this.code,
			message: this.message,
			retryable: this.retryable,
			...(this.requestId === undefined ? {} : { requestId: this.requestId }),
			...(this.method === undefined ? {} : { method: this.method }),
			...(this.details === undefined ? {} : { details: this.details }),
		};
	}
}

/** Whether the service took the write `error` came from (`undefined`: not known, or a read). */
export function acceptanceOf(error: AdsError): Acceptance | undefined {
	return acceptances.get(error);
}
/** `error` as an AdsErrorInit, with its acceptance, to make a changed copy. */
export function initOf(error: AdsError): AdsErrorInit {
	const acceptance = acceptances.get(error);
	return { ...error.toJSON(), ...(acceptance === undefined ? {} : { acceptance }) };
}
/** `error` with the SDK method it came from, when it has none yet. */
export function withMethod(error: unknown, method: string): unknown {
	if (!(error instanceof AdsError) || error.method !== undefined) return error;
	return new AdsError({ ...initOf(error), method });
}

export function errorInfo(error: unknown): AdsErrorInfo {
	if (error instanceof AdsError) return error.toJSON();
	return { code: 'SERVICE_ERROR', message: error instanceof Error ? error.message : String(error), retryable: false };
}
