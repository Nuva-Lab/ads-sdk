/**
 * Service origins for local development and tests: our own tools point the client at a local Agent, Store or writer.
 * Workspace-only (`@nuva/sdk/internal`); customers choose an `environment`.
 */
import type { NuvaClientOptions } from './types.js';

export interface ServiceOrigins {
	/** The Agent, e.g. `http://127.0.0.1:8787/api`. */
	readonly baseUrl?: string;
	/** The Store (backend). */
	readonly storeBaseUrl?: string;
	/** The writers; an explicit local Agent may host them too. */
	readonly generationBaseUrl?: string;
}
/** `options` for `createNuva`, with the services at `origins`. */
export function withServices<T extends NuvaClientOptions>(options: T, origins: ServiceOrigins): T {
	return { ...options, ...origins };
}
/** The origins set with `withServices`, if any. */
export function servicesOf(options: NuvaClientOptions): ServiceOrigins {
	return options as NuvaClientOptions & ServiceOrigins;
}
