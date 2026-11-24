// A value the backend adds to a response doesn't fail a read: an enum value or a field added after this SDK is
// accepted and kept. What the SDK sends is still checked as it is: an unknown value or field is refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';
import { backendSchema, responseSchema } from '../dist/internal.js';

const id = (n) => `01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b${String(n).padStart(2, '0')}`;
const added = { added_later: { any: 'json' } };
const asset = {
	id: id(4),
	kind: 'image',
	mime: 'image/jpeg',
	source: 'uploaded',
	size_bytes: 284113,
	metadata: { width: 1080, height: 1440 },
	label: null,
	description: null,
	created_at: '2026-11-07T02:14:09Z',
	download_url: 'https://media.example.com/a.jpg',
	download_url_expires_at: '2026-11-07T03:14:09Z',
};
const job = {
	id: id(10),
	status: 'running',
	prompt: id(13),
	seed: 1,
	resolution: '768P',
	batch_id: null,
	asset: null,
	error: null,
	error_code: null,
	callback: null,
	created_at: '2026-11-07T03:00:02Z',
};
const promptData = { prompt: 'A mug on a desk.', image_asset_ids: [], video_asset_ids: [], audio_asset_ids: [], seconds: 8, ratio: '9:16', clip_id: 'C01' };
const prompt = { kind: 'prompt', id: id(13), lineage_id: id(13), base_id: null, schema_version: 1, data: promptData, batch_id: null, created_at: '2026-11-07T02:52:18Z', storyboard: { id: id(14) }, skill: null, assets: {} };

// Each object that refuses other fields, with what it has to have.
const strict = {
	BrandDataV1: { name: 'Warmhill' },
	CharacterDataV1: { name: 'Lin', image_asset_ids: [id(5)] },
	ProductDataV2: { name: 'Mug' },
	PromptReadV1: promptData,
	ScriptDataV1: { text: 'An ad script' },
	StoryboardDataV1: { text: 'A storyboard' },
	DirectingPlanDataV1: { text: 'A plan' },
	CompositionReadV1: { clips: [{ asset_id: id(11) }] },
	Clip: { asset_id: id(11) },
};
// Each enum in a response, at a place it is read: [schema, value, the same value with an added enum value].
const enums = {
	'AssetOut.kind': ['AssetOut', asset, { ...asset, kind: 'spreadsheet' }],
	AssetSource: ['AssetOut', asset, { ...asset, source: 'imported' }],
	JobStatus: ['JobOut', job, { ...job, status: 'retrying' }],
	CallbackStatus: ['JobOut', { ...job, callback: { url: 'https://example.com/hook', status: 'sent' } }, { ...job, callback: { url: 'https://example.com/hook', status: 'bounced' } }],
	'PromptReadV1.ratio': ['PromptReadV1', promptData, { ...promptData, ratio: '2:3' }],
	ShareAccess: ['ShareOut', { kind: 'product', id: id(1), scope: 'customer', access: 'read', created_at: '2026-11-07T00:00:00Z' }, { kind: 'product', id: id(1), scope: 'customer', access: 'comment', created_at: '2026-11-07T00:00:00Z' }],
	'AutoShareOut access': ['AutoShareOut', { scope: 'customer', brand: 'read' }, { scope: 'customer', brand: 'comment' }],
};

test('a response object reads with a field added after this SDK, and keeps it; the strict schema refuses it', () => {
	for (const [name, value] of Object.entries(strict)) {
		assert.equal(backendSchema(name).safeParse(value).success, true, `${name} sample`);
		assert.equal(backendSchema(name).safeParse({ ...value, ...added }).success, false, `${name} is strict`);
		assert.deepEqual(responseSchema(name).parse({ ...value, ...added }), { ...backendSchema(name).parse(value), ...added }, name);
	}
});

test('a response reads with an enum value added after this SDK, and keeps it; the strict schema refuses it', () => {
	for (const [label, [name, known, unknown]] of Object.entries(enums)) {
		assert.equal(backendSchema(name).safeParse(known).success, true, `${label} sample`);
		assert.equal(backendSchema(name).safeParse(unknown).success, false, `${label} is closed`);
		assert.deepEqual(responseSchema(name).parse(unknown), unknown, label);
	}
	// Nested: an Asset of a new kind inside a completed Job, with a field added to the Job.
	const nested = { ...job, status: 'completed', asset: { ...asset, kind: 'spreadsheet', ...added }, ...added };
	assert.deepEqual(responseSchema('JobOut').parse(nested), nested);
	// Other rules still apply to a response: a missing field or a wrong type fails.
	const { kind: _kind, ...kindless } = asset;
	assert.equal(responseSchema('AssetOut').safeParse(kindless).success, false);
	assert.equal(responseSchema('AssetOut').safeParse({ ...asset, kind: 7 }).success, false);
	assert.equal(responseSchema('Prompt').safeParse(prompt).success, true);
	assert.equal(responseSchema('Prompt').safeParse({ ...prompt, kind: 'novel' }).success, false, 'an Artifact kind stays a constant');
});

test('what the SDK sends is checked as it is: an unknown enum value or field is refused', () => {
	const refused = {
		AssetCreate: [{ url: 'https://example.com/a.xyz', kind: 'spreadsheet' }, { url: 'https://example.com/a.jpg', ...added }],
		UploadRequest: [{ kind: 'spreadsheet' }, { kind: 'image', ...added }],
		AssetEdit: [{ label: 'Front', ...added }],
		BrandCreate: [{ data: { name: 'Warmhill', ...added } }],
		CharacterCreate: [{ data: { name: 'Lin', image_asset_ids: [id(5)], ...added } }],
		ProductCreate: [{ brand_id: id(1), data: { name: 'Mug', ...added } }],
		ProductEdit: [{ version: 1, data: { name: 'Mug', ...added } }],
		PromptVersionCreate: [{ data: { ...promptData, clip_id: undefined, ratio: '2:3' } }, { data: { prompt: 'A mug.', ...added } }],
		GenerateVideo: [{ prompt: id(13), resolution: '1080P' }, { prompt: id(13), ...added }],
	};
	for (const [name, values] of Object.entries(refused))
		for (const value of values) assert.equal(backendSchema(name).safeParse(value).success, false, `${name} ${JSON.stringify(value)}`);
	assert.equal(backendSchema('UploadRequest').safeParse({ kind: 'document' }).success, true);
});

/** A client whose requests `answer(method, url)` answers; it records each request. */
async function withFetch(answer, run) {
	const original = globalThis.fetch;
	const requests = [];
	globalThis.fetch = async (url, options = {}) => {
		const method = options.method ?? 'GET';
		requests.push({ method, url: String(url), body: options.body });
		const body = answer(method, new URL(String(url)).pathname, requests.length);
		return body === undefined ? new Response(null, { status: 204 }) : Response.json(body);
	};
	const nuva = createNuva({ baseUrl: 'http://127.0.0.1:1/api', storeBaseUrl: 'https://store.invalid', getAccessToken: async () => 'fixture', jobPollIntervalMs: 10 });
	try {
		await run(nuva, requests);
	} finally {
		nuva.close();
		globalThis.fetch = original;
	}
}

test('the client reads an Asset of a kind added after this SDK, a share with a new access, and new fields', async () => {
	const document = { ...asset, kind: 'spreadsheet', source: 'imported', ...added };
	const share = { kind: 'asset', id: id(4), scope: 'customer', access: 'comment', created_at: '2026-11-07T00:00:00Z', ...added };
	await withFetch(
		(method, path) => (path.startsWith('/v1/auto-shares/') ? { scope: 'customer', brand: 'comment', ...added } : path.startsWith('/v1/shares/') ? { items: [share], ...added } : document),
		async (nuva) => {
			const read = await nuva.assets.get(id(4));
			assert.equal(read.kind, 'spreadsheet');
			assert.deepEqual(read.added_later, added.added_later);
			assert.deepEqual(await nuva.shares.list({ kind: 'asset', id: id(4) }), [share]);
			assert.equal((await nuva.shares.getAutoShare('customer')).brand, 'comment');
		},
	);
});

test('prompts.generate reads an answer with a field added beside its Prompts', async () => {
	await withFetch(
		() => ({ prompts: [{ ...prompt, data: { ...promptData, ratio: '2:3', ...added }, ...added }], ...added }),
		async (nuva) => {
			const { prompts } = await nuva.prompts.generate({ storyboard: { id: id(14) }, clip: 'C01' });
			assert.equal(prompts[0].data.ratio, '2:3');
			assert.deepEqual(prompts[0].data.added_later, added.added_later);
		},
	);
});

test('createFrom keeps a ratio added after this SDK that it copies from the base Prompt; a ratio you give is checked', async () => {
	const unknownRatio = { ...prompt, data: { ...promptData, ratio: '2:3' } };
	const edited = { ...unknownRatio, id: id(20), lineage_id: id(13), base_id: id(13), data: { ...unknownRatio.data, seconds: 6 } };
	await withFetch(
		(method) => (method === 'GET' ? unknownRatio : edited),
		async (nuva, requests) => {
			const read = await nuva.prompts.get({ id: id(13) });
			assert.equal(read.data.ratio, '2:3');
			assert.equal((await nuva.prompts.createFrom(read, { seconds: 6 })).data.ratio, '2:3');
			assert.equal(JSON.parse(requests[1].body).data.ratio, '2:3', 'the base ratio is sent as it was read');
			for (const changes of [{ ratio: '5:4' }, { seconds: 99 }, { prompt: '' }])
				await assert.rejects(nuva.prompts.createFrom(read, changes), (error) => error.code === 'INVALID_INPUT', JSON.stringify(changes));
			// A base you hold is still checked for what isn't an added enum value: a wrong type or length is refused.
			for (const data of [{ prompt: 42 }, { image_asset_ids: 'none' }, { seconds: -5 }, { prompt: 'x'.repeat(10001) }])
				await assert.rejects(nuva.prompts.createFrom({ ...read, data: { ...read.data, ...data } }, { audio_asset_ids: [] }), (error) => error.code === 'INVALID_INPUT', JSON.stringify(data).slice(0, 40));
			assert.equal(requests.length, 2, 'a change this SDK refuses is not sent');
		},
	);
});

test('an upload of an unknown kind is refused before anything is sent', async () => {
	await withFetch(
		() => assert.fail('nothing is sent'),
		async (nuva, requests) => {
			await assert.rejects(nuva.assets.upload(new File(['x'], 'a.bin'), { kind: 'spreadsheet' }), (error) => error.code === 'INVALID_INPUT');
			await assert.rejects(nuva.assets.upload({ url: 'https://example.com/a.bin' }, { kind: 'spreadsheet' }), (error) => error.code === 'INVALID_INPUT');
			assert.equal(requests.length, 0);
		},
	);
});

test('a Job status added after this SDK means the Job has not ended: subscribe keeps watching', async () => {
	const states = ['queued', 'retrying', 'awaiting_review', 'completed'];
	await withFetch(
		(method, path, n) => ({ ...job, status: states[Math.min(n, states.length) - 1], asset: n >= states.length ? asset : null }),
		async (nuva, requests) => {
			const seen = [];
			await new Promise((resolve, reject) => {
				nuva.jobs.subscribe(
					job.id,
					(state) => {
						seen.push(state.status);
						if (state.status === 'completed') setTimeout(resolve, 50);
					},
					reject,
				);
			});
			assert.deepEqual(seen, states);
			assert.equal(requests.length, states.length, 'it stops at completed');
		},
	);
});

test('a Job status added after this SDK: result keeps waiting until the Job ends', async () => {
	const answers = [job, { ...job, status: 'retrying' }, { ...job, status: 'retrying', ...added }, { ...job, status: 'completed', asset: { ...asset, kind: 'video' } }];
	await withFetch(
		(method, path, n) => answers[Math.min(n, answers.length) - 1],
		async (nuva, requests) => {
			const created = await nuva.videos.generate({ prompt: { id: id(13) } });
			const video = await created.result({ timeoutMs: 5000 });
			assert.equal(video.kind, 'video');
			assert.equal(requests.length, answers.length);
		},
	);
	// A Job that stays in a status this SDK doesn't know is still waited for, up to the timeout.
	await withFetch(
		(method, path, n) => (n === 1 ? job : { ...job, status: 'retrying' }),
		async (nuva) => {
			const created = await nuva.videos.generate({ prompt: { id: id(13) } });
			await assert.rejects(created.result({ timeoutMs: 100 }), (error) => error.code === 'CONNECTION_ERROR' && error.retryable === true);
		},
	);
});
