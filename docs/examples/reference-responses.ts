// The backend's answers to the API reference examples (reference.ts), in the order each example's requests are sent.
// reference_examples.mjs runs every example against them through the SDK, checks each answer against the public
// contract with backendSchema, and shows what the SDK returns. They are typed with the contract's types, so the docs
// typecheck catches a field the contract no longer has.
import { encodeScript, encodeStoryboard, type BackendSchemas as B, type ScriptContent, type StoryboardContent } from '@nuva/sdk/schemas';

export const ids = {
	brand: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b01',
	product: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b02',
	character: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b03',
	productImage: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b04',
	characterImage: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b05',
	voice: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b06',
	script: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b07',
	scriptRevised: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b08',
	scriptEdited: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b09',
	storyboard: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0a',
	storyboardRevised: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0b',
	storyboardEdited: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0c',
	prompt: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0d',
	promptEdited: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b0f',
	job: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b10',
	clip: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b11',
	clip2: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b12',
	finalVideo: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b13',
	ad: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b15',
	batch: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b16',
	skill: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b17',
	skillVersion: '01a1c7e2-5b3d-7f10-9c4e-2d8b6a0f1b18',
} as const;

const at = (time: string) => `2026-11-07T${time}Z`;
const media = (id: string, extension: string) => `https://media.example.com/assets/${id}.${extension}?sig=3f9a1c`;

const productImage: B['AssetOut'] = {
	id: ids.productImage,
	kind: 'image',
	mime: 'image/jpeg',
	source: 'uploaded',
	size_bytes: 284113,
	metadata: { width: 1080, height: 1440 },
	label: '杯身正面',
	description: '450ml 白色款，正面，白底',
	created_at: at('02:14:09'),
	download_url: media(ids.productImage, 'jpg'),
	download_url_expires_at: at('03:14:09'),
};
const characterImage: B['AssetOut'] = {
	...productImage,
	id: ids.characterImage,
	size_bytes: 198540,
	label: '林夏正面',
	description: '半身照，浅灰毛衣',
	download_url: media(ids.characterImage, 'jpg'),
};
const voice: B['AssetOut'] = {
	...productImage,
	id: ids.voice,
	kind: 'audio',
	mime: 'audio/mpeg',
	size_bytes: 152320,
	metadata: { duration_ms: 9400 },
	label: '林夏的声音',
	description: null,
	download_url: media(ids.voice, 'mp3'),
};
const clip = (id: string, duration_ms: number): B['AssetOut'] => ({
	...productImage,
	id,
	kind: 'video',
	mime: 'video/mp4',
	source: 'generated',
	size_bytes: 6215402,
	metadata: { duration_ms, width: 720, height: 1280 },
	label: null,
	description: null,
	created_at: at('03:02:41'),
	download_url: media(id, 'mp4'),
	download_url_expires_at: at('04:02:41'),
});

const brand: B['Brand'] = { id: ids.brand, version: 1, schema_version: 1, data: { name: '暖山' }, created_at: at('02:10:00'), assets: {} };
const product: B['Product'] = {
	id: ids.product,
	version: 1,
	schema_version: 2,
	brand_id: ids.brand,
	data: {
		name: '暖山随行保温杯 450ml',
		attributes: { capacity_ml: 450, colors: ['白', '雾蓝'] },
		image_asset_ids: [ids.productImage],
		video_asset_ids: [],
		selling_points: ['12 小时保温', '单手开盖', '放得进车载杯架'],
		target_audience: '通勤的上班族',
		facts: [],
		constraints: ['不说“最好”“第一”'],
	},
	created_at: at('02:16:30'),
	assets: { [ids.productImage]: productImage },
};
const productV2: B['Product'] = {
	...product,
	version: 2,
	data: { ...product.data, selling_points: ['12 小时保温', '单手开盖', '放得进车载杯架', '杯盖可拆洗'] },
	created_at: at('02:20:12'),
};
const character: B['Character'] = {
	id: ids.character,
	version: 1,
	schema_version: 1,
	data: { name: '林夏', description: '28 岁，坐地铁通勤的设计师', image_asset_ids: [ids.characterImage], voice_asset_id: ids.voice },
	created_at: at('02:18:44'),
	assets: { [ids.characterImage]: characterImage, [ids.voice]: voice },
};

const scriptContent: ScriptContent = {
	schema_version: 3,
	concept: {
		name: '到公司还是烫的',
		category: 'apparel-home',
		purchase_task: '通勤用保温杯',
		proposition: '早上装的咖啡，到公司还是烫的。',
		route: '通勤 vlog，从出门到工位',
		route_reason: '保温要靠时间证明，跟拍一段通勤最直接。',
		speaker_relation: '上班族对同样通勤的观众说话，语气轻松',
	},
	duration_ms: 15000,
	beats: [
		{ id: 'B01', purpose: '出门前装满一杯热咖啡', fact_ids: ['fact_product_name'] },
		{ id: 'B02', purpose: '到工位打开还冒热气，记住 12 小时保温', fact_ids: ['fact_product_selling_points'] },
	],
	roles: [{ id: 'commuter', name: '通勤者', description: '二十多岁的上班族，独自坐地铁通勤', speaks: true }],
	panels: [
		{
			id: 'P01',
			beat_id: 'B01',
			on_screen: ['commuter', 'product'],
			action: '她在门口把热咖啡倒进杯子，拧紧杯盖，边说边出门。',
			fact_ids: ['fact_product_name'],
			lines: [{ id: 'L01', speaker: 'commuter', mode: 'on_camera', text: '七点出门，先灌满一杯。' }],
			notes: '',
		},
		{
			id: 'P02',
			beat_id: 'B02',
			on_screen: ['commuter', 'product'],
			action: '到工位后她单手打开杯盖，热气冒出来，她对镜头举杯。',
			fact_ids: ['fact_product_selling_points'],
			lines: [{ id: 'L02', speaker: 'commuter', mode: 'on_camera', text: '到公司还是烫的，12 小时保温。' }],
			notes: '屏幕文字：12 小时保温',
		},
	],
	facts: [
		{ id: 'fact_product_name', claim: '暖山随行保温杯 450ml', source_field: 'data.name', source_excerpt: '暖山随行保温杯 450ml' },
		{ id: 'fact_product_selling_points', claim: '12 小时保温', source_field: 'data.selling_points', source_excerpt: '12 小时保温' },
	],
	images: [{ asset_id: ids.productImage, role: 'product_appearance', mime_type: 'image/jpeg', url: media(ids.productImage, 'jpg') }],
	instruction: '口语化，突出 12 小时保温。',
};
const skill: B['MadeWithSkill'] = { id: ids.skill, name: 'ad-script-writing', version: 3 };
const script: B['Script'] = {
	kind: 'script',
	id: ids.script,
	lineage_id: ids.script,
	base_id: null,
	schema_version: 1,
	data: { text: encodeScript(scriptContent) },
	batch_id: ids.batch,
	created_at: at('02:25:03'),
	product: { id: ids.product, version: 2 },
	skill,
	assets: { [ids.productImage]: productImage },
};
const revisedContent: ScriptContent = {
	...scriptContent,
	panels: [
		{ ...scriptContent.panels[0]!, lines: [{ id: 'L01', speaker: 'commuter', mode: 'on_camera', text: '12 小时保温，我七点就灌满了。' }] },
		scriptContent.panels[1]!,
	],
	instruction: '开场第一句就说保温时长。',
};
const scriptRevised: B['Script'] = { ...script, id: ids.scriptRevised, base_id: ids.script, data: { text: encodeScript(revisedContent) }, created_at: at('02:31:47') };
const editedContent: ScriptContent = {
	...scriptContent,
	panels: [{ ...scriptContent.panels[0]!, notes: '屏幕文字：7:00 出门' }, scriptContent.panels[1]!],
};
const scriptEdited: B['Script'] = { ...script, id: ids.scriptEdited, base_id: ids.script, data: { text: encodeScript(editedContent) }, created_at: at('02:33:10') };

const storyboardContent: StoryboardContent = {
	script: ids.script,
	cast: { commuter: { character: ids.character, voice: 'character' } },
	direction: '手机自拍感，清晨自然光，保留环境声，不加音乐。',
	clips: [
		{ id: 'C01', duration_ms: 8000, shots: ['中景：{{commuter}} 在门口把咖啡倒进 {{product}}，拧紧杯盖，说 {{L01}}'] },
		{ id: 'C02', duration_ms: 7000, shots: ['近景：{{commuter}} 在工位单手打开 {{product}}，热气冒出，她举杯说 {{L02}}'] },
	],
};
const storyboard: B['Storyboard'] = {
	kind: 'storyboard',
	id: ids.storyboard,
	lineage_id: ids.storyboard,
	base_id: null,
	schema_version: 1,
	data: { text: encodeStoryboard(storyboardContent) },
	batch_id: ids.batch,
	created_at: at('02:40:22'),
	script: { id: ids.script },
	product: { id: ids.product, version: 2 },
	characters: [{ id: ids.character, version: 1 }],
	skill,
	assets: { [ids.productImage]: productImage, [ids.characterImage]: characterImage, [ids.voice]: voice },
};
const storyboardRevised: B['Storyboard'] = {
	...storyboard,
	id: ids.storyboardRevised,
	base_id: ids.storyboard,
	data: { text: encodeStoryboard({ ...storyboardContent, direction: '固定机位，暖色调，保留环境声，不加音乐。' }) },
	created_at: at('02:46:05'),
};
const storyboardEdited: B['Storyboard'] = {
	...storyboard,
	id: ids.storyboardEdited,
	base_id: ids.storyboard,
	data: { text: encodeStoryboard({ ...storyboardContent, direction: '手机自拍感，清晨自然光，保留环境声，结尾加轻快钢琴。' }) },
	created_at: at('02:48:31'),
};

const prompt: B['Prompt'] = {
	kind: 'prompt',
	id: ids.prompt,
	lineage_id: ids.prompt,
	base_id: null,
	schema_version: 1,
	data: {
		prompt: '<Subject 1> 是 <Picture 1> 中的女性，声音参考 <Audio 1>。[镜头 1] 0–8 秒，中景：<Subject 1> 在门口把咖啡倒进 <Picture 2> 中的保温杯，拧紧杯盖，对镜头说：“七点出门，先灌满一杯。”',
		image_asset_ids: [ids.characterImage, ids.productImage],
		video_asset_ids: [],
		audio_asset_ids: [ids.voice],
		seconds: 8,
		ratio: '9:16',
		clip_id: 'C01',
	},
	batch_id: ids.batch,
	created_at: at('02:52:18'),
	storyboard: { id: ids.storyboard },
	skill: null,
	assets: { [ids.characterImage]: characterImage, [ids.productImage]: productImage, [ids.voice]: voice },
};
const promptEdited: B['Prompt'] = { ...prompt, id: ids.promptEdited, base_id: ids.prompt, data: { ...prompt.data, seconds: 6 }, created_at: at('02:58:40') };

const job: B['JobOut'] = {
	id: ids.job,
	status: 'queued',
	prompt: ids.prompt,
	seed: 2804117,
	resolution: null,
	batch_id: ids.batch,
	asset: null,
	error: null,
	error_code: null,
	callback: null,
	created_at: at('03:00:02'),
};
const running: B['JobOut'] = { ...job, status: 'running' };
const completed: B['JobOut'] = { ...job, status: 'completed', asset: clip(ids.clip, 8000) };

const ad: B['AdOut'] = {
	id: ids.ad,
	batch_id: ids.batch,
	schema_version: 1,
	composition: { clips: [{ asset_id: ids.clip }, { asset_id: ids.clip2, start_ms: 0, end_ms: 6500 }], audio_asset_ids: [] },
	asset: { ...clip(ids.finalVideo, 14500), source: 'uploaded', label: '成片 v1', created_at: at('03:20:15') },
	assets: { [ids.clip]: clip(ids.clip, 8000), [ids.clip2]: clip(ids.clip2, 7000) },
	created_at: at('03:20:16'),
};
const batch: B['BatchOut'] = {
	id: ids.batch,
	intent: '保温杯通勤 vlog，15 秒',
	created_at: at('02:24:50'),
	ads: [{ id: ids.ad, asset_id: ids.finalVideo, created_at: at('03:20:16') }],
	jobs: { completed: 2 },
};
const skillRead: B['SkillRead'] = {
	id: ids.skill,
	name: 'ad-script-writing',
	platform: false,
	main_version: 3,
	created_at: at('00:30:00'),
	version: 3,
	description: '短视频广告脚本的写法',
	note: '开场三秒内给出卖点',
	attributes: {},
	files: [
		{
			path: 'SKILL.md',
			bytes: 6182,
			sha256: '9b2f4c1e7a0d3b5c8e6f1a2d4c7b9e0f3a5d8c1b4e7f0a2c5d8b1e4f7a0c3d6e',
			download_url: `https://media.example.com/skills/${ids.skillVersion}/SKILL.md?sig=3f9a1c`,
		},
	],
	download_url_expires_at: at('04:05:00'),
};
const share: B['ShareOut'] = { kind: 'product', id: ids.product, scope: 'customer', access: 'read', created_at: at('03:30:00') };

/** Each example's answers, in request order. A DELETE answers 204 and the upload to `upload_url` 200, without a body. */
export const responses: Record<string, readonly unknown[]> = {
	'assets.upload': [
		{ upload_url: 'https://upload.example.com/u/7f3c?sig=3f9a1c', upload_token: 'upl_7f3c2a91', expires_at: at('02:29:09'), max_bytes: 20971520 } satisfies B['UploadOut'],
		productImage,
	],
	'assets.get': [productImage],
	'assets.update': [{ ...productImage, label: '杯身正面（新款）', description: null } satisfies B['AssetOut']],
	'brands.create': [brand],
	'brands.get': [brand],
	'brands.list': [{ items: [brand], next_cursor: null } satisfies B['BrandPage']],
	'brands.update': [{ ...brand, version: 2, data: { name: '暖山 Warmhill' }, created_at: at('02:12:30') } satisfies B['Brand']],
	'products.create': [product],
	'products.get': [product],
	'products.list': [{ items: [productV2], next_cursor: 'eyJpZCI6IjAxYTFjN2UyIn0' } satisfies B['ProductPage']],
	'products.update': [productV2],
	'products.delete': [],
	'characters.create': [character],
	'characters.get': [character],
	'characters.list': [{ items: [character], next_cursor: null } satisfies B['CharacterPage']],
	'characters.update': [{ ...character, version: 2, data: { ...character.data, description: '28 岁，骑车通勤的设计师' }, created_at: at('02:22:05') } satisfies B['Character']],
	'scripts.generate': [script],
	'scripts.get': [script],
	'scripts.generateFrom': [script, scriptRevised],
	'scripts.createFrom': [script, scriptEdited],
	'storyboards.generate': [storyboard],
	'storyboards.get': [storyboard],
	'storyboards.generateFrom': [storyboardRevised],
	'storyboards.createFrom': [storyboard, storyboardEdited],
	'prompts.generate': [{ prompts: [prompt] }],
	'prompts.get': [prompt],
	'prompts.createFrom': [prompt, promptEdited],
	'videos.generate': [job],
	'jobs.get': [running],
	'jobs.subscribe': [running, completed],
	'jobs.cancel': [{ ...running, status: 'cancelled' } satisfies B['JobOut']],
	'ads.get': [ad],
	'ads.list': [{ items: [ad], next_cursor: null } satisfies B['AdPage']],
	'batches.get': [batch],
	'batches.list': [{ items: [batch], next_cursor: null } satisfies B['BatchPage']],
	'skills.get': [skillRead],
	'skills.list': [{ items: [skillRead], next_cursor: null } satisfies B['SkillPage']],
	'shares.set': [share],
	'shares.list': [{ items: [share] } satisfies B['SharesOut']],
	'shares.remove': [],
};
