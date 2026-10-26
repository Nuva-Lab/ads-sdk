import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import openapiTS, { astToString } from 'openapi-typescript';

const input = new URL('../schema/backend.openapi.json', import.meta.url);
const source = JSON.parse(await readFile(new URL('../schema/backend.source.json', import.meta.url), 'utf8'));
const text = await readFile(input, 'utf8');
if (createHash('sha256').update(text).digest('hex') !== source.sha256)
	throw new Error('Backend snapshot differs from its recorded source.');
const document = JSON.parse(text);
const header = `// Generated from ads_backend/openapi.json at ${source.commit}. Do not edit.\n`;
const types =
	header +
	astToString(await openapiTS(document, { defaultNonNullable: false })) +
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
	['backend-types.ts', types],
	['backend-definitions.ts', schemas],
]) {
	const target = new URL('../src/' + name, import.meta.url);
	if (process.argv.includes('--check')) {
		if ((await readFile(target, 'utf8')) !== content) throw new Error('Regenerate backend contract: ' + name);
	} else await writeFile(target, content);
}
