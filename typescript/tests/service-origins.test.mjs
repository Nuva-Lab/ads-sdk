import assert from 'node:assert/strict';
import test from 'node:test';
import { createNuva } from '../dist/index.js';
import { serviceOrigins } from '../dist/service-origins.js';

test('the preview defaults route Agent, Store and writing to their staging services', async () => {
 const saved = globalThis.fetch, requests = [];
 globalThis.fetch = async (url) => { requests.push(String(url)); return Response.json({ error: { code: 'NOT_FOUND', message: 'Local routing fixture', retryable: false } }, {status: 404}); };
 const client = createNuva({ getAccessToken: async () => 'fixture' });
 const id = '11111111-1111-4111-8111-111111111111';
 try {
  await assert.rejects(client.sessions.list());
  await assert.rejects(client.products.list());
  await assert.rejects(client.scripts.generate({product:id,acceptable_duration_ms:{min:5000,max:10000}}));
  await assert.rejects(client.prompts.generate({script:id}));
  assert.deepEqual(requests, ['https://agent-staging.nuvalab.ai/v1/sessions','https://api-staging.nuvalab.ai/v1/products','https://api-staging.nuvalab.ai/v1/generate/script','https://api-staging.nuvalab.ai/v1/generate/prompt']);
  assert.equal(serviceOrigins.agent, 'https://agent-staging.nuvalab.ai/api');
 } finally { client.close(); globalThis.fetch = saved; }
});

test('explicit local overrides keep development requests on the configured services', async () => {
 const saved = globalThis.fetch, requests = [];
 globalThis.fetch = async (url) => {requests.push(String(url));return Response.json({items:[],next_cursor:null});};
 const client = createNuva({baseUrl:'http://127.0.0.1:8980/api',storeBaseUrl:'https://local-store.invalid',getAccessToken:async()=> 'fixture'});
 try {await client.products.list();await assert.rejects(client.scripts.generate({product:'11111111-1111-4111-8111-111111111111',acceptable_duration_ms:{min:5000,max:10000}}));assert.deepEqual(requests,['https://local-store.invalid/v1/products','https://local-store.invalid/v1/generate/script']);assert.equal('workflows' in client,false);}
 finally {client.close();globalThis.fetch=saved;}
});
