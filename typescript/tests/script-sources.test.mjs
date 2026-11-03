import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNuva } from '../dist/index.js';
import { encodeScriptPackage, decodeScript } from '../dist/schemas.js';

const content = JSON.parse(await readFile(new URL('./fixtures/script-v3.json', import.meta.url), 'utf8'));
const legacy = JSON.parse(await readFile(new URL('./fixtures/script-response.json', import.meta.url), 'utf8'));
const id = '01a175e0-31b3-da69-176e-0842e6f6602e';
const relationships = [
  { type: 'based_on', target: { kind: 'product', id } },
  { type: 'based_on', target: { kind: 'skill', id: '01a175e0-2000-0000-ffff-abcdefabcdef' } },
];

test('Script creation optionally forwards source links without resolving or validating their targets', async () => {
  const original = globalThis.fetch, requests = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    requests.push({ url: String(url), method: init.method, body, key: new Headers(init.headers).get('Idempotency-Key') });
    return Response.json({ kind: 'script', id, lineage_id: id, base_id: null, schema_version: 1,
      data: body.data, batch_id: body.batch_id ?? null, relationships: body.relationships ?? [],
      assets: {}, entities: {}, skills: {}, created_at: '2026-10-26T12:00:00Z' }, { status: 201 });
  };
  const sdk = createNuva({ getAccessToken: async () => 'fixture', storeBaseUrl: 'https://backend.invalid' });
  try {
    const manual = await sdk.scripts.create({ content });
    assert.equal(manual.format, 3);
    assert.deepEqual(manual.content, content);
    assert.deepEqual(decodeScript(requests[0].body.data.text), content);
    assert.equal(Object.hasOwn(requests[0].body, 'relationships'), false);
    const linked = await sdk.scripts.create({ content, batch_id: id, relationships }, { idempotencyKey: 'manual-source-links' });
    assert.deepEqual(linked.content, content);
    assert.deepEqual(linked.relationships, relationships);
    assert.equal(linked.batch_id, id);
    assert.equal(requests.length, 2);
    assert.ok(requests.every(r => r.method === 'POST' && r.url.endsWith('/v1/artifacts/script')));
    assert.equal(requests[1].key, 'manual-source-links');
    await assert.rejects(sdk.scripts.create({ content, relationships: [{ type: 'based_on', target: { kind: 'product', id: 'invalid-id' } }] }), e => e.code === 'INVALID_INPUT');
    await assert.rejects(sdk.scripts.create({ content: { schema_version: 2, clips: [] } }), e => e.code === 'INVALID_INPUT');
    await assert.rejects(sdk.scripts.create({ content: legacy }), e => e.code === 'INVALID_INPUT', 'v2 ScriptPackages are read-only.');
    assert.equal(requests.length, 2, 'Schema-invalid inputs must fail before HTTP');
  } finally { sdk.close(); globalThis.fetch = original; }
});

test('backend relationship rejection is returned without a second request', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ error: { code: 'FORBIDDEN', message: 'Relationship target is not accessible.', retryable: false, acceptance: 'not_accepted' }, request_id: 'fixture-rejection' }, { status: 403 });
  };
  const sdk = createNuva({ getAccessToken: async () => 'fixture', storeBaseUrl: 'https://backend.invalid' });
  try {
    await assert.rejects(sdk.scripts.create({ content, relationships }), e => e.code === 'FORBIDDEN');
    assert.equal(calls, 1);
  } finally { sdk.close(); globalThis.fetch = original; }
});

test('a v2 ScriptPackage Script reads as read-only legacy, and an update writes it forward as v3', async () => {
  const original = globalThis.fetch, requests = [];
  const saved = (data, extra = {}) => ({ kind: 'script', id, lineage_id: id, base_id: null, schema_version: 1, data, batch_id: null, relationships,
    assets: {}, entities: {}, skills: {}, created_at: '2026-10-26T12:00:00Z', ...extra });
  globalThis.fetch = async (url, init) => {
    requests.push([init.method ?? 'GET', String(url)]);
    if (init.method === 'POST') return Response.json(saved(JSON.parse(init.body).data, { id: '01a175e0-3000-cccc-1111-abcdefabcdef', base_id: id }), { status: 201 });
    return Response.json(saved({ text: encodeScriptPackage(legacy) }));
  };
  const sdk = createNuva({ getAccessToken: async () => 'fixture', storeBaseUrl: 'https://backend.invalid' });
  try {
    const read = await sdk.scripts.get({ kind: 'script', id });
    assert.equal(read.format, 2);
    assert.deepEqual(read.legacy, legacy);
    assert.equal(read.content, undefined);
    const revised = await sdk.scripts.update({ kind: 'script', id }, { content });
    assert.equal(revised.format, 3);
    assert.deepEqual(revised.content, content);
    assert.deepEqual(requests, [['GET', `https://backend.invalid/v1/artifacts/script/${id}`], ['GET', `https://backend.invalid/v1/artifacts/script/${id}`], ['POST', `https://backend.invalid/v1/artifacts/script/${id}/versions`]]);
  } finally { sdk.close(); globalThis.fetch = original; }
});
