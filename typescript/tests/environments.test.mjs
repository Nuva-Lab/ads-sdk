import assert from 'node:assert/strict';
import test from 'node:test';
import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createNuva } from '../dist/index.js';
import { Transport } from '../dist/transport.js';

test('release routing overrides remain compatible with the environment helper', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'nuva-environments-'));
	const overrides = { agent: 'https://release-agent.invalid/api', store: 'https://release-api.invalid', generation: 'https://release-api.invalid' };
	try {
		await writeFile(join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
		await copyFile(new URL('../dist/environments.js', import.meta.url), join(directory, 'environments.js'));
		await writeFile(join(directory, 'service-origins.js'), `export const serviceOrigins = Object.freeze(${JSON.stringify(overrides)});`);
		const { originsForEnvironment } = await import(pathToFileURL(join(directory, 'environments.js')).href);
		assert.deepEqual(originsForEnvironment(undefined), overrides);
		assert.deepEqual(originsForEnvironment('sandbox'), overrides);
		assert.deepEqual(originsForEnvironment('production'), {
			agent: 'https://agent.nuvalab.ai/api', store: 'https://api.nuvalab.ai', generation: 'https://api.nuvalab.ai',
		});
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

for (const environment of [undefined, 'sandbox', 'production']) {
	test(`${environment ?? 'default'} pairs Agent, Store and direct writing routes`, async () => {
		const saved = globalThis.fetch;
		const requests = [];
		globalThis.fetch = async (url, options) => {
			requests.push([String(url), options.headers.Authorization]);
			return Response.json({ error: { code: 'NOT_FOUND', message: 'Local fixture', retryable: false } }, { status: 404 });
		};
		const transport = new Transport({ environment, getAccessToken: async () => 'dummy-environment-token' });
		const suffix = environment === 'production' ? '' : '-staging';
		try {
			await assert.rejects(transport.http('agent.get', {}));
			for (const method of ['sessions.list', 'products.list', 'scripts.generate', 'prompts.generate', 'videos.generate']) {
				await assert.rejects(transport.data(method, {}));
			}
			assert.deepEqual(requests, [
				`https://agent${suffix}.nuvalab.ai/api/rpc`,
				`https://agent${suffix}.nuvalab.ai/v1/sessions`,
				`https://api${suffix}.nuvalab.ai/v1/products`,
				`https://api${suffix}.nuvalab.ai/v1/generate/script`,
				`https://api${suffix}.nuvalab.ai/v1/generate/prompt`,
				`https://api${suffix}.nuvalab.ai/v1/generate/video`,
			].map(url => [url, 'Bearer dummy-environment-token']));
		} finally {
			transport.close();
			globalThis.fetch = saved;
		}
	});
}

test('unknown environments fail before obtaining credentials, even with endpoint overrides', () => {
	for (const environment of ['staging', '', 'Production', null, false]) {
		assert.throws(() => createNuva({
			environment,
			baseUrl: 'http://127.0.0.1:8980/api',
			getAccessToken: async () => { assert.fail('invalid environments must not obtain credentials'); },
		}), /environment must be "sandbox" or "production"/);
	}
});

test('explicit development endpoints override all production destinations', async () => {
	const saved = globalThis.fetch;
	const requests = [];
	globalThis.fetch = async (url) => {
		requests.push(String(url));
		return Response.json({ error: { code: 'NOT_FOUND', message: 'Local fixture', retryable: false } }, { status: 404 });
	};
	const transport = new Transport({
		environment: 'production',
		baseUrl: 'http://127.0.0.1:8980/api',
		storeBaseUrl: 'http://127.0.0.1:8981',
		generationBaseUrl: 'http://127.0.0.1:8982',
		getAccessToken: async () => 'dummy-token',
	});
	try {
		for (const method of ['sessions.list', 'products.list', 'scripts.generate', 'prompts.generate', 'videos.generate']) {
			await assert.rejects(transport.data(method, {}));
		}
		assert.deepEqual(requests, [
			'http://127.0.0.1:8980/v1/sessions',
			'http://127.0.0.1:8981/v1/products',
			'http://127.0.0.1:8982/v1/generate/script',
			'http://127.0.0.1:8982/v1/generate/prompt',
			'http://127.0.0.1:8981/v1/generate/video',
		]);
	} finally {
		transport.close();
		globalThis.fetch = saved;
	}
});
