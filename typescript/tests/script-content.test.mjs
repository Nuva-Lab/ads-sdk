import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { encodeScriptPackage, decodeScriptPackage, backendSchema } from '../dist/schemas.js';

const content = JSON.parse(await readFile(new URL('./fixtures/script-response.json', import.meta.url), 'utf8'));
test('the marked ScriptPackage round-trips through the existing backend text field', () => {
	const text = encodeScriptPackage(content);
	const data = backendSchema('ScriptDataV1').parse({ text });
	assert.deepEqual(decodeScriptPackage(data.text), content);
});
test('plain text and unsupported content versions are not guessed as ScriptPackage', () => {
	assert.throws(() => decodeScriptPackage('# Plain script'), /encoded ScriptPackage/);
	assert.throws(() => decodeScriptPackage(JSON.stringify({ format: 'nuva.script-package', version: 99, content })), /Unsupported/);
	assert.throws(() => decodeScriptPackage(JSON.stringify(content)), /Unsupported/);
});
test('encoded content over the backend text limit fails rather than truncating', () => {
	const large = structuredClone(content);
	large.open_issues = Array.from({ length: 30 }, () => 'x'.repeat(3000));
	assert.throws(() => encodeScriptPackage(large), /65,536/);
});
test('invalid structured content is rejected before writing the opaque backend field', () => {
	assert.throws(() => encodeScriptPackage({ schema_version: 2, clips: [] }));
});

test('decoder rejects oversized stored text before parsing its content', () => {
	assert.throws(() => decodeScriptPackage(' '.repeat(65_537)), /65,536/);
});
