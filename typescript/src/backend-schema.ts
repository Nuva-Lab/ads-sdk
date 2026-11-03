import { z } from 'zod';
import { backendIdPattern } from './backend-id.js';
import { backendDefinitions } from './backend-definitions.js';
import { backendDefinitions as videoDefinitions } from './backend-video-definitions.js';
import type { BackendSchemas } from './backend-target.js';

// Keep both generated sources unchanged. Apply the verified PR Artifact/Ad/Batch/Product/error overlay
// in memory; its transitive Asset/Entity/Skill dependencies equal the observed source.
const targetDefinitions = { ...structuredClone(backendDefinitions), ...structuredClone(videoDefinitions) };
// A legacy public log indicates the wrong backend contract; do not expose or silently drop it.
targetDefinitions.BatchOut!.properties!.log = false;
// With sibling oneOf objects, Zod admits extra top-level keys despite the
// source's additionalProperties:false (for example {input: ..., invented: true}).
// Expand the two alternatives to complete strict objects without changing either
// generated source. The compile-time overlay handles the corresponding bare-object type.
const { oneOf: _alternatives, ...video } = targetDefinitions.GenerateVideo!;
const properties = video.properties!;
function nonNull(value: unknown): typeof video {
	const branch = (value as typeof video).anyOf?.find((option) => option.type !== 'null');
	if (!branch) throw new Error('Video target source must define a nullable Prompt source.');
	return branch;
}
targetDefinitions.GenerateVideo = {
	anyOf: [
		{ ...video, required: ['prompt'], properties: { ...properties, prompt: nonNull(properties.prompt), input: { type: 'null' } } },
		{ ...video, required: ['input'], properties: { ...properties, input: nonNull(properties.input), prompt: { type: 'null' } } },
	],
};
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
	description: 'PR target JSON Product attributes; validated recursively below.',
};
const compiled = new Map<keyof BackendSchemas, z.ZodType>();
/** Observed backend schemas with OrderedUUID and verified PR target overlays.
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
	// Generated sources stay unchanged; OrderedUUID layout and target overlays are adapted above.
	return schema as z.ZodType<BackendSchemas[K]>;
}
export type { BackendSchemas } from './backend-target.js';

export type { DeployedBackendSchemas } from './backend-target.js';
