import test from 'node:test';
import assert from 'node:assert/strict';
import {
	scriptSchema,
	scriptAuthoringSchema,
	storyboardSchema,
	storyboardIssues,
	storyboardTokens,
	clipReferences,
	encodeScript,
	decodeScript,
	encodeStoryboard,
	decodeStoryboard,
	scriptVersion,
	encodeScriptPackage,
} from '../dist/schemas.js';

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const facts = [
	{ id: 'fact_product_name', claim: '特护抗皱套装', source_field: 'product.data.name', source_excerpt: '特护抗皱套装' },
	{ id: 'fact_product_selling_points', claim: '舒缓修护、抗皱紧致', source_field: 'product.data.selling_points', source_excerpt: '舒缓修护、抗皱紧致' },
];
const productImages = [uuid(1), uuid(2)];
const presenter = { id: uuid(100), images: [uuid(101), uuid(102)], voice: uuid(103) };

// The case behind the change: one presenter across three clips, who must look and sound the same in each.
function script() {
	const panel = (n, beat, line) => ({
		id: `P0${n}`,
		beat_id: beat,
		on_screen: ['presenter', 'product'],
		action: '讲解者拿起套装介绍。',
		fact_ids: ['fact_product_name'],
		lines: [{ id: `L0${n}`, speaker: 'presenter', mode: 'on_camera', text: line }],
		notes: '',
	});
	return {
		schema_version: 3,
		concept: { name: '兼顾抗皱与敏感', category: 'beauty', purchase_task: '选择护肤套装', proposition: '一套兼顾', route: '讲解', route_reason: '', speaker_relation: '品牌讲解者对观众' },
		duration_ms: 30000,
		beats: [
			{ id: 'B01', purpose: '提出取舍', fact_ids: ['fact_product_name'] },
			{ id: 'B02', purpose: '解释分工', fact_ids: ['fact_product_selling_points'] },
			{ id: 'B03', purpose: '收束推荐', fact_ids: ['fact_product_name'] },
		],
		roles: [{ id: 'presenter', name: '女性品牌讲解者', description: '约30岁的品牌讲解者，对观众说话', speaks: true }],
		panels: [panel(1, 'B01', '想抗皱又怕敏感？'), panel(2, 'B02', '水和霜负责舒缓，精华负责抗皱。'), panel(3, 'B03', '双11官旗入手。')],
		facts,
		images: productImages.map((asset_id) => ({ asset_id, role: 'product_appearance', mime_type: 'image/png', url: `https://images.example.test/${asset_id}.png` })),
	};
}
function storyboard() {
	return {
		script: uuid(900),
		cast: { presenter: { character: presenter.id, voice: 'character' } },
		direction: '浅灰墙面的护肤展示台，柔和顶光。',
		clips: [1, 2, 3].map((n) => ({
			id: `C0${n}`,
			duration_ms: 10000,
			shots: [`中景，固定。{{presenter}}双手拿着{{product}}面向镜头说{{L0${n}}}。`],
		})),
	};
}
const context = (value = script()) => ({ script: value, productImages, characters: { [presenter.id]: presenter } });

test('a v3 Script has no clips: panels hold lines with IDs, and its checks catch unknown speakers, silent roles and narrator modes', () => {
	assert.equal(scriptSchema.safeParse(script()).success, true);
	const broken = script();
	broken.panels[0].lines.push({ id: 'L09', speaker: 'son', mode: 'dialogue', text: '我也要' });
	broken.panels[1].lines.push({ id: 'L10', speaker: 'narrator', mode: 'on_camera', text: '旁白' });
	broken.roles.push({ id: 'shopper', name: '顾客', description: '路过的顾客', speaks: false });
	broken.panels[2].lines.push({ id: 'L01', speaker: 'shopper', mode: 'voiceover', text: '真好' });
	const messages = scriptSchema.safeParse(broken).error.issues.map((issue) => issue.message);
	for (const expected of ['Unknown role son.', 'A narrator line is voiceover.', 'Role shopper does not speak.', 'Line ID L01 is used twice.'])
		assert.ok(messages.includes(expected), expected);
	const { facts: _facts, images: _images, ...offscreen } = script();
	offscreen.panels[0].on_screen = ['product'];
	assert.match(scriptAuthoringSchema.safeParse(offscreen).error.issues[0].message, /on screen/);
});

test('a cast Character goes into every clip it appears in: its default image, and its voice file wherever it speaks', () => {
	assert.equal(storyboardSchema.safeParse(storyboard()).success, true);
	assert.deepEqual(storyboardIssues(storyboard(), context()), []);
	for (const clip of [0, 1, 2])
		assert.deepEqual(clipReferences(storyboard(), clip, context()), { images: [presenter.images[0], productImages[0]], audio: [presenter.voice] });
	const named = storyboard();
	named.clips[1].shots = [`特写。{{presenter:${presenter.images[1]}}}拿起{{product:${productImages[1]}}}说{{L02}}。`];
	assert.deepEqual(clipReferences(named, 1, context()), { images: [presenter.images[1], productImages[1]], audio: [presenter.voice] });
});

test('an on-camera line needs its speaker named in the shot, so the speaker cannot drop out of a clip', () => {
	const value = storyboard();
	value.clips[1].shots = ['产品特写，{{product}}放在台面上，画面外说{{L02}}。'];
	const issues = storyboardIssues(value, context());
	assert.ok(issues.some((message) => message.startsWith('C02 shot 1') && message.includes('name {{presenter}}')), issues.join('\n'));
	assert.ok(!issues.some((message) => message.startsWith('C01') || message.startsWith('C03')));
});

test('lines are placed once each, in Script order, and only in shots', () => {
	const twice = storyboard();
	twice.clips[2].shots.push('{{presenter}}再次说{{L01}}。');
	assert.ok(storyboardIssues(twice, context()).some((message) => message.includes('L01 is placed more than once')));
	const swapped = storyboard();
	[swapped.clips[0].shots, swapped.clips[1].shots] = [swapped.clips[1].shots, swapped.clips[0].shots];
	assert.ok(storyboardIssues(swapped, context()).some((message) => message.includes('Lines are placed in Script order')));
	const missing = storyboard();
	missing.clips[2].shots = ['{{presenter}}微笑看镜头，举起{{product}}。'];
	assert.ok(storyboardIssues(missing, context()).some((message) => message.includes('Line L03 is not placed')));
	const inDirection = storyboard();
	inDirection.direction = '开场说{{L01}}';
	assert.ok(storyboardIssues(inDirection, context()).some((message) => message.startsWith('direction') && message.includes('belongs in a shot')));
});

test('tokens must resolve: roles of the Script, images of that Character or the Product, well formed', () => {
	const value = storyboard();
	value.clips[0].shots = [`{{presenter:${productImages[0]}}}拿着{{product:${presenter.images[0]}}}，{{son}}在旁边，{{ presenter#2 }}说{{L01}}。{{L99}}`];
	const issues = storyboardIssues(value, context());
	for (const expected of ["not one of presenter's Character's", "not one of the Product's", 'son is not a role', 'is not a token', 'not a line of the Script'])
		assert.ok(issues.some((message) => message.includes(expected)), `${expected}\n${issues.join('\n')}`);
	assert.deepEqual(storyboardTokens('{{host}} 说 {{L04}}，拿 {{product:' + uuid(1) + '}}').map(({ name, asset }) => [name, asset]), [
		['host', undefined],
		['L04', undefined],
		['product', uuid(1)],
	]);
});

test('casting: every role once, a Character or a look, a voice for speakers, and "character" only with a voice file', () => {
	const both = storyboard();
	both.cast.presenter = { character: presenter.id, look: '短发', voice: 'character' };
	assert.ok(storyboardIssues(both, context()).some((message) => message.includes('either a Character or a look')));
	const silentVoice = storyboard();
	silentVoice.cast.presenter = { look: '约30岁女性，齐肩黑发', voice: 'character' };
	assert.ok(storyboardIssues(silentVoice, context()).some((message) => message.includes('"character" voice needs a cast Character')));
	const noVoiceFile = { ...context(), characters: { [presenter.id]: { ...presenter, voice: null } } };
	assert.ok(storyboardIssues(storyboard(), noVoiceFile).some((message) => message.includes('has no voice file')));
	const narrated = script();
	narrated.panels[2].lines[0] = { id: 'L03', speaker: 'narrator', mode: 'voiceover', text: '双11官旗入手。' };
	const issues = storyboardIssues(storyboard(), context(narrated));
	assert.ok(issues.some((message) => message.includes('cast the narrator')), issues.join('\n'));
	const unknown = storyboard();
	unknown.cast.son = { look: '小男孩' };
	assert.ok(storyboardIssues(unknown, context()).some((message) => message.includes('son is not a role')));
});

test('a described person carries no image, so a clip that names only them is rejected for having no image', () => {
	const value = storyboard();
	value.cast.presenter = { look: '约30岁女性，齐肩黑发，米白色圆领上衣', voice: '中高音，清晰，语速稍快' };
	assert.deepEqual(storyboardIssues(value, context()), []);
	assert.deepEqual(clipReferences(value, 0, context()), { images: [productImages[0]], audio: [] });
	value.clips[0].shots = ['近景。{{presenter}}对镜头说{{L01}}。'];
	assert.ok(storyboardIssues(value, context()).some((message) => message.startsWith('C01') && message.includes('at least one image')));
});

test('clips are numbered in order, add up to the Script length, and stay within the reference limits', () => {
	const renumbered = storyboard();
	renumbered.clips[1].id = 'C05';
	assert.ok(storyboardIssues(renumbered, context()).some((message) => message.includes('this one is C02')));
	const short = storyboard();
	short.clips = short.clips.slice(0, 2);
	short.clips[1].shots = ['{{presenter}}说{{L02}}，再说{{L03}}，手持{{product}}。'];
	assert.ok(storyboardIssues(short, context()).some((message) => message.includes('the Script is 30000 ms')));
	const crowded = context();
	crowded.characters = { [presenter.id]: { ...presenter, images: Array.from({ length: 10 }, (_, i) => uuid(200 + i)) } };
	const many = storyboard();
	many.clips[0].shots = [Array.from({ length: 10 }, (_, i) => `{{presenter:${uuid(200 + i)}}}`).join('') + '说{{L01}}'];
	assert.ok(storyboardIssues(many, crowded).some((message) => message.includes('names 10 images; at most 9')));
});

test('eval case 1 (three people, a product, a voiceover) fits: Characters with and without voice files and a described person', () => {
	const host = { id: uuid(300), images: [uuid(301), uuid(302)], voice: null };
	const spray = uuid(10);
	const value = {
		schema_version: 3,
		concept: { name: '明星直播力挺', category: 'beauty', purchase_task: '选一款提拉紧致的喷雾精华', proposition: '明星自用、亲测有效', route: '反驳质疑+效果演示', route_reason: '', speaker_relation: '主播对观众' },
		duration_ms: 14400,
		beats: ['反差开场', '反驳质疑', '湿敷演示', '推荐收尾'].map((purpose, i) => ({ id: `B0${i + 1}`, purpose, fact_ids: [] })),
		roles: [
			{ id: 'presenter', name: '开场讲解者', description: '年轻女性，对镜头喊话', speaks: true },
			{ id: 'host', name: '直播主播', description: '年轻女性，直播中反驳网友', speaks: true },
			{ id: 'cohost', name: '直播搭档', description: '年轻男性，附和并推荐', speaks: true },
		],
		panels: [
			{ id: 'P01', beat_id: 'B01', on_screen: ['presenter', 'product'], action: '喷脸后提拉涂抹，对镜头喊话', fact_ids: [], lines: [{ id: 'L01', speaker: 'presenter', mode: 'on_camera', text: '口红可以不买，但是这个瞒着老公也要买' }], notes: '' },
			{
				id: 'P02',
				beat_id: 'B02',
				on_screen: ['host', 'cohost'],
				action: '直播里两人激动地反驳网友评论',
				fact_ids: [],
				lines: [
					{ id: 'L02', speaker: 'host', mode: 'on_camera', text: '我又看见了一个评论说自己都不用' },
					{ id: 'L03', speaker: 'cohost', mode: 'on_camera', text: '就是自己都不用这种话' },
				],
				notes: '画面上方三行花字：“深夜直播怒怼网友”“反正我就是用了，非常好用”“真是五块钱的包装500块的效果”',
			},
			{ id: 'P03', beat_id: 'B03', on_screen: ['host'], action: '用浸透产品的棉片湿敷，揭下后展示皮肤', fact_ids: [], lines: [{ id: 'L04', speaker: 'cohost', mode: 'voiceover', text: '真的非常适合熬夜垮脸暗沉的人，' }], notes: '' },
			{ id: 'P04', beat_id: 'B04', on_screen: ['cohost', 'product'], action: '举着产品凑近镜头推荐', fact_ids: [], lines: [{ id: 'L05', speaker: 'cohost', mode: 'on_camera', text: '爱出油毛孔大的黄皮，需要紧致透亮的朋友' }], notes: '' },
		],
	};
	assert.equal(scriptAuthoringSchema.safeParse(value).success, true);
	const board = {
		script: uuid(901),
		cast: {
			presenter: { character: presenter.id, voice: 'character' },
			host: { character: host.id, voice: '年轻女声，音色偏高亢响亮，普通话' },
			cohost: { look: '二十多岁男性，短黑发，白色T恤', voice: '年轻男声，音色清朗，普通话' },
		},
		direction: '实拍竖屏，棚拍特写与手机自拍、直播录屏混剪，镜像翻转，暖白色调。口播全程配字幕，画面下方白字黑边。',
		clips: [
			{
				id: 'C01',
				duration_ms: 14400,
				shots: [
					`近景，深色背景。{{presenter}}右手拿{{product:${spray}}}朝脸喷洒，边涂边说{{L01}}；约1秒处画面突然推近。`,
					'特写，手持自拍。{{host}}在右侧凑近镜头说{{L02}}，{{cohost}}从左后方凑上来插话{{L03}}。上方三行花字保留到演示结束。',
					`近景，自拍。{{host:${host.images[1]}}}把浸透液体的棉片敷在脸的下半部分。`,
					`特写。{{host:${host.images[1]}}}揭下右脸颊上的棉片。`,
					`特写。{{host:${host.images[1]}}}手指抵住脸颊展示皮肤；{{L04}}画外音。`,
					`俯拍自拍，逐渐推近。{{cohost}}把{{product:${spray}}}举在画面左侧说{{L05}}。左上角竖排花字“@明星推荐”。`,
				],
			},
		],
	};
	const evalContext = { script: value, productImages: [spray, uuid(11)], characters: { [presenter.id]: presenter, [host.id]: host } };
	assert.deepEqual(storyboardIssues(board, evalContext), []);
	assert.deepEqual(clipReferences(board, 0, evalContext), { images: [presenter.images[0], spray, host.images[0], host.images[1]], audio: [presenter.voice] });
});

test('Scripts and Storyboards round-trip through their stored text; v2 packages stay readable as legacy', () => {
	const content = scriptSchema.parse(script());
	const text = encodeScript(content);
	assert.deepEqual(decodeScript(text), content);
	assert.equal(scriptVersion(text), 3);
	const stored = storyboardSchema.parse(storyboard());
	assert.deepEqual(decodeStoryboard(encodeStoryboard(stored)), stored);
	assert.throws(() => decodeScript(JSON.stringify({ format: 'nuva.storyboard', version: 1, content: stored })), /invalid Script/);
	assert.equal(scriptVersion('{"format":"nuva.script-package","version":2,"content":{}}'), 2);
	assert.equal(typeof encodeScriptPackage, 'function', 'The v2 reader and writer stay for legacy Scripts.');
});
