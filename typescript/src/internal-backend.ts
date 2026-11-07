/**
 * The internal backend contract: what only the Agent sends and reads (Script, Storyboard and Prompt creation, Ads,
 * Batches, the version ids it pins). The Agent's own entry: neither the npm package nor the source archive has it.
 */
import { backendDefinitions } from './backend-internal-definitions.js';
import { adapted, compiler } from './backend-schema.js';
import type { BackendSchemas as Internal } from './backend-internal-types.js';
import type { Overlay } from './backend-target.js';

/** Everything, including what only the Agent sends and reads. */
export type InternalBackendSchemas = Omit<Internal, keyof Overlay<Internal>> & Overlay<Internal>;
export const internalBackendSchema = compiler<InternalBackendSchemas>(adapted(backendDefinitions));
