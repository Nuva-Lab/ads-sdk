import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import openapiTS, { NULL, astToString, tsLiteral, tsUnion } from 'openapi-typescript';
import ts from 'typescript';

/**
 * The schemas the backend only sends: reachable from a response and from no request body or parameter. Their enums are
 * open in the types (`'queued' | … | (string & {})`), since the backend may add a value and the SDK reads it
 * (backend-schema.ts › lenient). A schema that is also sent keeps its enums closed: it is checked as given. So a shared
 * enum (ShareAccess, MembershipRole) is closed in the generated types while the SDK reads any value: read a response
 * that holds one with a hand-written open type (stores.ts › Share, AutoShare), not with these generated ones.
 */
function sentOnly(document) {
	const schemas = document.components.schemas;
	const reach = (value, into) => {
		if (Array.isArray(value)) value.forEach((item) => reach(item, into));
		else if (value !== null && typeof value === 'object') {
			const name = typeof value.$ref === 'string' ? value.$ref.split('/').pop() : undefined;
			if (name !== undefined && !into.has(name)) {
				into.add(name);
				reach(schemas[name], into);
			}
			Object.values(value).forEach((item) => reach(item, into));
		}
		return into;
	};
	const sent = new Set(), read = new Set();
	for (const item of Object.values(document.paths))
		for (const operation of Object.values(item)) {
			if (operation === null || typeof operation !== 'object') continue;
			reach([operation.requestBody, operation.parameters], sent);
			reach(operation.responses, read);
		}
	return new Set([...read].filter((name) => !sent.has(name)));
}
// `string & {}` keeps the known values in editor completion while admitting any string.
const anyString = ts.factory.createIntersectionTypeNode([
	ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
	ts.factory.createTypeLiteralNode([]),
]);

// The public contract. The internal one, the Agent's, is in WhatIf (agents/ads-agent/packages/internal-contract).
for (const prefix of ['backend']) {
	const input = new URL(`../schema/${prefix}.openapi.json`, import.meta.url);
	const source = JSON.parse(await readFile(new URL(`../schema/${prefix}.source.json`, import.meta.url), 'utf8'));
	const text = await readFile(input, 'utf8');
	if (createHash('sha256').update(text).digest('hex') !== source.sha256)
		throw new Error('Backend snapshot differs from its recorded source.');
	const document = JSON.parse(text);
	const open = sentOnly(document);
	const strings = (schema) => Array.isArray(schema?.enum) && schema.enum.every((value) => typeof value === 'string');
	const openEnum = (schema) => [...schema.enum.map((value) => tsLiteral(value)), anyString];
	const transform = (schema, { path }) => {
		const name = /^#\/components\/schemas\/([^/]+)/.exec(path ?? '')?.[1];
		if (name === undefined || !open.has(name)) return undefined;
		if (strings(schema)) return tsUnion(openEnum(schema));
		// openapi-typescript doesn't pass an anyOf's members here: open a nullable enum (`enum | null`) as a whole.
		if (Array.isArray(schema.anyOf) && schema.anyOf.some(strings)) {
			if (!schema.anyOf.every((option) => strings(option) || option.type === 'null'))
				throw new Error(`${path}: only a nullable enum is opened; teach generate-backend.mjs this shape.`);
			return tsUnion([...schema.anyOf.filter(strings).flatMap(openEnum), ...(schema.anyOf.some((option) => option.type === 'null') ? [NULL] : [])]);
		}
		return undefined;
	};
	const header = `// Generated from ${source.path} at ${source.commit}. Do not edit.\n`;
	const types =
		header +
		astToString(await openapiTS(document, { defaultNonNullable: false, transform })) +
		'\nexport type BackendSchemas = components["schemas"];\n';
	// Zod uses JSON Schema $defs. Keep validation keywords, including required and
	// additionalProperties, intact; only schema-reference paths are translated.
	const definitions = JSON.parse(JSON.stringify(document.components.schemas).replaceAll('#/components/schemas/', '#/$defs/'));
	const schemas =
		header +
		'import type { z } from \"zod\";\nexport const backendDefinitions: Record<string, Exclude<Parameters<typeof z.fromJSONSchema>[0], boolean>> = ' +
		JSON.stringify(definitions, null, 2) +
		';\n';
	for (const [name, content] of [
		[`${prefix}-types.ts`, types],
		[`${prefix}-definitions.ts`, schemas],
	]) {
		const target = new URL('../src/' + name, import.meta.url);
		if (process.argv.includes('--check')) {
			if ((await readFile(target, 'utf8')) !== content) throw new Error('Regenerate backend contract: ' + name);
		} else await writeFile(target, content);
	}
}
