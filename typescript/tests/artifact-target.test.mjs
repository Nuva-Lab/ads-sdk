import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNuva, PartialCreationError } from '../dist/index.js';
import { backendSchema } from '../dist/schemas.js';
const id = '01a175e0-31b3-da69-176e-0842e6f6602e';
const relationships = [{ type: 'based_on', target: { kind: 'product', id } }, { type: 'based_on', target: { kind: 'skill', id: '01a175e0-2000-0000-ffff-abcdefabcdef' } }];
const record = (kind, data) => ({ kind, id, lineage_id: id, base_id: null, schema_version: 1, data, relationships, batch_id: null, created_at: '2026-10-26T12:00:00Z', assets: {}, entities: {}, skills: {} });

test('Script and Plan content is text; source relationships are explicit and required on reads', () => {
	for (const [name, kind] of [['Script', 'script'], ['DirectingPlan', 'directing_plan']]) {
		const saved = record(kind, { text: 'Source text' });
		assert.deepEqual(backendSchema(name).parse(saved), saved);
		const { relationships: _, ...legacy } = saved;
		assert.equal(backendSchema(name).safeParse(legacy).success, false);
		for (const old of [{ product: id }, { skill: id }, { script: id }, { specs: [] }])
			assert.equal(backendSchema(name).safeParse({ ...saved, data: { ...saved.data, ...old } }).success, false);
		for (const suffix of ['Create', 'VersionCreate']) {
			const base = { data: saved.data, ...(suffix === 'Create' ? { schema_version: 1 } : {}) };
			assert.equal(Object.hasOwn(backendSchema(name + suffix).parse(base), 'relationships'), false, 'Omission preserves server inheritance semantics');
			for (const refs of [[], relationships]) assert.deepEqual(backendSchema(name + suffix).parse({ ...base, relationships: refs }).relationships, refs);
			assert.equal(backendSchema(name + suffix).safeParse({ ...base, relationships: null }).success, false);
		}
	}
});

test('partial Prompt receipts retain null Batch and reject missing relationships or legacy plan data', () => {
	const saved = record('prompt', { prompt: 'Clip', image_asset_ids: [id] });
	const info = { code: 'PARTIAL_CREATION', message: 'One saved', retryable: false };
	assert.equal(new PartialCreationError(info, { prompts: [saved] }).saved.prompts[0].batch_id, null);
	const { relationships: _, ...legacy } = saved;
	assert.throws(() => new PartialCreationError(info, { prompts: [legacy] }), error => error.code === 'SERVICE_ERROR');
	assert.throws(() => new PartialCreationError(info, { prompts: [{ ...saved, data: { ...saved.data, plan: id } }] }), error => error.code === 'SERVICE_ERROR');
});

test('PR error acceptance remains optional and nullable without inventing retry authority', () => {
	const base = { code: 'FAILED', message: 'Failure', retryable: false };
	assert.deepEqual(backendSchema('Error').parse(base), base);
	for (const acceptance of [null, 'not_accepted', 'unknown']) assert.deepEqual(backendSchema('Error').parse({ ...base, acceptance }), { ...base, acceptance });
	assert.equal(backendSchema('Error').safeParse({ ...base, acceptance: 'accepted' }).success, false);
});

test('customer Artifact writes omit relationship control while returned relationships remain readable', async () => {
 const original = globalThis.fetch, calls = [];
 const content = JSON.parse(await readFile(new URL('./fixtures/script-response.json', import.meta.url), 'utf8'));
 globalThis.fetch = async (url, options) => {
  const body = JSON.parse(options.body); calls.push(body);
  const revised = String(url).endsWith('/versions');
  return Response.json({ ...record('script', body.data), ...(revised ? { id: '01a175e0-3000-cccc-1111-abcdefabcdef', base_id: id, relationships } : { relationships: [] }) }, { status: 201 });
 };
 const client = createNuva({ baseUrl: 'http://127.0.0.1:9010/api', storeBaseUrl: 'http://127.0.0.1:9011', getAccessToken: async () => 'local-test-only' });
 try {
  const created = await client.scripts.create({ content }); assert.deepEqual(created.content, content);
  assert.equal(Object.hasOwn(calls[0], 'relationships'), false);
  const revised = await client.artifacts.update({kind:'script',id}, {data:{text:'Revised'}});
  assert.deepEqual(revised.relationships, relationships); assert.equal(Object.hasOwn(calls[1], 'relationships'), false);
  const typed = client.artifacts.forSchema({kind:'script',schemaVersion:1,writable:true,parse:value=>value});
  for (const refs of [undefined, [], relationships]) {
   for (const invoke of [
    () => client.artifacts.create({kind:'script',schema_version:1,data:{text:'Draft'},relationships:refs}),
    () => client.artifacts.update({kind:'script',id},{data:{text:'Draft'},relationships:refs}),
    () => client.prompts.create({data:{prompt:'Clip',image_asset_ids:[id]},relationships:refs}),
    () => typed.update({kind:'script',id},{data:{text:'Draft'},relationships:refs}),
    () => client.videos.generate({input:{schema_version:1,data:{prompt:'Clip',image_asset_ids:[id]},relationships:refs}}),
   ]) await assert.rejects(async () => invoke(), error => error.code==='UNSUPPORTED_OPERATION' && error.acceptance==='not_accepted');
  }
  assert.equal(calls.length, 2, 'Relationship writes must fail before any HTTP request');
 } finally {client.close();globalThis.fetch=original;}
});
