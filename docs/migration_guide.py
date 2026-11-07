"""Customer migration guide to 0.1.0-preview.5, in Chinese and English."""
from build import table
from customer_layout import code, filename


def migration_sections(locale='zh'):
    t = lambda en, zh: zh if locale == 'zh' else en
    p = lambda en, zh: '<p>' + t(en, zh) + '</p>'
    c = lambda text, language='ts': code(text, language, locale)
    link = lambda page, anchor='': filename(page, locale) + ('#' + anchor if anchor else '')
    section = lambda key, en, zh, body: (key, t(en, zh), body)
    before = lambda: '<p><strong>' + t('Before', '之前') + '</strong></p>'
    after = lambda: '<p><strong>' + t('Now', '现在') + '</strong></p>'

    return [
        section('overview', 'What changes', '变化概览',
            p('preview.5 makes Scripts, Storyboards and Prompts come only from the writers, so every change goes through the same checks, and lets shots use any image, video or audio file. Upgrade from <code>0.1.0-preview.4</code> with the steps below; from <code>0.1.0-preview.3</code>, first do <a href="#from-preview3">the preview.4 steps</a>.',
                'preview.5 让脚本、分镜和提示词只由编写服务生成，因此所有修改都经过相同检查；镜头还可以使用任意图片、视频或音频文件。从 <code>0.1.0-preview.4</code> 升级请按以下步骤操作；从 <code>0.1.0-preview.3</code> 升级请先完成<a href="#from-preview3">升级到 preview.4 的步骤</a>。')
            + p('The new SDK needs the new services: use it once they are released. It also reads Product <code>videos</code>, which older services do not have.',
                '新 SDK 需要新版服务，请在服务发布后使用。它还会读取产品的 <code>videos</code>，旧版服务没有这个字段。')
            + c('pnpm add /path/to/nuva-sdk-0.1.0-preview.5.tgz', 'sh')),
        section('removed', 'Removed and changed calls', '移除和变更的调用',
            p('Change each call in the left column. TypeScript flags the removed methods after the upgrade; the old <code>scripts.generate({base})</code> and <code>storyboards.generate({base})</code> / <code>({content})</code> forms throw <code>INVALID_INPUT</code> naming the new method before anything is sent.',
                '逐一修改左列中的调用。升级后 TypeScript 会标出已移除的方法；旧的 <code>scripts.generate({base})</code> 和 <code>storyboards.generate({base})</code> / <code>({content})</code> 写法会在发送前抛出 <code>INVALID_INPUT</code>，并给出新方法名。')
            + table([t('preview.4', 'preview.4'), t('preview.5', 'preview.5')], [
                ['<code>prompts.create({data})</code>', t('<code>videos.generate({input: {schema_version: 1, data}})</code>, or change the Storyboard and run <code>prompts.generate</code> again', '<code>videos.generate({input: {schema_version: 1, data}})</code>，或修改分镜后重新调用 <code>prompts.generate</code>')],
                ['<code>scripts.create({content})</code>', t('<code>scripts.generate</code>, then <code>scripts.revise</code> or <code>scripts.update</code>', '<code>scripts.generate</code>，再用 <code>scripts.revise</code> 或 <code>scripts.update</code>')],
                ['<code>scripts.generate({product, base, …, instruction})</code>', '<code>scripts.revise(ref, {instruction, acceptable_duration_ms?})</code>'],
                ['<code>scripts.update(ref, {content, batch_id?})</code>', t('Same call without <code>batch_id</code>; it now goes through the Agent and keeps the base\'s Batch', '相同调用，去掉 <code>batch_id</code>；现在经由 Agent 保存，并沿用原脚本的 Batch')],
                ['<code>storyboards.generate({base, instruction, cast?})</code>', '<code>storyboards.revise(ref, {instruction, cast?})</code>'],
                ['<code>storyboards.generate({base, content})</code>', '<code>storyboards.update(ref, {content})</code>'],
                ['<code>storyboards.generate({content})</code>', t('<code>storyboards.generate({script})</code>, then <code>storyboards.update</code>', '<code>storyboards.generate({script})</code>，再用 <code>storyboards.update</code>')],
                ['<code>artifacts.create</code> / <code>artifacts.update</code>', t('The kind\'s own client: <code>scripts</code>, <code>storyboards</code>, <code>prompts</code>', '使用对应类型的客户端：<code>scripts</code>、<code>storyboards</code>、<code>prompts</code>')],
            ])
            + p('Your own Prompt text: <code>prompts.create</code> is gone; send the same data as raw input.', '自己编写的提示词：<code>prompts.create</code> 已移除，请以原始输入提交相同数据。')
            + before() + c("const prompt = await nuva.prompts.create({ data: { prompt: text, image_asset_ids: [imageId], seconds: 5, ratio: '9:16' } });\nconst job = await nuva.videos.generate({ prompt: prompt.id });")
            + after() + c("const job = await nuva.videos.generate({\n  input: { schema_version: 1, data: { prompt: text, image_asset_ids: [imageId], seconds: 5, ratio: '9:16' } },\n});\n// job.prompt is the Prompt the backend saved for it.")
            + p('Changing a Script: have the writer change it, or save your edit.', '修改脚本：由编写服务修改，或保存自己的编辑。')
            + before() + c("const revised = await nuva.scripts.generate({ product: productId, base: script.id, acceptable_duration_ms: range, instruction: '开头更短' });\nconst edited = await nuva.scripts.update(script.ref, { content, batch_id: batchId });")
            + after() + c("const revised = await nuva.scripts.revise(script.ref, { instruction: '开头更短' }); // keeps the length without a range\nconst edited = await nuva.scripts.update(script.ref, { content });")
            + p('Changing a Storyboard:', '修改分镜：')
            + before() + c("await nuva.storyboards.generate({ base: storyboard.id, instruction: '第二个片段换成特写' });\nawait nuva.storyboards.generate({ base: storyboard.id, content });")
            + after() + c("await nuva.storyboards.revise(storyboard.ref, { instruction: '第二个片段换成特写' });\nawait nuva.storyboards.update(storyboard.ref, { content });")
            + p('A Script saved before Storyboards (<code>format: 2</code>) is read-only: <code>scripts.update</code> on it returns <code>422 REJECTED</code>. Write a new Script with <code>scripts.generate</code>.',
                'Storyboard 推出之前保存的脚本（<code>format: 2</code>）为只读：对其调用 <code>scripts.update</code> 返回 <code>422 REJECTED</code>。请用 <code>scripts.generate</code> 生成新脚本。')),
        section('named-files', 'Prompts must name every file', '提示词必须提到每个文件',
            p('A Prompt\'s text names its files by position: <code>&lt;Picture 1&gt;</code> is the first of <code>image_asset_ids</code>, and likewise <code>&lt;Video N&gt;</code> and <code>&lt;Audio N&gt;</code>. The video model ignores a file the text does not name. A new Prompt (<code>videos.generate({input})</code>, <code>prompts.update</code>) must name every attached file, and no number past the end of its list; otherwise it is rejected with <code>422 INVALID_PROMPT</code>, nothing is saved or charged, and the message says which file is missing.',
                '提示词按位置指代文件：<code>&lt;Picture 1&gt;</code> 是 <code>image_asset_ids</code> 中的第一个，<code>&lt;Video N&gt;</code> 和 <code>&lt;Audio N&gt;</code> 同理。视频模型会忽略文字中没有提到的文件。新的提示词（<code>videos.generate({input})</code>、<code>prompts.update</code>）必须提到每个附带的文件，且编号不能超出列表；否则返回 <code>422 INVALID_PROMPT</code>，不会保存或计费，错误信息会指出缺少哪个文件。')
            + before() + c("// Accepted, but the video model ignored the second image.\ndata: { prompt: 'Show <Picture 1> on a table.', image_asset_ids: [product, poster] }")
            + after() + c("data: { prompt: 'Show <Picture 1> on a table, with the poster in <Picture 2> on the wall.', image_asset_ids: [product, poster] }")
            + p('Prompts from <code>prompts.generate</code> always name their files. To change what gets rendered, change the Storyboard or the Product and compile again: see <a href="' + link('generation', 'change-render') + '">Change what gets rendered</a>.',
                '<code>prompts.generate</code> 生成的提示词总会提到其文件。需要修改生成内容时，请修改分镜或产品后重新编译，见<a href="' + link('generation', 'change-render') + '">修改生成的内容</a>。')),
        section('also-new', 'Also new', '其他变化',
            table([t('Change', '变化'), t('What to know', '说明')], [
                [t('File tokens', '文件标记'), t('<code>{{asset:&lt;id&gt;}}</code> uses any image, video or audio Asset you may use; <code>{{role:&lt;id&gt;}}</code> and <code>{{product:&lt;id&gt;}}</code> take any file that Character or Product has. The file\'s kind decides how it is used. They work in shots and in <code>instruction</code>; see <a href="' + link('generation', 'tokens') + '">Write shots with tokens</a>.', '<code>{{asset:&lt;id&gt;}}</code> 可使用你有权使用的任意图片、视频或音频 Asset；<code>{{role:&lt;id&gt;}}</code> 和 <code>{{product:&lt;id&gt;}}</code> 可使用该人物或产品的任意文件。文件类型决定其用法。可写在镜头和 <code>instruction</code> 中，见<a href="' + link('generation', 'tokens') + '">在镜头中使用标记</a>。')],
                [t('Product videos', '产品视频'), t('Products take up to 5 <code>videos</code>. Reading a Product without videos returns no <code>videos</code> field.', '产品可保存最多 5 个 <code>videos</code>。没有视频的产品，读取时不返回 <code>videos</code> 字段。')],
                [t('Steering', '插话'), t('<code>agent.send</code> no longer gets <code>AGENT_BUSY</code> while the Agent works: the message shows at once with <code>unread: true</code> and joins at the Agent\'s next step.', 'Agent 工作时 <code>agent.send</code> 不再返回 <code>AGENT_BUSY</code>：消息立即显示并带有 <code>unread: true</code>，在 Agent 的下一步加入对话。')],
                [t('Deleting Products', '删除产品'), t('<code>products.delete(id)</code>. What was made from the Product stays readable, and its saved Prompts still render.', '<code>products.delete(id)</code>。由该产品生成的内容仍可读取，已保存的提示词仍可生成视频。')],
                [t('Who may change what', '修改权限'), t('Brands, Products and Characters saved before this release stay editable by everyone in your organization, as before; deleting or sharing them takes an admin of <code>customer</code>. New ones belong to the user who makes them. See the CHANGELOG\'s "Who sees what".', '本版本之前保存的品牌、产品和人物，组织内所有人仍可编辑，与之前相同；删除或共享它们需要 <code>customer</code> 的管理员。新建的品牌、产品和人物归创建者所有。详见 CHANGELOG 中的 “Who sees what”。')],
                [t('Attaching an Asset', '附加 Asset'), t('<code>Message.create().attach(asset)</code> compiles under strict TypeScript.', '<code>Message.create().attach(asset)</code> 在 strict TypeScript 下可以编译。')],
            ])),
        section('grace', 'Grace period for existing integrations', '现有集成的过渡期',
            p('If we told you your organization is on the grace list, your preview.4 calls keep working after the release while you upgrade: <code>prompts.create</code>, <code>scripts.create</code>, direct <code>scripts.update</code> and <code>storyboards.generate({content})</code>. A Prompt that leaves a file unnamed is saved as before instead of being rejected; the file is still ignored by the video model.',
                '如果我们已告知你的组织在过渡名单中，发布后你在 preview.4 上的调用仍可使用，方便你逐步升级：<code>prompts.create</code>、<code>scripts.create</code>、直接调用的 <code>scripts.update</code> 和 <code>storyboards.generate({content})</code>。文字中未提到某个文件的提示词仍会照旧保存，不会被拒绝；视频模型仍会忽略该文件。')
            + p('Each such response carries <code>Deprecation: true</code> and a <code>Link</code> to this page; log it to find the calls left to change. The grace period ends later, after we tell you; then these calls get the preview.5 behavior (<code>403</code> or <code>422 INVALID_PROMPT</code>). Organizations not on the list get the preview.5 behavior at once.',
                '这类响应带有 <code>Deprecation: true</code> 和指向本页的 <code>Link</code> 头；记录它们即可找出还需修改的调用。过渡期会在我们通知后结束，届时这些调用将按 preview.5 处理（返回 <code>403</code> 或 <code>422 INVALID_PROMPT</code>）。不在名单中的组织在发布后立即按 preview.5 处理。')),
        section('from-preview3', 'From preview.3', '从 preview.3 升级',
            p('Since 2026-11-04, Script and Prompt generation needs preview.4 or later. Make these changes first, then the ones above.',
                '自 2026-11-04 起，脚本和提示词生成需要 preview.4 或更高版本。请先完成以下修改，再完成上面的修改。')
            + '<ol>'
            + '<li>' + t('Generation is four steps: <code>scripts.generate</code> → <code>storyboards.generate({script, cast?, instruction?})</code> → <code>prompts.generate({storyboard, ratio})</code> → <code>videos.generate({prompt})</code>. The shooting instruction moves to <code>storyboards.generate</code>; <code>prompts.generate</code> no longer takes <code>script</code>, <code>instruction</code> or <code>batch_id</code>.', '生成流程分四步：<code>scripts.generate</code> → <code>storyboards.generate({script, cast?, instruction?})</code> → <code>prompts.generate({storyboard, ratio})</code> → <code>videos.generate({prompt})</code>。拍摄要求改为传给 <code>storyboards.generate</code>；<code>prompts.generate</code> 不再接受 <code>script</code>、<code>instruction</code> 和 <code>batch_id</code>。') + '</li>'
            + '<li>' + t('Read Scripts by <code>format</code>: <code>3</code> has <code>.content</code>; Scripts saved before 2026-11-04 are <code>2</code>, read-only, with <code>.legacy</code>. Write new Scripts for new work.', '按 <code>format</code> 读取脚本：<code>3</code> 用 <code>.content</code>；2026-11-04 之前保存的脚本为 <code>2</code>，只读，用 <code>.legacy</code>。新的工作请生成新脚本。') + '</li>'
            + '<li>' + t('A Job from a saved Prompt joins its Batch by itself; drop <code>batch_id</code> from <code>videos.generate</code>.', '由已保存提示词创建的任务会自动加入其 Batch；<code>videos.generate</code> 不必再传 <code>batch_id</code>。') + '</li>'
            + '<li>' + t('<code>asset.label</code> is your label or <code>null</code>.', '<code>asset.label</code> 是你设置的标签，未设置时为 <code>null</code>。') + '</li>'
            + '<li>' + t('Allow 300 s for <code>storyboards.generate</code> and <code>prompts.generate</code> if you set <code>requestTimeoutMs</code>.', '如果设置了 <code>requestTimeoutMs</code>，请为 <code>storyboards.generate</code> 和 <code>prompts.generate</code> 留出 300 秒。') + '</li>'
            + '</ol>'),
        section('checklist', 'Checklist', '检查清单',
            '<ul>'
            + '<li>' + t('Install the preview.5 archive (and Go <code>v0.1.0-preview.5</code> if you use the Go Admin SDK).', '安装 preview.5 包（使用 Go Admin SDK 时同时升级到 <code>v0.1.0-preview.5</code>）。') + '</li>'
            + '<li>' + t('Replace <code>prompts.create</code>, <code>scripts.create</code> and <code>artifacts.create</code>/<code>update</code>.', '替换 <code>prompts.create</code>、<code>scripts.create</code> 和 <code>artifacts.create</code>/<code>update</code>。') + '</li>'
            + '<li>' + t('Use <code>scripts.revise</code>, <code>storyboards.revise</code> and <code>storyboards.update</code> for changes; drop <code>batch_id</code> from <code>scripts.update</code>.', '修改时使用 <code>scripts.revise</code>、<code>storyboards.revise</code> 和 <code>storyboards.update</code>；<code>scripts.update</code> 去掉 <code>batch_id</code>。') + '</li>'
            + '<li>' + t('Make sure raw Prompt text names every attached file as <code>&lt;Picture N&gt;</code>, <code>&lt;Video N&gt;</code> or <code>&lt;Audio N&gt;</code>, and handle <code>422 INVALID_PROMPT</code>.', '确保原始提示词文字用 <code>&lt;Picture N&gt;</code>、<code>&lt;Video N&gt;</code> 或 <code>&lt;Audio N&gt;</code> 提到每个附带文件，并处理 <code>422 INVALID_PROMPT</code>。') + '</li>'
            + '<li>' + t('On the grace list: watch for <code>Deprecation</code> response headers until none are left.', '在过渡名单中：留意 <code>Deprecation</code> 响应头，直到不再出现。') + '</li>'
            + '</ul>'),
    ]
