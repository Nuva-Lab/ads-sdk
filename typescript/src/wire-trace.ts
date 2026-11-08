/**
 * The raw-traffic observer the admin page records SDK traffic with. Workspace-only (`@nuva/sdk/internal`): customers
 * report a problem with an error's `requestId` and `method` instead.
 */
import type { NuvaClientOptions } from './types.js';
import type { WireTraceEntry } from './protocol.js';

type Observer = (trace: WireTraceEntry) => void | Promise<void>;
const observers = new WeakMap<object, Observer>();

/** `options` for `createNuva`, with every request and frame (bodies included) passed to `observe`. */
export function withWireTrace<T extends NuvaClientOptions>(options: T, observe: Observer): T {
	const traced = { ...options };
	observers.set(traced, observe);
	return traced;
}
export function wireObserver(options: object): Observer | undefined {
	return observers.get(options);
}
