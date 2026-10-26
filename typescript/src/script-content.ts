import { z } from 'zod';
import { scriptResponseSchema, type ScriptPackage } from './service-schemas.js';

const marker = z.object({ format: z.literal('nuva.script-package'), version: z.literal(2), content: scriptResponseSchema }).strict();
const MAX_TEXT = 65_536;
/** Storage schema is script@1. The marked content inside its text field has
 * its own version; serializing this envelope does not change schema_version. */
export function encodeScriptPackage(content: ScriptPackage): string {
	const text = JSON.stringify(marker.parse({ format: 'nuva.script-package', version: 2, content }));
	if (text.length > MAX_TEXT) throw new TypeError('Encoded ScriptPackage exceeds the backend text limit of 65,536 characters.');
	return text;
}
export function decodeScriptPackage(text: string): ScriptPackage {
	if (text.length > MAX_TEXT) throw new TypeError('Encoded ScriptPackage exceeds the backend text limit of 65,536 characters.');
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new TypeError('This text is not an encoded ScriptPackage. Use the generic Artifact reader for plain text.');
	}
	const result = marker.safeParse(value);
	if (!result.success) throw new TypeError('Unsupported or invalid ScriptPackage content format.');
	return result.data.content;
}
