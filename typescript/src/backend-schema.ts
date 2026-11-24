import { z } from 'zod';
import { backendIdPattern } from './backend-id.js';
import { backendDefinitions as publicDefinitions } from './backend-definitions.js';
import type { BackendSchemas } from './backend-target.js';

export type Definitions = typeof publicDefinitions;
type Definition = Definitions[string];

/** The generated definitions, adapted in memory where Zod and the backend disagree. */
export function adapted(source: Definitions): Definitions {
	const definitions = structuredClone(source);
	// With sibling oneOf objects, Zod admits extra top-level keys despite additionalProperties:false
	// (for example {input: ..., invented: true}). Expand the two alternatives to complete strict objects.
	const { oneOf: _alternatives, ...video } = definitions.GenerateVideo!;
	const properties = video.properties!;
	const nonNull = (value: unknown): Definition => {
		const branch = (value as Definition).anyOf?.find((option) => (option as Definition).type !== 'null');
		if (!branch) throw new Error('GenerateVideo must define a nullable Prompt source.');
		return branch as Definition;
	};
	definitions.GenerateVideo = {
		anyOf: [
			{ ...video, required: ['prompt'], properties: { ...properties, prompt: nonNull(properties.prompt), input: { type: 'null' } } },
			{ ...video, required: ['input'], properties: { ...properties, input: nonNull(properties.input), prompt: { type: 'null' } } },
		],
	};
	// The backend's ids are ordered UUIDs, which Zod's RFC UUID check refuses: match their layout instead.
	const orderedIds = (value: unknown): void => {
		if (Array.isArray(value)) return value.forEach(orderedIds);
		if (value === null || typeof value !== 'object') return;
		const node = value as Record<string, unknown>;
		if (node.format === 'uuid') {
			delete node.format;
			node.type ??= 'string';
			node.pattern = backendIdPattern;
			node.minLength = 36;
			node.maxLength = 36;
		}
		Object.values(node).forEach(orderedIds);
	};
	orderedIds(definitions);
	// Product attributes are any JSON object; checked recursively below.
	for (const name of ['ProductDataV2', 'ProductEditData'])
		(definitions[name] as { properties: Record<string, unknown> }).properties.attributes = {
			type: 'object',
			additionalProperties: true,
			description: 'Product attributes as JSON data.',
		};
	return definitions;
}

/**
 * The definitions responses are parsed with: `adapted` ones that still parse what a newer backend sends. A field the SDK
 * doesn't know is kept, as it already is on objects that never refused one, and an enum value it doesn't know comes
 * through as the string the backend sent. Single-value enums, which tell one kind of record from another, stay. Requests
 * are still checked with the `adapted` definitions, so the SDK never sends a value the backend doesn't take.
 */
export function tolerant(source: Definitions): Definitions {
	const definitions = structuredClone(source);
	const open = (value: unknown): void => {
		if (Array.isArray(value)) return value.forEach(open);
		if (value === null || typeof value !== 'object') return;
		const node = value as Record<string, unknown>;
		if (node.additionalProperties === false) delete node.additionalProperties;
		if (Array.isArray(node.enum) && node.enum.length > 1 && node.enum.every((option) => typeof option === 'string')) {
			delete node.enum;
			node.type = 'string';
		}
		// A `properties` map's keys are field names, not keywords: only its schemas are opened.
		for (const [key, child] of Object.entries(node))
			if (key === 'properties' && child !== null && typeof child === 'object') Object.values(child).forEach(open);
			else open(child);
	};
	Object.values(definitions).forEach(open);
	return definitions;
}

export function compiler<S>(definitions: Definitions) {
	const compiled = new Map<keyof S, z.ZodType>();
	return <K extends keyof S>(name: K): z.ZodType<S[K]> => {
		let schema = compiled.get(name);
		if (schema === undefined) {
			schema = z.fromJSONSchema({ $ref: '#/$defs/' + String(name), $defs: definitions });
			if (String(name).startsWith('Product')) schema = schema.superRefine(jsonAttributes(String(name)));
			compiled.set(name, schema);
		}
		return schema as z.ZodType<S[K]>;
	};
}

function jsonAttributes(name: string) {
	return (value: unknown, context: z.RefinementCtx) => {
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
		if (name.endsWith('Data')) validate(value);
		else if (value !== null && typeof value === 'object') {
			if ('data' in value) validate(value.data);
			if ('items' in value && Array.isArray(value.items)) for (const item of value.items) validate(item.data);
		}
	};
}

/** A schema of the public contract (API version 2026-11-07). Authorization, references and other
 * semantic rules stay the backend's. */
export const backendSchema = compiler<BackendSchemas>(adapted(publicDefinitions));
/** The schema a response of the public contract is parsed with (`tolerant`): a field or enum value added by a newer
 * backend doesn't fail it. */
export const responseSchema = compiler<BackendSchemas>(tolerant(adapted(publicDefinitions)));
export type { BackendSchemas } from './backend-target.js';
