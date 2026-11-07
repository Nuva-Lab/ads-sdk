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

test('there is no scripts.create: a Script is written by the writer, and a version is checked before it is sent', async () => {
  const original = globalThis.fetch, requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push([init.method ?? 'GET', String(url)]);
    return Response.json({ kind: 'script', id, lineage_id: id, base_id: null, schema_version: 1,
      data: { text: JSON.stringify({ format: 'nuva.script', version: 3, content }) }, batch_id: null, relationships,
      assets: {}, entities: {}, skills: {}, created_at: '2026-10-26T12:00:00Z' });
  };
  const sdk = createNuva({ getAccessToken: async () => 'fixture', storeBaseUrl: 'https://backend.invalid' });
  try {
    assert.equal(sdk.scripts.create, undefined);
    await assert.rejects(sdk.scripts.update({ kind: 'script', id }, { content: { schema_version: 2, clips: [] } }), e => e.code === 'INVALID_INPUT');
    await assert.rejects(sdk.scripts.update({ kind: 'script', id }, { content: legacy }), e => e.code === 'INVALID_INPUT', 'v2 ScriptPackages are read-only.');
    assert.ok(requests.every(([method]) => method === 'GET'), 'Schema-invalid versions fail before any write');
  } finally { sdk.close(); globalThis.fetch = original; }
});

test('a backend rejection of a new version is returned without a second write', async () => {
  const original = globalThis.fetch;
  const writes = [];
  globalThis.fetch = async (url, init) => {
    if ((init.method ?? 'GET') === 'GET')
      return Response.json({ kind: 'script', id, lineage_id: id, base_id: null, schema_version: 1,
        data: { text: JSON.stringify({ format: 'nuva.script', version: 3, content }) }, batch_id: null, relationships,
        assets: {}, entities: {}, skills: {}, created_at: '2026-10-26T12:00:00Z' });
    writes.push(String(url));
    return Response.json({ error: { code: 'FORBIDDEN', message: 'Not your Script.', retryable: false, acceptance: 'not_accepted' }, request_id: 'fixture-rejection' }, { status: 403 });
  };
  const sdk = createNuva({ getAccessToken: async () => 'fixture', storeBaseUrl: 'https://backend.invalid' });
  try {
    await assert.rejects(sdk.scripts.update({ kind: 'script', id }, { content }), e => e.code === 'FORBIDDEN');
    assert.equal(writes.length, 1);
  } finally { sdk.close(); globalThis.fetch = original; }
});

test('a v2 ScriptPackage Script reads as read-only legacy; the Agent refuses an update of it', async () => {
  const original = globalThis.fetch, requests = [];
  const saved = (data, extra = {}) => ({ kind: 'script', id, lineage_id: id, base_id: null, schema_version: 1, data, batch_id: null, relationships,
    assets: {}, entities: {}, skills: {}, created_at: '2026-10-26T12:00:00Z', ...extra });
  globalThis.fetch = async (url, init) => {
    requests.push([init.method ?? 'GET', String(url)]);
    // As the Agent answers an edit of a v2 Script.
    if (init.method === 'POST') return Response.json({ error: { code: 'REJECTED', message: 'This Script was saved before Storyboards and is read-only. Write a new Script instead of revising it.', retryable: false, acceptance: 'not_accepted' }, request_id: 'v2-edit' }, { status: 422 });
    return Response.json(saved({ text: encodeScriptPackage(legacy) }));
  };
  const sdk = createNuva({ getAccessToken: async () => 'fixture', storeBaseUrl: 'https://backend.invalid' });
  try {
    const read = await sdk.scripts.get({ kind: 'script', id });
    assert.equal(read.format, 2);
    assert.deepEqual(read.legacy, legacy);
    assert.equal(read.content, undefined);
    await assert.rejects(sdk.scripts.update({ kind: 'script', id }, { content }), (e) => e.code === 'REJECTED' && e.acceptance === 'not_accepted' && e.message.includes('read-only'));
    assert.equal(requests[2][0], 'POST');
    assert.ok(requests[2][1].endsWith('/v1/generate/script'), 'The edit goes through the Agent, which refuses a v2 base.');
  } finally { sdk.close(); globalThis.fetch = original; }
});

test('asset is reserved: update refuses it, and a stored Script with that role cannot get a new version', async () => {
  const original = globalThis.fetch, requests = [];
  const withAsset = structuredClone(content);
  const role = withAsset.roles[0].id;
  withAsset.roles[0].id = 'asset';
  for (const panel of withAsset.panels) {
    panel.on_screen = panel.on_screen.map((name) => (name === role ? 'asset' : name));
    for (const line of panel.lines) if (line.speaker === role) line.speaker = 'asset';
  }
  let stored = content;
  const saved = (data, extra = {}) => ({ kind: 'script', id, lineage_id: id, base_id: null, schema_version: 1, data, batch_id: null, relationships,
    assets: {}, entities: {}, skills: {}, created_at: '2026-10-26T12:00:00Z', ...extra });
  globalThis.fetch = async (url, init) => {
    requests.push(init.method ?? 'GET');
    if (init.method === 'POST') return Response.json(saved(JSON.parse(init.body).data, { id: '01a175e0-3000-cccc-1111-abcdefabcdef', base_id: id }), { status: 201 });
    return Response.json(saved({ text: JSON.stringify({ format: 'nuva.script', version: 3, content: stored }) }));
  };
  const sdk = createNuva({ getAccessToken: async () => 'fixture', storeBaseUrl: 'https://backend.invalid' });
  try {
    await assert.rejects(sdk.scripts.update({ kind: 'script', id }, { content: withAsset }), (e) => e.code === 'INVALID_INPUT' && e.acceptance === 'not_accepted' && e.message.includes('asset are reserved'));
    assert.deepEqual(requests, ['GET']);
    stored = withAsset;
    await assert.rejects(sdk.scripts.update({ kind: 'script', id }, { content }), (e) => e.code === 'INVALID_INPUT' && e.message.includes('generate a new Script'));
    const read = await sdk.scripts.get({ kind: 'script', id });
    assert.equal(read.content.roles[0].id, 'asset');
    assert.ok(!requests.includes('POST'));
  } finally { sdk.close(); globalThis.fetch = original; }
});
