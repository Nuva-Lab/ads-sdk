import test from 'node:test';
import assert from 'node:assert/strict';
import { backendSchema, generateScriptSchema, generatePromptSchema, skillSelectionSchema } from '../dist/schemas.js';

const id = '11111111-1111-4111-8111-111111111111';
test('backend Product creation requires a Brand and rejects unsupported profile fields', () => {
	assert.equal(backendSchema('ProductCreate').parse({ brand_id: id, data: { name: 'Bottle' } }).brand_id, id);
	assert.equal(backendSchema('ProductCreate').safeParse({ data: { name: 'Bottle' } }).success, false);
	assert.equal(backendSchema('ProductCreate').safeParse({ brand_id: id, data: { name: 'Bottle', invented: 'field' } }).success, false);
});
test('video prompt field remains a saved Prompt ID; raw content uses input', () => {
	assert.equal(backendSchema('GenerateVideo').parse({ prompt: id }).prompt, id);
	assert.equal(backendSchema('GenerateVideo').safeParse({ prompt: 'A bottle on a table' }).success, false);
});
test('backend Artifact v1 remains explicit rather than interpreting ScriptPackage as markdown', () => {
	assert.equal(backendSchema('ScriptDataV1').parse({ text: 'An ad script' }).text, 'An ad script');
	assert.equal(backendSchema('ScriptDataV1').safeParse({ schema_version: 2, concept: {}, clips: [] }).success, false);
});
test('backend Ad registration requires the final video and preserves editor data', () => {
	const value = { batch_id: id, schema_version: 1, asset_id: id, composition: { clips: [{ asset_id: id }], editor: { zoom: 2 } } };
	assert.deepEqual(backendSchema('AdCreate').parse(value).composition.editor, { zoom: 2 });
	assert.equal(backendSchema('AdCreate').safeParse({ batch_id: id, schema_version: 1, composition: value.composition }).success, false);
});

test('shared creation schemas accept exact service boundaries without tightening valid inputs', () => {
	const instruction = 'x'.repeat(32000);
	assert.equal(
		generateScriptSchema.safeParse({ product: id, acceptable_duration_ms: { min: 1, max: 5000 }, instruction }).success,
		true,
	);
	assert.equal(generateScriptSchema.safeParse({ product: id, acceptable_duration_ms: { min: 1, max: 5000 }, skill: { id } }).success, false, 'A request names no Skill.');
	assert.equal(generatePromptSchema.safeParse({ script: id, skill: { id } }).success, false, 'A request names no Skill.');
	assert.equal(skillSelectionSchema.safeParse({ id }).success, true);
	for (const ratio of ['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'])
		assert.equal(generatePromptSchema.safeParse({ script: id, ratio, instruction }).success, true);
	assert.equal(generatePromptSchema.safeParse({ script: id }).success, true);
	assert.equal(generatePromptSchema.safeParse({ script: id, ratio: null }).success, false);
});

test('Product attributes are an explicit JSON target overlay while the observed schema stays unchanged', async () => {
	const { readFile } = await import('node:fs/promises');
	const observed = JSON.parse(await readFile(new URL('../schema/backend.openapi.json', import.meta.url), 'utf8'));
	assert.equal(observed.components.schemas.ProductDataV1.properties.attributes, undefined);
	const data = { name: 'Bottle', attributes: { nested: { color: 'blue' }, tags: ['one'], quantity: 3 } };
	assert.deepEqual(backendSchema('ProductCreate').parse({ brand_id: id, data }).data.attributes, data.attributes);
	assert.equal(
		backendSchema('ProductCreate').safeParse({ brand_id: id, data: { name: 'Bottle', attributes: { execute() {} } } }).success,
		false,
	);
});

test('backend OrderedUUID uses GUID shape without RFC version or variant restrictions', async () => {
	const { backendIdSchema } = await import('../dist/schemas.js');
	const { backendDefinitions } = await import('../dist/backend-definitions.js');
	const product = '01a175e0-20c1-3f18-da7c-5afa67a79363';
	const script = '01a175e0-31b3-da69-176e-0842e6f6602e';
	const skill = '01a175e0-1000-ff00-0000-abcdefabcdef';
	const asset = '01a175e0-2000-0000-ffff-abcdefabcdef';
	const job = '01a175e0-3000-cccc-1111-abcdefabcdef';
	for (const value of [product, script, skill, asset, job]) assert.equal(backendIdSchema.parse(value), value);
	assert.equal(backendSchema('ProductCreate').parse({ brand_id: product, data: { name: 'Ordered' } }).brand_id, product);
	assert.equal(backendSchema('ScriptCreate').parse({ schema_version: 1, data: { text: 'Script' }, relationships: [{ type: 'based_on', target: { kind: 'product', id: product } }] }).relationships[0].target.id, product);
	assert.equal(backendSchema('SkillRef').parse({ skill_id: skill, name: 'writer', version: 1 }).skill_id, skill);
	assert.equal(backendSchema('GenerateVideo').parse({ prompt: script, batch_id: job }).batch_id, job);
	assert.equal(
		generateScriptSchema.parse({
			product,
			base: script,
			batch_id: job,
			acceptable_duration_ms: { min: 5000, max: 5000 },
		}).base,
		script,
	);
	assert.equal(generatePromptSchema.parse({ script }).script, script);
	for (const invalid of [
		product + '\n',
		product + '0',
		product.slice(1),
		product.replaceAll('-', ''),
		'../' + product,
		'zzzzzzzz-0000-0000-0000-000000000000',
	]) {
		assert.equal(backendIdSchema.safeParse(invalid).success, false);
		assert.equal(backendSchema('GenerateVideo').safeParse({ prompt: invalid }).success, false);
	}
	assert.equal(backendDefinitions.Product.properties.id.format, 'uuid', 'Observed generated definitions stay unchanged.');
});


test('assembly is not an exported customer schema or route', async () => {
	const schemas = await import('../dist/schemas.js');
	const { dataRequest } = await import('../dist/data-routes.js');
	assert.equal('assembleVideoSchema' in schemas, false);
	assert.equal('assembledVideoSchema' in schemas, false);
	assert.throws(() => dataRequest('videos.assemble', {}), error => error.code === 'UNSUPPORTED_OPERATION');
});
