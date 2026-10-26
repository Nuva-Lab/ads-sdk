export type { RequestFrame, ReplyFrame, StateEvent, ServerFrame } from '@nuva/protocol';
export interface TraceEntry {
	id: string;
	transport: 'http' | 'websocket';
	method: string;
	phase: 'request' | 'result' | 'error' | 'event';
	at: number;
	data: unknown;
	durationMs?: number;
}
/** Actual transport bodies before protocol decoding. Authentication values are redacted. */
export interface WireTraceEntry {
	at: number;
	transport: 'http' | 'websocket';
	direction: 'send' | 'receive' | 'connection';
	event: 'frame' | 'open' | 'close' | 'error';
	data: unknown;
	status?: number;
	redacted?: boolean;
}
export function frozen<T>(value: T): T {
	if (value !== null && typeof value === 'object') {
		Object.values(value).forEach(frozen);
		Object.freeze(value);
	}
	return value;
}
export function stableJSON(value: unknown): string {
	if (Array.isArray(value)) return '[' + value.map(stableJSON).join(',') + ']';
	if (value !== null && typeof value === 'object')
		return (
			'{' +
			Object.entries(value)
				.filter(([, v]) => v !== undefined)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => JSON.stringify(k) + ':' + stableJSON(v))
				.join(',') +
			'}'
		);
	return JSON.stringify(value) ?? 'null';
}
