// What a later backend may add to an answer, for reference_examples.mjs with ADDED_VALUES=1: a field (`added_later`) in
// every object that refuses other fields, and a new value (`added_later`) for every enum but JobStatus. A Job status the
// SDK doesn't know means the Job hasn't ended (stores.ts › JobState), so the examples that wait for a Job would never
// end; typescript/tests/added-values.test.mjs covers it.
import { createRequire } from 'node:module';

// The SDK's Zod, which the definitions are written for (the docs' own may be another version).
const { z } = createRequire(new URL('../typescript/package.json', import.meta.url))('zod');

export const ADDED = 'added_later';

/** `widen(value, schemaName)`: the answer with what a later backend adds; `added` collects where something was added. */
export function widener(definitions) {
	const compiled = new Map();
	// Which anyOf branch a value is: the first one it is valid for, as the contract checks it.
	const matches = (branch, value) => {
		const key = JSON.stringify(branch);
		if (!compiled.has(key)) compiled.set(key, z.fromJSONSchema({ ...branch, $defs: definitions }));
		return compiled.get(key).safeParse(value).success;
	};
	const widen = (value, schema, owner, added) => {
		if (typeof schema?.$ref === 'string') {
			const name = schema.$ref.split('/').pop();
			return name === 'JobStatus' ? value : widen(value, definitions[name], name, added);
		}
		if (Array.isArray(schema?.anyOf)) {
			const branch = schema.anyOf.find((option) => matches(option, value));
			return branch === undefined ? value : widen(value, branch, owner, added);
		}
		if (Array.isArray(schema?.enum) && typeof value === 'string') {
			added.add(`${owner} enum`);
			return ADDED;
		}
		if (Array.isArray(value)) return schema?.items ? value.map((item) => widen(item, schema.items, owner, added)) : value;
		if (value !== null && typeof value === 'object' && schema) {
			const widened = {};
			for (const [key, item] of Object.entries(value)) {
				const field = schema.properties?.[key] ?? (typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined);
				widened[key] = field ? widen(item, field, owner, added) : item;
			}
			if (schema.additionalProperties === false) {
				widened[ADDED] = true;
				added.add(owner);
			}
			return widened;
		}
		return value;
	};
	return (value, name, added) => widen(value, { $ref: '#/$defs/' + name }, name, added);
}
