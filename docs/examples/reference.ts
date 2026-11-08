// One example per method of the API reference. The page shows each `#region`; reference_examples.mjs runs every
// example against the backend answers in reference-responses.ts and shows the value it returns.
import { createNuva, AdsError, type JobState, type NuvaClient } from '@nuva/sdk';

/** A file from your upload control. */
declare const file: File;
/** Your UI's progress display. */
declare function showProgress(state: JobState): void;
/** Your backend route that returns the user's token. */
declare function fetchTokenFromYourBackend(): Promise<{ token: string; expiresAt: string }>;

export function createClient(): NuvaClient {
	// #region create-client
	const client = createNuva({
		environment: 'production',
		getAccessToken: fetchTokenFromYourBackend,
	});
	// #endregion create-client
	return client;
}

export async function idempotentWrite(client: NuvaClient) {
	// #region idempotency
	// One key per write; the same key again returns the first call's Script instead of writing another.
	const idempotencyKey = crypto.randomUUID();
	const input = { product: { id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b02' }, acceptable_duration_ms: { min: 10000, max: 15000 } };
	const script = await client.scripts.generate(input, { idempotencyKey }).catch((error: unknown) => {
		if (error instanceof AdsError && error.retryable) return client.scripts.generate(input, { idempotencyKey });
		throw error;
	});
	// #endregion idempotency
	return script;
}

export async function openSession(client: NuvaClient) {
	// #region sessions
	const session = await client.sessions.create({ title: '保温杯通勤 vlog' });
	const agent = client.agent({ sessionId: session.id });
	const stop = agent.subscribe((state) => console.log(state));
	// #endregion sessions
	return stop;
}

export const examples: Record<string, (client: NuvaClient) => Promise<unknown>> = {
	'assets.upload': async (client) => {
		// #region assets.upload
		const asset = await client.assets.upload(file, {
			label: '杯身正面',
			description: '450ml 白色款，正面，白底',
		});
		// #endregion assets.upload
		return asset;
	},
	'assets.get': async (client) => {
		// #region assets.get
		const asset = await client.assets.get('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b04');
		// #endregion assets.get
		return asset;
	},
	'assets.update': async (client) => {
		// #region assets.update
		const asset = await client.assets.update('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b04', {
			label: '杯身正面（新款）',
			description: null,
		});
		// #endregion assets.update
		return asset;
	},
	'brands.create': async (client) => {
		// #region brands.create
		const brand = await client.brands.create({ data: { name: '暖山' } });
		// #endregion brands.create
		return brand;
	},
	'brands.get': async (client) => {
		// #region brands.get
		const brand = await client.brands.get('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b01');
		// #endregion brands.get
		return brand;
	},
	'brands.list': async (client) => {
		// #region brands.list
		const page = await client.brands.list({ limit: 20 });
		// #endregion brands.list
		return page;
	},
	'brands.update': async (client) => {
		// #region brands.update
		const brand = await client.brands.update(
			{ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b01', version: 1 },
			{ data: { name: '暖山 Warmhill', description: '做通勤和户外用的保温杯', attributes: { founded: 2019, tone: '克制、实在' } } },
		);
		// #endregion brands.update
		return brand;
	},
	'products.create': async (client) => {
		// #region products.create
		const product = await client.products.create({
			brand_id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b01',
			data: {
				name: '暖山随行保温杯 450ml',
				image_asset_ids: ['01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b04'],
				selling_points: ['12 小时保温', '单手开盖', '放得进车载杯架'],
				target_audience: '通勤的上班族',
				constraints: ['不说“最好”“第一”'],
			},
		});
		// #endregion products.create
		return product;
	},
	'products.get': async (client) => {
		// #region products.get
		const product = await client.products.get('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b02', { version: 1 });
		// #endregion products.get
		return product;
	},
	'products.list': async (client) => {
		// #region products.list
		const page = await client.products.list({ brand_id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b01', limit: 20 });
		// #endregion products.list
		return page;
	},
	'products.update': async (client) => {
		// #region products.update
		const product = await client.products.update(
			{ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b02', version: 1 },
			{ data: { selling_points: ['12 小时保温', '单手开盖', '放得进车载杯架', '杯盖可拆洗'] } },
		);
		// #endregion products.update
		return product;
	},
	'products.delete': async (client) => {
		// #region products.delete
		await client.products.delete('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b02');
		// #endregion products.delete
	},
	'characters.create': async (client) => {
		// #region characters.create
		const character = await client.characters.create({
			data: {
				name: '林夏',
				description: '28 岁，坐地铁通勤的设计师',
				image_asset_ids: ['01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b05'],
				voice_asset_id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b06',
			},
		});
		// #endregion characters.create
		return character;
	},
	'characters.get': async (client) => {
		// #region characters.get
		const character = await client.characters.get('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b03');
		// #endregion characters.get
		return character;
	},
	'characters.list': async (client) => {
		// #region characters.list
		const page = await client.characters.list({ limit: 20 });
		// #endregion characters.list
		return page;
	},
	'characters.update': async (client) => {
		// #region characters.update
		const character = await client.characters.update(
			{ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b03', version: 1 },
			{ data: { description: '28 岁，骑车通勤的设计师' } },
		);
		// #endregion characters.update
		return character;
	},
	'scripts.generate': async (client) => {
		// #region scripts.generate
		const script = await client.scripts.generate({
			product: { id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b02' },
			acceptable_duration_ms: { min: 10000, max: 15000 },
			instruction: '口语化，突出 12 小时保温。',
			batch_id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b16',
		});
		// #endregion scripts.generate
		return script;
	},
	'scripts.get': async (client) => {
		// #region scripts.get
		const script = await client.scripts.get({ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b07' });
		// #endregion scripts.get
		return script;
	},
	'scripts.generateFrom': async (client) => {
		// #region scripts.generateFrom
		const script = await client.scripts.generateFrom(
			{ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b07' },
			{ instruction: '开场第一句就说保温时长。' },
		);
		// #endregion scripts.generateFrom
		return script;
	},
	'scripts.createFrom': async (client) => {
		// #region scripts.createFrom
		const base = await client.scripts.get({ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b07' });
		if (base.format !== 3) throw new Error('Saved before Storyboards: read-only.');
		const script = await client.scripts.createFrom(base, {
			panels: base.content.panels.map((panel) => (panel.id === 'P01' ? { ...panel, notes: '屏幕文字：7:00 出门' } : panel)),
		});
		// #endregion scripts.createFrom
		return script;
	},
	'storyboards.generate': async (client) => {
		// #region storyboards.generate
		const storyboard = await client.storyboards.generate({
			script: { id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b07' },
			cast: { commuter: { id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b03' } },
			instruction: '手机自拍感，清晨自然光，不加音乐。',
		});
		// #endregion storyboards.generate
		return storyboard;
	},
	'storyboards.get': async (client) => {
		// #region storyboards.get
		const storyboard = await client.storyboards.get({ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0a' });
		// #endregion storyboards.get
		return storyboard;
	},
	'storyboards.generateFrom': async (client) => {
		// #region storyboards.generateFrom
		const storyboard = await client.storyboards.generateFrom(
			{ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0a' },
			{ instruction: '改成固定机位，暖色调。' },
		);
		// #endregion storyboards.generateFrom
		return storyboard;
	},
	'storyboards.createFrom': async (client) => {
		// #region storyboards.createFrom
		const base = await client.storyboards.get({ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0a' });
		const storyboard = await client.storyboards.createFrom(base, {
			direction: '手机自拍感，清晨自然光，保留环境声，结尾加轻快钢琴。',
		});
		// #endregion storyboards.createFrom
		return storyboard;
	},
	'prompts.generate': async (client) => {
		// #region prompts.generate
		// Every clip, in clip order; pass clip: 'C01' for one.
		const { prompts } = await client.prompts.generate({
			storyboard: { id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0a' },
			ratio: '9:16',
		});
		// #endregion prompts.generate
		return { prompts };
	},
	'prompts.get': async (client) => {
		// #region prompts.get
		const prompt = await client.prompts.get({ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0d' });
		// #endregion prompts.get
		return prompt;
	},
	'prompts.createFrom': async (client) => {
		// #region prompts.createFrom
		const prompt = await client.prompts.createFrom({ id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0d' }, { seconds: 6 });
		// #endregion prompts.createFrom
		return prompt;
	},
	'videos.generate': async (client) => {
		// #region videos.generate
		const job = await client.videos.generate({ prompt: { id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0d' } });
		// #endregion videos.generate
		return job;
	},
	'jobs.get': async (client) => {
		// #region jobs.get
		const job = await client.jobs.get('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b10');
		// #endregion jobs.get
		return job;
	},
	'jobs.subscribe': async (client) => {
		// #region jobs.subscribe
		const unsubscribe = client.jobs.subscribe('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b10', (state) => showProgress(state));
		// #endregion jobs.subscribe
		return unsubscribe;
	},
	'jobs.cancel': async (client) => {
		// #region jobs.cancel
		const job = await client.jobs.cancel('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b10');
		// #endregion jobs.cancel
		return job;
	},
	'ads.get': async (client) => {
		// #region ads.get
		const ad = await client.ads.get('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b15');
		// #endregion ads.get
		return ad;
	},
	'ads.list': async (client) => {
		// #region ads.list
		const page = await client.ads.list({ batch_id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b16' });
		// #endregion ads.list
		return page;
	},
	'batches.get': async (client) => {
		// #region batches.get
		const batch = await client.batches.get('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b16');
		// #endregion batches.get
		return batch;
	},
	'batches.list': async (client) => {
		// #region batches.list
		const page = await client.batches.list({ limit: 20 });
		// #endregion batches.list
		return page;
	},
	'skills.get': async (client) => {
		// #region skills.get
		// The version a Script was written with; leave `version` out for the latest.
		const skill = await client.skills.get('01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b17', { version: 3 });
		// #endregion skills.get
		return skill;
	},
	'skills.list': async (client) => {
		// #region skills.list
		const page = await client.skills.list();
		// #endregion skills.list
		return page;
	},
	'shares.set': async (client) => {
		// #region shares.set
		const share = await client.shares.set({ kind: 'product', id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b02' }, 'customer', 'read');
		// #endregion shares.set
		return share;
	},
	'shares.list': async (client) => {
		// #region shares.list
		const shares = await client.shares.list({ kind: 'product', id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b02' });
		// #endregion shares.list
		return shares;
	},
	'shares.remove': async (client) => {
		// #region shares.remove
		await client.shares.remove({ kind: 'product', id: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b02' }, 'customer');
		// #endregion shares.remove
	},
};
