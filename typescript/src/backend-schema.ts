import { z } from 'zod';
import { backendIdPattern } from './backend-id.js';
import { backendDefinitions } from './backend-definitions.js';
import type { BackendSchemas } from './backend-target.js';

// Keep generated observed definitions unchanged; adapt backend OrderedUUID layout and optional target attributes here.
const targetDefinitions = structuredClone(backendDefinitions);
// The observed OpenAPI uses format:uuid for its OrderedUUID storage type. Zod's RFC UUID
// validator is narrower than that deployed type. Adapt only this in-memory schema clone.
function orderedIds(value: unknown): void {
	if (Array.isArray(value)) {
		for (const child of value) orderedIds(child);
		return;
	}
	if (value === null || typeof value !== 'object') return;
	const node = value as Record<string, unknown>;
	if (node.format === 'uuid') {
		delete node.format;
		node.type ??= 'string';
		node.pattern = backendIdPattern;
		node.minLength = 36;
		node.maxLength = 36;
	}
	for (const child of Object.values(node)) orderedIds(child);
}
orderedIds(targetDefinitions);
const product = targetDefinitions.ProductDataV1 as { properties: Record<string, unknown> };
product.properties.attributes = {
	type: 'object',
	additionalProperties: true,
	description: 'Proposed target-only arbitrary Product attributes.',
};
const compiled = new Map<keyof BackendSchemas, z.ZodType>();
/** Observed backend schemas with their documented OrderedUUID layout and Product-attributes overlay.
 * Authorization, reference existence and semantic rules remain server-owned. */
export function backendSchema<K extends keyof BackendSchemas>(name: K): z.ZodType<BackendSchemas[K]> {
	let schema = compiled.get(name);
	if (schema === undefined) {
		schema = z.fromJSONSchema({ $ref: '#/$defs/' + name, $defs: targetDefinitions });
		if (String(name).startsWith('Product'))
			schema = schema.superRefine((value, context) => {
				const validate = (data: unknown) => {
					if (
						data !== null &&
						typeof data === 'object' &&
						'attributes' in data &&
						data.attributes !== undefined &&
						!z.json().safeParse(data.attributes).success
					)
						context.addIssue({ code: 'custom', message: 'Product attributes must contain JSON data only.' });
				};
				if (name === 'ProductDataV1') validate(value);
				else if (value !== null && typeof value === 'object') {
					if ('data' in value) validate(value.data);
					if ('items' in value && Array.isArray(value.items)) for (const item of value.items) validate(item.data);
				}
			});
		compiled.set(name, schema);
	}
	// Generated source stays unchanged; backend OrderedUUID layout and target attributes are adapted above.
	return schema as z.ZodType<BackendSchemas[K]>;
}
export type { BackendSchemas } from './backend-target.js';

export type { DeployedBackendSchemas } from './backend-target.js';
