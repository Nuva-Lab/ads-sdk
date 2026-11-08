import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNuva } from '../dist/index.js';
import { backendSchema, encodeStoryboard } from '../dist/internal.js';
import { acceptanceOf } from '../dist/internal.js';
const id = '01a175e0-31b3-da69-176e-0842e6f6602e';
const relationships = [{ type: 'based_on', target: { kind: 'product', id } }, { type: 'based_on', target: { kind: 'skill', id: '01a175e0-2000-0000-ffff-abcdefabcdef' } }];
const other = '01a175e0-3000-cccc-1111-abcdefabcdef';
const record = (kind, data) => ({ kind, id, lineage_id: id, base_id: null, schema_version: 1, data, relationships, batch_id: null, created_at: '2026-10-26T12:00:00Z', assets: {}, entities: {}, skills: {} });

test('Script and Storyboard content is text; source relationships are explicit and required on reads', () => {
	for (const [name, kind] of [['Script', 'script'], ['Storyboard', 'storyboard']]) {
		const saved = record(kind, { text: 'Source text' });
		assert.deepEqual(backendSchema(name).parse(saved), saved);
		const { relationships: _, ...legacy } = saved;
		assert.equal(backendSchema(name).safeParse(legacy).success, false);
		for (const old of [{ product: id }, { skill: id }, { script: id }, { specs: [] }])
			assert.equal(backendSchema(name).safeParse({ ...saved, data: { ...saved.data, ...old } }).success, false);
		// Only the Agent writes Scripts and Storyboards: their write bodies are in the internal contract alone.
		for (const suffix of ['Create', 'VersionCreate']) assert.throws(() => backendSchema(name + suffix));
	}
});

test('acceptance is not in the public error contract; a service that still sends it is read', async () => {
	const base = { code: 'FAILED', message: 'Failure', retryable: false };
	assert.deepEqual(backendSchema('Error').parse(base), base);
	const contract = JSON.parse(await readFile(new URL('../schema/backend.openapi.json', import.meta.url), 'utf8')).components.schemas;
	assert.equal(contract.Error.properties.acceptance, undefined);
	for (const acceptance of [null, 'not_accepted', 'unknown']) assert.equal(backendSchema('Error').safeParse({ ...base, acceptance }).success, true);
});

test('customers write Artifacts only through their own clients, and never their relationships', async () => {
 const original = globalThis.fetch, calls = [];
 const content = JSON.parse(await readFile(new URL('./fixtures/script-v3.json', import.meta.url), 'utf8'));
 const prompt = { prompt: '<Picture 1>', image_asset_ids: [id] };
 globalThis.fetch = async (url, options) => {
  calls.push([options.method ?? 'GET', String(url), options.body ? JSON.parse(options.body) : undefined]);
  const kind = String(url).includes('/prompt/') ? 'prompt' : 'script';
  const data = kind === 'prompt' ? { ...prompt, seconds: 8, ratio: '9:16', clip_id: 'C01' } : { text: JSON.stringify({ format: 'nuva.script', version: 3, content }) };
  if ((options.method ?? 'GET') === 'GET') return Response.json(record(kind, data));
  const body = JSON.parse(options.body);
  // A Script made from another goes to the Agent's Script endpoint as { base, content }.
  if (String(url).endsWith('/v1/generate/script')) return Response.json({ ...record('script', { text: JSON.stringify({ format: 'nuva.script', version: 3, content: body.content }) }), id: other, base_id: body.base }, { status: 201 });
  return Response.json({ ...record(kind, body.data), id: other, base_id: id }, { status: 201 });
 };
 const client = createNuva({ baseUrl: 'http://127.0.0.1:9010/api', storeBaseUrl: 'http://127.0.0.1:9011', getAccessToken: async () => 'local-test-only' });
 try {
  assert.equal(client.artifacts, undefined);
  for (const resource of ['scripts', 'storyboards', 'prompts']) {
   assert.equal(client[resource].create, undefined);
   assert.equal(client[resource].update, undefined);
  }
  const made = await client.scripts.createFrom({ kind: 'script', id }, { concept: content.concept });
  assert.equal(made.base_id, id);
  assert.deepEqual(calls.at(-1)[2], { base: id, content });
  // A Prompt made from another changes only render fields; the rest is copied from the base.
  const version = await client.prompts.createFrom({ kind: 'prompt', id }, { prompt: '<Picture 1> turns.' });
  assert.equal(version.base_id, id);
  assert.deepEqual(calls.at(-1), ['POST', `http://127.0.0.1:9011/v1/artifacts/prompt/${id}/versions`, { data: { prompt: '<Picture 1> turns.', image_asset_ids: [id], video_asset_ids: [], audio_asset_ids: [], seconds: 8, ratio: '9:16' } }]);
  const before = calls.length;
  await assert.rejects(async () => client.prompts.createFrom({ kind: 'prompt', id }, { clip_id: 'C02' }), (error) => error.code === 'INVALID_INPUT' && error.message.includes('clip_id'));
  for (const refs of [undefined, [], relationships]) {
   for (const invoke of [
    () => client.scripts.createFrom({ kind: 'script', id }, { relationships: refs }),
    () => client.prompts.createFrom({ kind: 'prompt', id }, { relationships: refs }),
    () => client.videos.generate({ input: { schema_version: 1, data: prompt, relationships: refs } }),
   ]) await assert.rejects(async () => invoke(), error => error.code === 'UNSUPPORTED_OPERATION' && acceptanceOf(error) === 'not_accepted');
  }
  assert.equal(calls.length, before + 1, 'Relationship writes fail before any HTTP request (the clip_id check read the base)');
 } finally { client.close(); globalThis.fetch = original; }
});

test('generateFrom and createFrom go through the writer endpoints; the old generate forms name the new methods', async () => {
 const original = globalThis.fetch, requests = [];
 const board = { script: other, cast: { presenter: { look: '短发女性', voice: '中音' } }, direction: '明亮工位', clips: [{ id: 'C01', duration_ms: 8000, shots: ['{{presenter}}举起{{product}}说{{L01}}'] }] };
 const scriptContent = JSON.parse(await readFile(new URL('./fixtures/script-v3.json', import.meta.url), 'utf8'));
 const product = '01a175e0-20c1-3f18-da7c-5afa67a79363';
 // As a customer reads it: the Product it was written for is the Product's id and version.
 const script = { ...record('script', { text: JSON.stringify({ format: 'nuva.script', version: 3, content: scriptContent }) }), relationships: [{ type: 'based_on', target: { kind: 'product', id: product, version: 2 } }] };
 delete script.entities;
 const storyboard = { ...record('storyboard', { text: encodeStoryboard(board) }) };
 globalThis.fetch = async (url, options) => {
  const body = options.body ? JSON.parse(options.body) : undefined;
  requests.push([options.method ?? 'GET', String(url), body]);
  if (String(url).includes('/artifacts/script/')) return Response.json(script);
  if (String(url).includes('/artifacts/storyboard/')) return Response.json(storyboard);
  if (String(url).endsWith('/generate/script')) return Response.json({ ...script, id: other, base_id: id }, { status: 201 });
  return Response.json({ ...storyboard, id: other, base_id: id }, { status: 201 });
 };
 const client = createNuva({ baseUrl: 'http://127.0.0.1:9010/api', storeBaseUrl: 'http://127.0.0.1:9011', generationBaseUrl: 'http://127.0.0.1:9012', getAccessToken: async () => 'local-test-only' });
 try {
  const ref = { kind: 'storyboard', id };
  assert.equal((await client.storyboards.generateFrom(ref, { instruction: 'Shorter', cast: { presenter: { id: other } } })).base_id, id);
  assert.equal((await client.storyboards.createFrom(ref, { direction: '夜景' })).base_id, id);
  await client.scripts.generateFrom({ kind: 'script', id }, { instruction: 'Warmer' });
  await client.scripts.generateFrom({ kind: 'script', id }, { instruction: 'Longer', acceptable_duration_ms: { min: 12000, max: 15000 } });
  const length = scriptContent.duration_ms;
  assert.deepEqual(requests, [
   ['POST', 'http://127.0.0.1:9012/v1/generate/storyboard', { base: id, instruction: 'Shorter', cast: { presenter: { id: other } } }],
   ['GET', `http://127.0.0.1:9011/v1/artifacts/storyboard/${id}`, undefined],
   ['POST', 'http://127.0.0.1:9012/v1/generate/storyboard', { base: id, content: { ...board, direction: '夜景' } }],
   ['GET', `http://127.0.0.1:9011/v1/artifacts/script/${id}`, undefined],
   ['POST', 'http://127.0.0.1:9012/v1/generate/script', { product, base: id, instruction: 'Warmer', acceptable_duration_ms: { min: length, max: length } }],
   ['GET', `http://127.0.0.1:9011/v1/artifacts/script/${id}`, undefined],
   ['POST', 'http://127.0.0.1:9012/v1/generate/script', { product, base: id, instruction: 'Longer', acceptable_duration_ms: { min: 12000, max: 15000 } }],
  ]);
  const sent = requests.length;
  for (const [invoke, method] of [
   [() => client.storyboards.generate({ base: id, instruction: 'Shorter' }), 'storyboards.generateFrom'],
   [() => client.storyboards.generate({ base: id, content: board }), 'storyboards.generateFrom'],
   [() => client.storyboards.generate({ content: board }), 'createFrom'],
   [() => client.scripts.generate({ product, base: id, acceptable_duration_ms: { min: 5000, max: 9000 } }), 'scripts.generateFrom'],
  ])
   await assert.rejects(async () => invoke(), (error) => error.code === 'INVALID_INPUT' && acceptanceOf(error) === 'not_accepted' && error.message.includes(method), method);
  for (const invalid of [
   () => client.storyboards.generateFrom(ref, {}),
   () => client.storyboards.generateFrom(ref, { instruction: '' }),
   () => client.storyboards.createFrom({ kind: 'script', id }, { direction: 'x' }),
   () => client.scripts.generateFrom({ kind: 'script', id }, { instruction: 'x', product }),
  ])
   await assert.rejects(async () => invalid(), (error) => error.code === 'INVALID_INPUT');
  assert.equal(requests.length, sent, 'Invalid and old-form requests fail before any HTTP request');
 } finally { client.close(); globalThis.fetch = original; }
});

test('storyboards.generate saves the Storyboard; prompts.generate compiles its clips and a partial failure carries its receipt', async () => {
 const original = globalThis.fetch, requests = [];
 const content = { script: other, cast: { presenter: { look: '短发女性', voice: '中音' } }, direction: '明亮工位', clips: [{ id: 'C01', duration_ms: 8000, shots: ['{{presenter}}举起{{product}}说{{L01}}'] }] };
 const storyboard = record('storyboard', { text: encodeStoryboard(content) });
 const prompt = (clip, promptId = id) => ({ ...record('prompt', { prompt: 'Clip', image_asset_ids: [id], clip_id: clip }), id: promptId, relationships: [{ type: 'based_on', target: { kind: 'storyboard', id } }] });
 let reply = () => Response.json(storyboard, { status: 201 });
 globalThis.fetch = async (url, options) => {
  requests.push([options.method ?? 'GET', String(url), options.body ? JSON.parse(options.body) : undefined]);
  return options.method === 'POST' ? reply() : Response.json(storyboard);
 };
 const client = createNuva({ baseUrl: 'http://127.0.0.1:9010/api', storeBaseUrl: 'http://127.0.0.1:9011', generationBaseUrl: 'http://127.0.0.1:9012', getAccessToken: async () => 'local-test-only' });
 try {
  const generated = await client.storyboards.generate({ script: other, cast: { presenter: { id: other } } });
  assert.equal(generated.kind, 'storyboard');
  assert.deepEqual(generated.content, content);
  assert.deepEqual((await client.storyboards.get({ kind: 'storyboard', id })).content, content);
  await assert.rejects(async () => client.storyboards.generate({ script: other, ratio: '9:16' }), error => error.code === 'INVALID_INPUT', 'A Storyboard takes no ratio.');

  reply = () => Response.json({ prompts: [prompt('C01'), prompt('C02', other)] });
  const { prompts } = await client.prompts.generate({ storyboard: id, ratio: '9:16' });
  assert.deepEqual(prompts.map(p => [p.kind, p.data.clip_id]), [['prompt', 'C01'], ['prompt', 'C02']]);
  await assert.rejects(client.prompts.generate({ storyboard: id, clip: 'C01' }), error => error.code === 'SERVICE_ERROR', 'One clip returns only its Prompt.');
  // Without clip, every Prompt names a distinct clip.
  const checked = requests.length;
  for (const prompts of [[prompt('C01'), prompt(null, other)], [prompt('C01'), prompt('C01', other)], [{ ...prompt('C01'), data: { prompt: 'Clip', image_asset_ids: [id] } }]]) {
   reply = () => Response.json({ prompts });
   await assert.rejects(client.prompts.generate({ storyboard: id }), error => error.code === 'SERVICE_ERROR', JSON.stringify(prompts.map(p => p.data.clip_id)));
  }
  reply = () => Response.json({ error: { code: 'NOT_FOUND', message: 'Storyboard has no clip C09.', retryable: false, acceptance: 'not_accepted' }, request_id: 'unknown-clip' }, { status: 404 });
  await assert.rejects(client.prompts.generate({ storyboard: id, clip: 'C09' }), error => error.code === 'NOT_FOUND' && acceptanceOf(error) === 'not_accepted' && error.method === 'prompts.generate');
  requests.splice(checked);
  reply = () => Response.json({ prompts: [{ ...prompt('C01'), relationships }] });
  await assert.rejects(client.prompts.generate({ storyboard: id }), error => error.code === 'SERVICE_ERROR', 'Prompts are based on the requested Storyboard.');
  for (const bad of [{ script: other }, { storyboard: id, clip: '1' }, { storyboard: id, instruction: 'Brighter' }])
   await assert.rejects(async () => client.prompts.generate(bad), error => error.code === 'INVALID_INPUT', JSON.stringify(bad));
  reply = () => Response.json({ error: { code: 'PARTIAL_CREATION', message: 'C02 failed', retryable: false }, request_id: 'partial', saved: { prompts: [prompt('C01')] } }, { status: 409 });
  // The SDK has no partial result: an error is an error (the service answers 0.5 callers all or nothing).
  await assert.rejects(client.prompts.generate({ storyboard: id }), error =>
   error.code === 'PARTIAL_CREATION' && error.requestId === 'partial' && error.method === 'prompts.generate' && !('saved' in error));
  assert.deepEqual(requests.map(([method, url, body]) => [method, url, body]), [
   ['POST', 'http://127.0.0.1:9012/v1/generate/storyboard', { script: other, cast: { presenter: { id: other } } }],
   ['GET', `http://127.0.0.1:9011/v1/artifacts/storyboard/${id}`, undefined],
   ['POST', 'http://127.0.0.1:9012/v1/generate/prompt', { storyboard: id, ratio: '9:16' }],
   ['POST', 'http://127.0.0.1:9012/v1/generate/prompt', { storyboard: id, clip: 'C01' }],
   ['POST', 'http://127.0.0.1:9012/v1/generate/prompt', { storyboard: id }],
   ['POST', 'http://127.0.0.1:9012/v1/generate/prompt', { storyboard: id }],
  ]);
 } finally {client.close();globalThis.fetch=original;}
});
