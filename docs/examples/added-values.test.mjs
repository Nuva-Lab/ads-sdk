// Every API reference example works through the SDK when the backend adds to its answers what a later release may
// (added_values.mjs): a field in each object that refuses other fields, and a new value for each enum.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const run = (env) =>
	JSON.parse(execFileSync(process.execPath, ['reference_examples.mjs'], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 64 << 20 }));

test('the reference examples read answers with values added after this SDK, and keep them', () => {
	const output = run({ ADDED_VALUES: '1' });
	for (const [name, { problems }] of Object.entries(output)) assert.deepEqual(problems, [], name);
	// Each object that refuses other fields, and each enum, that the SDK reads in an example. JobStatus and
	// CallbackStatus are in typescript/tests/added-values.test.mjs.
	assert.deepEqual([...new Set(Object.values(output).flatMap(({ added }) => added))].sort(), [
		'AssetOut enum',
		'AssetSource enum',
		'BrandDataV1',
		'CharacterDataV1',
		'Clip',
		'CompositionReadV1',
		'ProductDataV2',
		'PromptReadV1',
		'PromptReadV1 enum',
		'ScriptDataV1',
		'ShareAccess enum',
		'StoryboardDataV1',
	]);
	// What was added is kept in what the SDK returns.
	assert.equal(output['brands.get'].result.data.added_later, true);
	assert.equal(output['assets.get'].result.kind, 'added_later');
	assert.equal(output['ads.get'].result.composition.clips[0].added_later, true);
	assert.equal(output['prompts.get'].result.data.ratio, 'added_later');
	assert.equal(output['shares.set'].result.access, 'added_later');
});
