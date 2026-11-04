"""Customer-facing reference generated from checked SDK examples."""
from html import escape
import json
from pathlib import Path
import re
from textwrap import dedent
from build import table
from customer_layout import code
from customer_layout import filename
from response_examples import response_example


def message_example():
    return {
        'ref': {'sessionId': '11111111-1111-4111-8111-111111111111', 'messageId': '22222222-2222-4222-8222-222222222222'},
        'role': 'assistant', 'state': 'complete', 'createdAt': '2026-10-26T12:00:00.000Z',
        'content': [
            {'id': 'text_1', 'type': 'text', 'format': 'markdown', 'text': 'The Script is saved and ready for review.'},
            {'id': 'result_1', 'type': 'resource', 'record': {
                'ref': {'kind': 'script', 'id': '33333333-3333-4333-8333-333333333333'}, 'label': 'Script 1'}},
        ], 'attachments': [],
    }


def source_example(name, locale, prelude='', source='guide.tsx'):
    text = (Path(__file__).parent / 'examples' / source).read_text()
    matches = re.findall(rf'^[\t ]*// #region {re.escape(name)}\n(.*?)^[\t ]*// #endregion {re.escape(name)}$', text, re.M | re.S)
    if len(matches) != 1:
        raise ValueError(f'Expected one example region: {source}:{name}')
    snippet = dedent(matches[0]).strip()
    if prelude:
        snippet = prelude + '\n\n' + snippet
    owner = ('后端代码' if source.endswith('.go') else '应用代码') if locale == 'zh' else ('Your backend' if source.endswith('.go') else 'Your application')
    return code(snippet, 'go' if source.endswith('.go') else 'tsx', locale, filename=f'{owner} · {source}')


def guide_pages(locale='zh'):
    t = lambda en, zh: zh if locale == 'zh' else en
    p = lambda en, zh: '<p>' + t(en, zh) + '</p>'
    ex = lambda key, prelude='': source_example(key, locale, prelude)
    c = lambda text, language='ts': code(text, language, locale)
    response = lambda name: response_example(name, locale)
    link = lambda page, anchor='': filename(page, locale) + ('#' + anchor if anchor else '')
    section = lambda key, en, zh, body: (key, t(en, zh), body)
    download = p('Download the <a href="examples/guide.tsx">complete TypeScript example</a>.', '下载<a href="examples/guide.tsx">完整 TypeScript 示例</a>。')

    start = [
        section('install', '1. Install', '1. 安装',
            p('Install the SDK archive supplied with your integration.', '安装随接入资料提供的 SDK 压缩包。')
            + c('pnpm add /path/to/nuva-sdk-0.1.0-preview.4.tgz', 'sh')),
        section('authentication', '2. Provide a user token', '2. 提供用户令牌',
            p('Expose <code>POST /api/ads/token</code> in your application backend. Authenticate the application user and return their Ads user token and expiry. Keep the customer Admin API key on your backend.',
              '在应用后端提供 <code>POST /api/ads/token</code>。验证应用用户身份后，返回该用户的 Ads 用户令牌和过期时间。客户 Admin API key 仅保存在后端。')
            + c('{\n  "token": "USER_ACCESS_TOKEN",\n  "expiresAt": "2026-10-26T19:00:00Z"\n}', 'json')
            + p(f'Implement this route with the <a href="{link("backend-go", "tokens")}">Go Admin SDK</a>. The browser callback below calls your route whenever the SDK needs a token.',
                f'使用 <a href="{link("backend-go", "tokens")}">Go Admin SDK</a> 实现此接口。SDK 需要令牌时，会调用以下浏览器端回调。')
            + '<h3 id="token-callback">' + t('Implement this callback in your application', '在应用中实现此回调') + '</h3>'
            + p('Write a function that fetches a token from your backend, then pass it to the SDK’s <code>getAccessToken</code> option. <code>/api/ads/token</code> is an example route you implement; replace it with your own token endpoint.', '编写一个从你的后端获取令牌的函数，再将它传给 SDK 的 <code>getAccessToken</code> 选项。<code>/api/ads/token</code> 是由你实现的示例接口路径，请替换成你自己的令牌接口。')
            + ex('token', "import type { AccessToken } from '@nuva/sdk';")
            + p('<code>expiresAt</code> accepts an ISO datetime or Unix milliseconds. The SDK caches the token and calls this function again before expiry. Concurrent refresh requests share the same call.',
                '<code>expiresAt</code> 支持 ISO 时间字符串或 Unix 毫秒时间戳。SDK 缓存令牌，并在过期前再次调用此函数；并发刷新会共用一次请求。')),
        section('client', '3. Create the client', '3. 创建客户端',
            p('Create one client for the signed-in user. Omit <code>environment</code> to use <code>sandbox</code>, which points to staging.',
              '为当前登录用户创建一个客户端。省略 <code>environment</code> 时默认使用 <code>sandbox</code>，连接 staging 环境。')
            + ex('client', "import { useEffect, useState } from 'react';\nimport { createNuva, type NuvaClient } from '@nuva/sdk';")
            + p('Pass <code>fetchTokenFromYourBackend</code> from the previous step as the callback. Mount this hook inside the authenticated area of your app. Remount it on account changes and unmount it on logout so <code>close()</code> releases the old client.',
                '将上一步实现的 <code>fetchTokenFromYourBackend</code> 作为回调传入。在应用的已登录区域中使用此 hook；切换账号时重新挂载，退出登录时卸载，让 <code>close()</code> 关闭旧客户端。')
            + '<h3 id="environment">' + t('Select an environment', '选择环境') + '</h3>'
            + ex('environment')
            + p('Set <code>environment: "production"</code> for production, or <code>"sandbox"</code> for staging. Use a token issued by the same environment. Explicit <code>baseUrl</code>, <code>storeBaseUrl</code> and <code>generationBaseUrl</code> options override the selected service addresses.', '设置 <code>environment: "production"</code> 连接生产环境，设置 <code>"sandbox"</code> 连接 staging。令牌必须由对应环境签发。显式设置 <code>baseUrl</code>、<code>storeBaseUrl</code> 和 <code>generationBaseUrl</code> 时，会覆盖所选环境的服务地址。')),
        section('first-request', '4. Create a conversation', '4. 创建对话',
            p('Call <code>sessions.create</code> when the user starts a conversation. Save the returned Session ID so the user can reopen it later. <code>onOpen</code> below is your application callback for selecting that conversation.',
                '用户开始对话时调用 <code>sessions.create</code>。保存返回的 Session ID，供以后重新打开。下例中的 <code>onOpen</code> 是应用用于选中该对话的回调。')
            + ex('first-session')
            + p(f'Continue with <a href="{link("agent", "session")}">Agent conversations</a> to subscribe, send a message, and render the reply. The complete example includes <code>AdsConversationApp</code>, which connects these components.',
                f'接着按<a href="{link("agent", "session")}"> Agent 对话</a>接入状态订阅、消息发送和回复展示。完整示例中的 <code>AdsConversationApp</code> 已连接这些组件。') + download),
        section('next', 'Use other SDK operations', '使用其他 SDK 操作',
            table([t('Task', '任务'), t('Guide', '操作说明')], [
                [t('Display a conversation, handle user replies and Stop.', '展示对话、处理用户答复和停止当前回复。'), f'<a href="{link("agent")}">{t("Agent conversations", "Agent 对话")}</a>'],
                [t('Create Products, upload images and read saved artifacts.', '创建产品、上传图片、读取已保存的产物。'), f'<a href="{link("store")}">{t("Manage resources", "管理资源")}</a>'],
                [t('Call Script, Storyboard and video generation from your own buttons.', '通过自己的按钮调用脚本、分镜和视频生成。'), f'<a href="{link("generation")}">{t("Generate content", "生成内容")}</a>'],
                [t('Issue user tokens and register Skills.', '签发用户令牌并注册 Skill。'), f'<a href="{link("backend-go")}">{t("Backend setup", "后端接入")}</a>'],
            ])),
    ]

    agent = [
        section('session', 'Open a Session and subscribe', '打开 Session 并订阅状态',
            p(f'Use the client from <a href="{link("frontend", "client")}">setup</a> and a saved Session ID. The subscription receives the current state immediately and subsequent updates as the Agent works.',
                f'使用<a href="{link("frontend", "client")}">接入步骤</a>中创建的客户端和已保存的 Session ID。订阅会立即返回当前状态，并在 Agent 工作过程中继续推送更新。')
            + ex('subscribe', "import { useEffect, useMemo, useState, type FormEvent } from 'react';\nimport { Message, type NuvaClient, type AgentHandle, type AgentState } from '@nuva/sdk';")
            + p('Mount the conversation component with <code>key={sessionId}</code>. Unsubscribing stops local updates; it does not stop server work.',
                '使用 <code>key={sessionId}</code> 挂载对话组件。取消订阅只停止本地状态更新，不会停止服务端工作。')
            + p('After initial loading, a synchronization error can appear in <code>state.error</code> while the last known execution status and messages remain available. Show that error alongside the conversation, preserve the draft, and offer explicit refresh after connectivity or sign-in is restored. Also render failed-message errors without discarding partial content.',
                '首次加载后，同步错误可能出现在 <code>state.error</code> 中，同时保留上次已知的运行状态和消息。应在对话旁显示错误并保留草稿，在网络或登录恢复后允许用户主动刷新；失败消息也应显示错误并保留部分内容。')
            + table([t('State', '状态'), t('Display / behavior', '展示与行为')], [
                ['<code>loading</code>', t('Wait for the initial Session state.', '等待首次加载 Session。')],
                ['<code>idle</code>', t('Allow a new user message.', '允许发送新消息。')],
                ['<code>running</code>', t('Render streamed updates. Keep a new draft until this loop finishes.', '展示流式更新；当前循环结束前保留新的草稿。')],
                ['<code>waiting_for_response</code>', t('Reserved for client tools. The Ads Agent declares none, so it does not enter this state.', '为客户端工具保留。Ads Agent 未声明客户端工具，因此不会进入此状态。')],
                ['<code>error</code>', t('Show the synchronization error and retain the draft.', '展示同步错误并保留草稿。')],
            ])),
        section('send', 'Send a message', '发送消息',
            p('Pass <code>busy={state.status !== "idle"}</code> after handling loading and error states. Clear only the submitted draft after <code>send()</code> succeeds.',
                '处理加载和错误状态后，传入 <code>busy={state.status !== "idle"}</code>。仅在 <code>send()</code> 成功后清除对应的已提交草稿。')
            + ex('composer')
            + p('<code>send()</code> confirms that the input was accepted. Agent replies and saved resources arrive through the subscription. A busy Session rejects another normal message; this preview has no user-message queue.',
                '<code>send()</code> 确认输入已被接受；Agent 回复和已保存的资源通过订阅返回。忙碌的 Session 会拒绝新的普通消息，此预览版不提供用户消息队列。')),
        section('references', 'Attach Products and quote results', '附加产品与引用结果',
            p('Pass a resource returned by the SDK to <code>attach()</code> or <code>quote()</code>. The reference carries the resource kind and ID; a display name alone does not identify a Product or Script.',
                '将 SDK 返回的资源传给 <code>attach()</code> 或 <code>quote()</code>。引用包含资源类型和 ID；仅有展示名称不能确定产品或脚本。')
            + ex('attach', "import type { Product, Script } from '@nuva/sdk';") + ex('revise-message')
            + p('Use <code>Message.create().replyTo(message)</code> to address a particular saved message. Use the same Session to retain the conversation context.',
                '使用 <code>Message.create().replyTo(message)</code> 回复指定的已保存消息。继续使用同一个 Session，以保留对话上下文。')),
        section('results', 'Display messages and saved resources', '展示消息和已保存的资源',
            p('Render <code>state.messages.items</code> in order. Use each message ID as its list key. Render resource records as clickable previews and load the resource when the user opens one.',
                '按顺序渲染 <code>state.messages.items</code>，并用消息 ID 作为列表 key。将资源记录展示为可点击的预览，在用户打开时读取资源。')
            + ex('render-message', "import type { ReactNode } from 'react';\nimport type { MessageView, MessageRef, ResourceLink, DynamicToolUIPart } from '@nuva/sdk';")
            + p('Supply <code>onOpenResource</code>, <code>onOpenMessage</code> and <code>renderInteraction</code> from your UI. Text can be plain text or Markdown; use your Markdown renderer when <code>format === "markdown"</code>. A quote may have no excerpt, so keep a link to its target. The full example’s first conversation displays text only; add this renderer to show resources and interactions.',
                '由你的界面提供 <code>onOpenResource</code>、<code>onOpenMessage</code> 和 <code>renderInteraction</code>。文本可以是纯文本或 Markdown；当 <code>format === "markdown"</code> 时使用你的 Markdown 渲染器。引用可能没有摘录，应保留指向目标的入口。完整示例中的初始对话只展示文本；接入此渲染器后可展示资源和交互。')
            + p(f'Load Scripts with <code>client.scripts.get(record.ref)</code>, Storyboards with <code>client.storyboards.get(record.ref)</code> and Products with <code>client.products.get(record.ref.id)</code>. See <a href="{link("store", "artifacts")}">artifact reads</a>.',
                f'使用 <code>client.scripts.get(record.ref)</code> 读取脚本，<code>client.storyboards.get(record.ref)</code> 读取分镜，<code>client.products.get(record.ref.id)</code> 读取产品。参见<a href="{link("store", "artifacts")}">产物读取</a>。')),
        section('interactions', 'Client tools and host calls', '客户端工具与宿主调用',
            p('The SDK can receive client tools (<code>dynamic-tool</code> parts answered with <code>respond()</code> or <code>fail()</code>) and host calls (response-free UI actions received through <code>onHostCall()</code>). The Ads Agent currently declares no client tools or host calls, so these never fire. The Agent asks questions in ordinary assistant messages; the user answers with a normal message.',
                'SDK 支持接收客户端工具（通过 <code>respond()</code> 或 <code>fail()</code> 答复的 <code>dynamic-tool</code> 内容）和宿主调用（通过 <code>onHostCall()</code> 接收、无需答复的界面操作）。Ads Agent 目前未声明任何客户端工具或宿主调用，因此它们不会触发。Agent 通过普通助手消息提问，用户以普通消息回答。')
            + p('A Skill’s <code>attributes.hostCalls</code> is currently ignored. Registering it does not add actions to a conversation.',
                'Skill 的 <code>attributes.hostCalls</code> 目前会被忽略，注册后不会为对话增加任何操作。')),
        section('stop-history', 'Stop and read history', '停止回复与读取历史',
            ex('controls')
            + p('Stop ends the current Agent loop. It does not delete messages or cancel submitted video Jobs. Ask the Agent to attempt Job cancellation. <code>loadEarlierMessages()</code> adds older messages to the subscribed state; <code>refresh()</code> resynchronizes without starting a new turn.',
                'Stop 结束当前 Agent 循环，不删除消息，也不取消已提交的视频任务。需要取消任务时请让 Agent 尝试执行。<code>loadEarlierMessages()</code> 将更早的消息加入订阅状态；<code>refresh()</code> 重新同步状态，不会开启新回合。')
            + c("const saved = await client.sessions.history(sessionId, { limit: 50 });\nconst nextCursor = saved.nextCursor;")
            + p('Use <code>sessions.history</code> for a saved-history view without opening a live Agent handle. Use the returned cursor to request another page.',
                '仅展示已保存的历史时，可使用 <code>sessions.history</code>，无需打开实时 Agent handle。使用返回的 cursor 请求下一页。') + download),
    ]

    resources = [
        section('products', 'Create a Brand and Product', '创建品牌与产品',
            p('Create a Brand first, then use its ID when creating a Product. Save facts and reference images on the Product before asking for a Script.',
                '先创建品牌，再用品牌 ID 创建产品。在请求脚本前，将事实信息和参考图片保存到产品。')
            + ex('create-product', "import { ProductImageUploadError, type NuvaClient, type Product, type Script } from '@nuva/sdk';")
            + p('<code>file</code> is the <code>File</code> selected in your upload UI. <code>uploadImage</code> uploads the image and updates the Product; use the returned Product as the base for subsequent edits.',
                '<code>file</code> 是用户通过上传控件选择的 <code>File</code>。<code>uploadImage</code> 上传图片并更新产品；后续编辑应以返回的产品作为 base。')
            + table([t('Product data', '产品数据'), t('Use', '用途')], [
                ['<code>name</code>', t('Product name.', '产品名称。')],
                ['<code>facts</code>', t('Known product facts.', '已知的产品事实。')],
                ['<code>selling_points</code>', t('Selling points for creative work.', '用于创作的卖点。')],
                ['<code>target_audience</code>', t('Intended audience.', '目标受众。')],
                ['<code>constraints</code>', t('Product-specific restrictions.', '与产品有关的限制。')],
                ['<code>images</code>', t('Reference image Asset IDs; uploadImage manages attachment.', '参考图片的 Asset ID；可通过 uploadImage 完成附加。')],
                ['<code>attributes</code>', t('Additional fields as JSON.', '以 JSON 保存其他属性。')],
            ])),
        section('browse', 'List and update resources', '浏览与更新资源',
            ex('list-products')
            + p('Continue requesting pages until <code>nextCursor</code> is null. Brands and Characters use the same get/list/create/update pattern.',
                '继续请求分页，直到 <code>nextCursor</code> 为 null。品牌和人物（Character）也使用 get/list/create/update 操作。')
            + ex('update-product')
            + p('Pass the record you read as <code>base</code>. Its <code>id</code> remains stable after an edit; <code>version</code> increments and <code>revision</code> identifies the saved revision. On <code>REVISION_CONFLICT</code>, keep the user’s edit, read the current record, and ask the user how to reconcile it.',
                '将读取到的记录传入 <code>base</code>。编辑后 <code>id</code> 保持不变，<code>version</code> 递增，<code>revision</code> 标识此次保存的版本。发生 <code>REVISION_CONFLICT</code> 时保留用户编辑，读取当前记录，再由用户决定如何合并。')),
        section('characters', 'Create a Character', '创建人物',
            p('A Character is a person you want to appear the same in every clip: a name, a description, one or more photos and, optionally, a voice recording. The first image is the default.',
                '人物（Character）是需要在每个片段中保持一致的人：名称、描述、一张或多张照片，以及可选的一段声音录音。第一张图片是默认图片。')
            + ex('create-character')
            + p(f'Each clip of a Storyboard is rendered as a separate video. A role described only in words is drawn again in every clip, so the face and voice can change from clip to clip. A cast Character gives every clip it appears in the same photo as a reference, and with <code>voice: "character"</code> the same voice recording. Cast it with <code>storyboards.generate({{cast: {{role: characterId}}}})</code>; see <a href="{link("generation", "storyboard")}">Storyboards</a>.',
                f'分镜中的每个片段单独生成视频。只用文字描述的角色会在每个片段中重新生成，长相和声音可能前后不一致。选角（cast）为人物后，它出现的每个片段都使用同一张照片作为参考；设置 <code>voice: "character"</code> 时还使用同一段声音录音。通过 <code>storyboards.generate({{cast: {{role: characterId}}}})</code> 选角，参见<a href="{link("generation", "storyboard")}">分镜</a>。')
            + p('Characters are shared within your organization and versioned like Products: an update takes the record you read as <code>base</code>. A Storyboard records the exact Character revision it cast, and its clips are always compiled with that revision: an update changes the Storyboards written after it, or a revision of an existing one, not what an existing Storyboard renders. Use photos and recordings of people who agreed to appear in your ads.',
                '人物在组织内共享，并像产品一样按版本保存：更新时将读取到的记录作为 <code>base</code> 传入。分镜会记录所选人物的具体版本，其片段始终按该版本编译：更新人物只影响之后写的分镜或对已有分镜的修订，不会改变已有分镜生成的内容。请只使用已同意出现在广告中的人的照片和录音。')),
        section('media', 'Upload and display media', '上传与展示媒体',
            c("const asset = await client.assets.upload(file, { kind: 'video' });\n\n// Fetch a fresh URL when reopening saved media.\nconst current = await client.assets.get(asset.id);")
            + c('<video src={current.download_url} controls preload="metadata" />', 'tsx')
            + p('Store the Asset ID, not its download URL. Download URLs expire; read the Asset again for fresh access. For shared Products and Ads, use their authorized <code>assets</code> sidecars when direct Asset reads are not permitted.',
                '保存 Asset ID，不要把下载地址当作永久标识。下载地址会过期，应重新读取 Asset 获取有效地址。共享产品或广告不允许直接读取 Asset 时，使用其返回的已授权 <code>assets</code> 附带资源。')
            + '<h3 id="asset-labels">' + t('Say what an image shows', '说明图片内容') + '</h3>'
            + ex('label-image')
            + p('<code>label</code> (up to 200 characters) and <code>description</code> (up to 2,000) say what a file shows, such as which side of a package. The Script and Storyboard writers read them to tell a Product\'s images apart and to pick the right one for a shot. Set them when uploading; they cannot be edited later. Uploading the same file again with a new label or description replaces them. Only the uploader can set them. Both are null when not given.',
                '<code>label</code>（最多 200 个字符）和 <code>description</code>（最多 2,000 个字符）说明文件的内容，例如包装的哪一面。脚本和分镜编写服务会读取它们，以区分产品的各张图片，并为镜头选择合适的图片。只能在上传时设置，之后不能编辑；以新的 label 或 description 再次上传同一文件会替换原值。只有上传者可以设置。未提供时两者均为 null。')
            + ex('upload-error')
            + p('A Product image upload can succeed before the Product update fails. Retain <code>ProductImageUploadError.asset</code>; avoid uploading the same file again just to retry attachment.',
                '产品图片可能已上传成功，但随后更新产品失败。保留 <code>ProductImageUploadError.asset</code>，不要仅为重试附加而再次上传同一文件。')),
        section('artifacts', 'Read and edit Scripts', '读取与编辑脚本',
            ex('read-script')
            + p('A Script is the idea of the ad: <code>concept</code>, the target length <code>duration_ms</code>, <code>beats</code>, <code>roles</code> (<code>{id, name, description, speaks}</code>) and <code>panels</code> in order. Each panel lists who is <code>on_screen</code>, the <code>action</code>, the <code>fact_ids</code> it uses, its <code>lines</code> and free-text <code>notes</code> (on-screen words and other requests). A line is <code>{id, speaker, mode, text}</code>: <code>id</code> is <code>L01</code>, <code>L02</code>…, <code>speaker</code> is a role ID or <code>narrator</code>, and <code>mode</code> is <code>on_camera</code>, <code>dialogue</code> or <code>voiceover</code>. A Script has no clips, shots, timing, voices or casting; the <a href="' + link('generation', 'storyboard') + '">Storyboard</a> decides those.',
                '脚本是广告的创意：<code>concept</code>、目标时长 <code>duration_ms</code>、<code>beats</code>、<code>roles</code>（<code>{id, name, description, speaks}</code>）以及按顺序排列的 <code>panels</code>。每个 panel 列出出镜者 <code>on_screen</code>、动作 <code>action</code>、使用的事实 <code>fact_ids</code>、台词 <code>lines</code> 和自由文本 <code>notes</code>（屏幕文字和其他要求）。台词为 <code>{id, speaker, mode, text}</code>：<code>id</code> 为 <code>L01</code>、<code>L02</code>…，<code>speaker</code> 为角色 ID 或 <code>narrator</code>，<code>mode</code> 为 <code>on_camera</code>、<code>dialogue</code> 或 <code>voiceover</code>。脚本不包含片段、镜头、时间、声音或选角，这些由<a href="' + link('generation', 'storyboard') + '">分镜</a>决定。')
            + p('Scripts saved before Storyboards have <code>format: 2</code> and their old ScriptPackage in <code>script.legacy</code>. They stay readable but are read-only and cannot be shot. Write a new Script for new work.',
                '分镜功能推出前保存的脚本 <code>format</code> 为 <code>2</code>，旧的 ScriptPackage 位于 <code>script.legacy</code>。它们仍可读取，但为只读，不能生成分镜。新的工作请重新生成脚本。')
            + ex('save-script')
            + p('An Artifact update returns a new ID and leaves the original intact. Use the returned reference for later operations. <code>base_id</code> points to the previous version. The typed client validates <code>script.content</code> and handles its stored encoding.',
                '更新产物会返回新 ID，原记录保持不变。后续操作应使用返回的新引用，<code>base_id</code> 指向前一版本。类型化客户端会校验 <code>script.content</code> 并处理存储编码。')
            + p('Use <code>artifacts.get({kind, id})</code> when you need a generic reader. Use <code>scripts</code>, <code>storyboards</code> and <code>prompts</code> for typed reads. <code>prompts.get</code> reads a clip\'s video Prompt, for example <code>job.prompt</code>.',
                '需要通用读取入口时使用 <code>artifacts.get({kind, id})</code>；类型化读取使用 <code>scripts</code>、<code>storyboards</code> 和 <code>prompts</code>。<code>prompts.get</code> 读取片段的视频提示词，例如 <code>job.prompt</code>。')
            + p('Returned <code>relationships</code> describe source provenance. The Agent maintains them; customer SDK create/update calls do not accept explicit relationship writes. Pass editable content rather than copying the entire returned record into a write.',
                '返回的 <code>relationships</code> 描述来源关系，由 Agent 维护；客户 SDK 的创建和更新操作不接受直接写入这些关系。写入时传递可编辑内容，不要复制整条返回记录。')),
        section('ads-batches', 'Read final Ads and Batches', '读取成片广告与批次',
            c("const batch = await client.batches.get(batchId);\nconst ads = await client.ads.list({ batch_id: batchId });\nconst ad = await client.ads.get(adId);\nconst video = ad.asset;")
            + p('To have Ads Agent assemble completed video Assets, attach them in the desired order and state the editing requirements in the same Session. This sends a conversation request; progress and the saved Ad arrive through the Agent subscription.',
                '需要 Ads Agent 合成已完成的视频 Asset 时，按顺序附加片段，并在同一个 Session 中说明编辑要求。这会发送一条对话请求；通过 Agent 订阅接收进度和已保存的广告。')
            + ex('request-assembly', "import { Message } from '@nuva/sdk';\nimport type { AgentHandle, Asset } from '@nuva/sdk';")
            + p('Batch and Ad creation are handled by the Agent. To finish work in your own editor, upload the final video and attach it to the same Session with its source clips and editing settings. The Agent registers the Ad and returns its reference. A final-video Asset can belong to only one Ad.',
                '批次和广告由 Agent 创建。若使用自己的编辑器完成制作，请上传成片，并连同来源片段和编辑设置附加到同一个 Session。Agent 注册广告后返回其引用；同一个成片 Asset 只能属于一个 Ad。') + download),
    ]

    generation = [
        section('script', 'Generate a Script from a Product', '根据产品生成脚本',
            p(f'Use these methods for generation buttons in your application. Generation has four steps: a Script (the idea and its exact lines), a <a href="#storyboard">Storyboard</a> (how it is cast and shot, cut into clips), <a href="#prompts">Prompts</a> (each clip compiled for the video model), then one <a href="#video">video Job</a> per Prompt. Start with a saved Product containing its facts and reference images. <a href="{link("store", "products")}">Create the Product first</a> if needed.',
                f'在应用的生成按钮中调用以下方法。生成分四步：脚本（创意及准确台词）、<a href="#storyboard">分镜</a>（选角和拍法，并切分为片段）、<a href="#prompts">提示词</a>（将每个片段编译为视频模型的输入），然后为每条提示词提交一个<a href="#video">视频任务</a>。输入应为已保存事实信息和参考图片的产品；需要时先<a href="{link("store", "products")}">创建产品</a>。')
            + ex('write-script', "import { useEffect, useState } from 'react';\nimport type { NuvaClient, Script, Job, JobState } from '@nuva/sdk';")
            + response('script')
            + p('Pass the Product ID, not a copied set of facts or image URLs. The service reads the authorized Product revision. The response contains a saved Script ID and validated <code>content</code>. Review <code>content.roles</code> and <code>content.panels</code>, the idea and its exact lines, before shooting it.',
                '传入产品 ID，不要重复传入事实和图片地址。服务会读取已授权的产品版本。结果包含已保存的脚本 ID 和经过校验的 <code>content</code>；拍摄前通过 <code>content.roles</code> 和 <code>content.panels</code> 检查创意和台词。')),
        section('revision', 'Revise the Script', '修改脚本',
            ex('revise-script')
            + p('Set <code>base</code> to the Script being revised. The writer receives the original content and returns a new Script. Keep both references when your UI supports comparing revisions.',
                '将待修改脚本的 ID 设为 <code>base</code>。编写服务会读取原内容并返回新脚本。界面需要对比版本时，应保留两个引用。')),
        section('storyboard', 'Shoot the Script as a Storyboard', '将脚本拍成分镜',
            p('A Storyboard says how a Script is shot: who plays each role (<code>cast</code>), one <code>direction</code> for the whole video (look, setting, sound, music, on-screen text), and the <code>clips</code>. Each clip is 5 to 15 seconds and is a list of <code>shots</code> written as text. Each clip becomes one video.',
                '分镜说明脚本如何拍摄：每个角色由谁出演（<code>cast</code>），整条视频统一的 <code>direction</code>（画面风格、场景、声音、音乐、屏幕文字），以及各个片段 <code>clips</code>。每个片段 5 到 15 秒，由若干以文字描述的镜头 <code>shots</code> 组成。每个片段生成一条视频。')
            + ex('write-storyboard', "import type { NuvaClient, Script, Storyboard } from '@nuva/sdk';")
            + response('storyboard')
            + p(f'<code>cast</code> maps Script role IDs to <a href="{link("store", "characters")}">Character</a> IDs. The writer casts the other roles itself: with a Character in <code>cast</code>, or with a described <code>look</code> and <code>voice</code>. A cast entry is <code>{{character?, look?, voice?}}</code>; <code>voice: "character"</code> uses the Character\'s voice recording, and any other text describes the voice. <code>instruction</code> asks for a shooting style.',
                f'<code>cast</code> 将脚本角色 ID 对应到<a href="{link("store", "characters")}">人物</a> ID。其他角色由编写服务自行选角：在 <code>cast</code> 中使用人物，或用文字描述的 <code>look</code> 和 <code>voice</code>。选角项为 <code>{{character?, look?, voice?}}</code>；<code>voice: "character"</code> 使用人物的声音录音，其他文本表示对声音的描述。<code>instruction</code> 用于说明拍摄风格。')
            + p('The service writes the Storyboard, with every clip\'s shots, and saves it. Its default deadline is 300 seconds. The Storyboard is where variety comes from: several Storyboards requested for the same Script, casting and instruction are shot differently from each other (format, setting, camera, pacing, opening shot), also when requested days apart. A revision keeps the treatment of its base. Review and edit a Storyboard before you compile its clips.',
                '服务编写分镜（包括每个片段的镜头）并保存，默认超时为 300 秒。成片的多样性来自分镜：同一脚本、选角和 instruction 的多个分镜会采用不同拍法（形式、场景、镜头、节奏、开场画面），即使相隔几天请求也是如此。修改版沿用 base 的拍法。编译片段前可以先检查和编辑分镜。')
            + p('A Storyboard keeps its Script\'s Batch; pass <code>batch_id</code> only for a Script that has none. A Script saved before Storyboards (<code>format: 2</code>) is rejected; write a new Script first.',
                '分镜沿用脚本所在的 Batch；只有脚本没有 Batch 时才传 <code>batch_id</code>。分镜功能推出前保存的脚本（<code>format: 2</code>）会被拒绝，请先生成新脚本。')
),
        section('tokens', 'Write shots with tokens', '在镜头中使用标记',
            p('Shots name people, Product images and Script lines with tokens. The service works out each clip\'s references from its tokens, so the same person and product images go into every clip that names them.',
                '镜头文字用标记指代人物、产品图片和脚本台词。服务根据每个片段中的标记确定该片段的参考素材，因此提到同一人物或产品图片的每个片段都使用相同素材。')
            + table([t('Token', '标记'), t('Meaning', '含义')], [
                ['<code>{{host}}</code>', t('The role <code>host</code> as cast. With a Character, its default image.', '按选角出演的角色 <code>host</code>。若为人物，使用其默认图片。')],
                ['<code>{{host:&lt;asset id&gt;}}</code>', t('The role, shown with that image of its Character.', '该角色，使用其人物的指定图片。')],
                ['<code>{{product}}</code>', t('The Product, with its default (first) image.', '产品，使用默认（第一张）图片。')],
                ['<code>{{product:&lt;asset id&gt;}}</code>', t('That image of the Product. Asset labels help you and the writer choose.', '产品的指定图片。Asset 的 label 便于你和编写服务选择。')],
                ['<code>{{L01}}</code>', t('Script line <code>L01</code>, spoken by its speaker. With <code>voice: "character"</code>, the clip also gets that Character\'s voice recording.', '脚本台词 <code>L01</code>，由其说话人说出。说话人 <code>voice</code> 为 <code>"character"</code> 时，该片段还会使用人物的声音录音。')],
            ])
            + p('A saved Storyboard passes these checks: every Script role (and the narrator, if there are narrator lines) has one cast entry; clips are numbered <code>C01</code>, <code>C02</code>… in order; every line is placed exactly once, in Script order; an <code>on_camera</code> or <code>dialogue</code> line names its speaker in the same shot; each clip names at least one image and at most 9 images, 3 voice recordings and 12 references in all; the clips add up to the Script\'s <code>duration_ms</code> within 15% (at least 2 seconds). Line tokens belong in shots, not in <code>direction</code>.',
                '保存的分镜需通过以下检查：每个脚本角色（以及有旁白台词时的 narrator）各有一个选角项；片段按顺序编号为 <code>C01</code>、<code>C02</code>…；每句台词按脚本顺序恰好出现一次；<code>on_camera</code> 或 <code>dialogue</code> 台词所在镜头必须提到其说话人；每个片段至少使用一张图片，最多 9 张图片、3 段声音录音、共 12 个参考素材；片段总时长与脚本 <code>duration_ms</code> 相差不超过 15%（至少允许 2 秒）。台词标记只能写在镜头中，不能写在 <code>direction</code> 中。')),
        section('storyboard-edit', 'Revise or edit a Storyboard', '修改与编辑分镜',
            ex('read-storyboard')
            + p('To have the writer change a Storyboard, pass it as <code>base</code> with an <code>instruction</code>. You can also pass <code>cast</code> to recast roles.',
                '需要编写服务修改分镜时，将其作为 <code>base</code> 传入，并提供 <code>instruction</code>。也可以传入 <code>cast</code> 重新选角。')
            + ex('revise-storyboard')
            + p('To save your own edits, pass the complete edited Storyboard as <code>content</code>, with the original as <code>base</code>. Leave out <code>script</code>, <code>cast</code> and <code>instruction</code>. <code>content.script</code> must be the base\'s Script.',
                '保存自己的编辑时，将编辑后的完整分镜作为 <code>content</code> 传入，并将原分镜作为 <code>base</code>。不要传 <code>script</code>、<code>cast</code> 和 <code>instruction</code>。<code>content.script</code> 必须是 base 的脚本。')
            + ex('edit-storyboard')
            + p('Every save creates a new Storyboard version and leaves the base unchanged. Content that fails the checks is rejected with <code>422 REJECTED</code>, and the message lists every problem so they can be fixed together.',
                '每次保存都会创建新的分镜版本，base 保持不变。未通过检查的内容返回 <code>422 REJECTED</code>，错误信息列出全部问题，便于一次修正。')),
        section('prompts', 'Compile clips into Prompts', '将片段编译为提示词',
            ex('generate-prompts', "import type { NuvaClient, Storyboard } from '@nuva/sdk';")
            + response('prompts')
            + p('A Prompt turns one Storyboard clip into what the video model takes: the prompt text and the clip\'s references in order. It only has to fit the Storyboard and the model; the creative choices are made in the Storyboard. <code>prompts.generate({storyboard, clip?, ratio?})</code> returns <code>{prompts}</code> in clip order, one saved Prompt per clip, with <code>data.clip_id</code>. Pass <code>clip</code> (<code>"C01"</code>) to compile one clip. <code>ratio</code> is one of <code>adaptive</code>, <code>21:9</code>, <code>16:9</code>, <code>4:3</code>, <code>1:1</code>, <code>3:4</code>, <code>9:16</code>. The default deadline is 300 seconds.',
                '提示词将一个分镜片段转为视频模型的输入：提示词文本和按顺序排列的参考素材。它只需符合分镜和模型的要求，创意选择在分镜中完成。<code>prompts.generate({storyboard, clip?, ratio?})</code> 按片段顺序返回 <code>{prompts}</code>，每个片段一条已保存的提示词，带有 <code>data.clip_id</code>。只编译一个片段时传入 <code>clip</code>（<code>"C01"</code>）。<code>ratio</code> 可选 <code>adaptive</code>、<code>21:9</code>、<code>16:9</code>、<code>4:3</code>、<code>1:1</code>、<code>3:4</code>、<code>9:16</code>。默认超时为 300 秒。')
            + p('A clip compiled before from the same inputs (its shots, casting, lines, references and ratio) returns its saved Prompt and is not compiled or charged again. In a revised or edited Storyboard, a clip that did not change keeps its base Prompt\'s text.',
                '已用相同输入（镜头、选角、台词、参考素材和画面比例）编译过的片段直接返回已保存的提示词，不会再次编译或计费。修改或编辑后的分镜中，未变化的片段沿用 base 提示词的文本。')
            + p('If some Prompts are saved and a later one fails, the call throws <code>PartialCreationError</code>; <code>saved.prompts</code> holds the Prompts saved so far. Retry the same input with the same <code>idempotencyKey</code> to finish the remaining clips.',
                '如果部分提示词已保存、之后某条失败，调用会抛出 <code>PartialCreationError</code>；<code>saved.prompts</code> 是已保存的提示词。使用相同输入和相同 <code>idempotencyKey</code> 重试即可完成剩余片段。')),
        section('video', 'Submit a video Job and display the result', '提交视频任务并展示结果',
            ex('generate-video')
            + response('job')
            + p('Pass a saved Prompt ID from <code>prompts.generate</code>. The Job renders that Prompt, returned as <code>job.prompt</code>, and joins the Prompt\'s Batch (the Storyboard\'s) unless you pass <code>batch_id</code>. Submit one Job per clip.',
                '传入 <code>prompts.generate</code> 返回的提示词 ID。任务使用该提示词生成视频，并通过 <code>job.prompt</code> 返回；未传 <code>batch_id</code> 时，任务归入该提示词所在的 Batch（即分镜的 Batch）。每个片段提交一个任务。')
            + p('You can instead submit raw prompt text with registered Asset IDs (<code>{input}</code>). The backend creates the Prompt and returns its ID in <code>job.prompt</code>. Use exactly one of <code>prompt</code> or <code>input</code>. Keep <code>requestKey</code> stable for retries; generate a new key for a new video.', '也可以直接传入提示词文本和已注册的素材 ID（<code>{input}</code>）。后端会创建提示词，并通过 <code>job.prompt</code> 返回其 ID。<code>prompt</code> 和 <code>input</code> 只能选一种；重试时保留同一个 <code>requestKey</code>，重新生成视频时使用新请求标识。')
            + ex('generate-video-raw')
            + p('Use a subscription for UI progress. Render <code>job.asset.download_url</code> in a video element after the Job completes. Mount the preview component with <code>key={jobId}</code>.', '界面需要显示进度时使用订阅。任务完成后，将 <code>job.asset.download_url</code> 传给视频元素，并使用 <code>key={jobId}</code> 挂载预览组件。')
            + ex('job-progress')
            + p('For code that needs to wait for the completed Asset, use <code>result()</code> instead of a separate subscription.', '代码需要等待已完成的 Asset 时，使用 <code>result()</code> 即可，无需另外订阅。')
            + ex('wait-video')
            + response('asset')
            + p('Save <code>job.id</code> as soon as submission succeeds. Submission returns before the video is ready. <code>subscribe</code> polls status; <code>result</code> resolves to the registered Asset after completion.',
                '提交成功后立即保存 <code>job.id</code>。接口返回时视频通常尚未完成。<code>subscribe</code> 轮询任务状态；<code>result</code> 在完成后返回已注册的 Asset。')
            + table([t('Job status', '任务状态'), t('Action', '处理方式')], [
                ['<code>queued / running</code>', t('Show progress and retain the Job ID.', '展示进度并保留任务 ID。')],
                ['<code>completed</code>', t('Display the returned Asset.', '展示返回的 Asset。')],
                ['<code>failed / cancelled</code>', t('Show the result or error; a new generation is a separate request.', '展示状态或错误；重新生成属于新的请求。')],
            ])
            + p('A timeout or AbortSignal stops waiting locally, not the Job. Resume reading with <code>client.jobs.get(jobId)</code> or <code>client.jobs.subscribe(jobId, listener)</code>. Ask the Agent for best-effort cancellation.',
                '超时或 AbortSignal 只停止本地等待，不会停止任务。可使用 <code>client.jobs.get(jobId)</code> 或 <code>client.jobs.subscribe(jobId, listener)</code> 继续查询。需要取消时请让 Agent 尝试执行。')),
        section('skill', 'Set the output language and creative direction', '指定输出语言与创意方向',
            c("const script = await client.scripts.generate({\n  product: productId,\n  acceptable_duration_ms: { min: 8000, max: 15000 },\n  instruction: 'Write in English. Keep the supplied product facts.',\n});")
            + p('Nuva selects the writing guidance (Skills) configured for your account; a request does not name one. Use <code>instruction</code> for a requested output language or creative change; <code>storyboards.generate</code> takes it the same way for the shooting style. Product and brand names, approved dialogue, and saved source facts remain tied to their sources. A Storyboard speaks the Script\'s lines word for word; to change a line, revise the Script.',
                'Nuva 使用为你的账户配置的编写指导（Skill），请求中不指定 Skill。使用 <code>instruction</code> 指定输出语言或创意修改；<code>storyboards.generate</code> 以同样方式用它说明拍摄风格。产品和品牌名称、已确认对白及已保存事实仍以来源内容为准。分镜逐字使用脚本台词；需要修改台词时请修改脚本。')),
        section('retry', 'Retry the same submission', '重试同一次提交',
            ex('idempotency')
            + p('Create this object once per deliberate generation. Retrying <code>submit()</code> reuses the same input and operation key. Persist both if retries must survive a page reload. Create a new object for a deliberate regeneration, even when the input is unchanged.',
                '每次明确发起新的生成时创建此对象。重试 <code>submit()</code> 会复用相同输入和操作 key。需要跨页面刷新重试时，将两者一并持久化。即使输入不变，主动重新生成也应创建新对象。')
            + p('The SDK does not automatically replay a write with unknown acceptance. See <a href="' + link('reference', 'errors') + '">errors and retry behavior</a>.',
                'SDK 不会自动重放接受状态不明的写入。参见<a href="' + link('reference', 'errors') + '">错误与重试行为</a>。')
            + p('Download the <a href="examples/creation-chain.ts">complete Product-to-clips example</a>. Keep its caller-owned progress object and implement saveProgress in your application. createProductVideo starts a new flow once and records accepted resources, the Storyboard and Prompt operation keys and the video operation keys; submitPendingVideos explicitly resumes saved submissions; waitForProductVideos resumes reads without submitting new Jobs. For interrupted preparation, inspect the retained IDs and SDK error details before deciding the next operation.',
                '下载<a href="examples/creation-chain.ts">从产品到视频片段的完整示例</a>。保留由调用方持有的 progress 对象，并在应用中实现 saveProgress。createProductVideo 只启动一次新流程并记录已接受的资源、分镜和提示词的操作 key 及视频操作 key；submitPendingVideos 用于主动恢复已保存的提交；waitForProductVideos 只恢复查询，不创建新任务。准备阶段中断时，先检查保留的 ID 和 SDK 错误详情，再决定下一项操作。')),
    ]

    reference = [
        section('client', 'Client and Sessions', '客户端与 Session',
            table([t('Method', '方法'), t('Behavior', '行为')], [
                ['<code>createNuva({getAccessToken})</code>', t('Create a user-scoped client.', '创建以用户为范围的客户端。')],
                ['<code>client.sessions.create({title})</code>', t('Create a Session.', '创建 Session。')],
                ['<code>client.sessions.get(id) / list({limit, cursor})</code>', t('Read accessible Sessions.', '读取有权访问的 Session。')],
                ['<code>client.sessions.history(id, {limit, cursor})</code>', t('Read saved messages without opening a live handle.', '读取已保存消息，无需打开实时 handle。')],
                ['<code>client.agent({sessionId})</code>', t('Bind chat operations to one Session.', '将对话操作绑定到一个 Session。')],
                ['<code>client.close()</code>', t('Release local connections on logout or account change.', '退出或切换账号时释放本地连接。')],
            ])),
        section('agent', 'Agent methods', 'Agent 方法',
            table([t('Method', '方法'), t('Result or effect', '返回结果或效果')], [
                ['<code>send(message)</code>', t('A receipt for accepted input. Replies arrive through subscribe.', '已接受输入的回执；回复通过 subscribe 返回。')],
                ['<code>subscribe(listener)</code>', t('Current state and updates; returns an unsubscribe function.', '当前状态及后续更新；返回取消订阅函数。')],
                ['<code>stop()</code>', t('Stop the current loop; preserve submitted Jobs.', '停止当前循环，保留已提交任务。')],
                ['<code>respond(call, output) / fail(call, failure)</code>', t('Answer a pending client tool. The Ads Agent declares none today.', '答复待处理的客户端工具。Ads Agent 目前未声明任何客户端工具。')],
                ['<code>onClientTool(listener) / onHostCall(listener)</code>', t('Observe client tools and host calls. These never fire while the Ads Agent declares none.', '接收客户端工具和宿主调用。Ads Agent 未声明时不会触发。')],
                ['<code>refresh() / loadEarlierMessages()</code>', t('Resynchronize or page history without resending input.', '重新同步或加载历史，不重发输入。')],
                ['<code>listPendingCalls() / getHostCall(id)</code>', t('Read stored client-tool and host-call records. Both are empty for the Ads Agent today.', '读取已保存的客户端工具和宿主调用记录。Ads Agent 目前均为空。')],
            ])),
        section('resources', 'Resource and generation methods', '资源与生成方法',
            table([t('Module', '模块'), t('Methods', '方法')], [
                ['<code>products / brands / characters</code>', '<code>create / get / list / update</code>'],
                ['<code>products</code>', '<code>uploadImage({base, file})</code>'],
                ['<code>assets</code>', '<code>upload / uploadIntent / register / get</code>'],
                ['<code>artifacts</code>', '<code>get / create / update / forSchema</code>'],
                ['<code>scripts</code>', '<code>get / create / update / generate</code>'],
                ['<code>storyboards</code>', '<code>get / generate</code>'],
                ['<code>prompts</code>', t('<code>get / generate</code>; <code>create / update</code> (advanced)', '<code>get / generate</code>；<code>create / update</code>（高级用法）')],
                ['<code>videos</code>', '<code>generate</code>'],
                ['<code>jobs</code>', '<code>get / subscribe</code>'],
                ['<code>ads / batches</code>', '<code>get / list</code>'],
                ['<code>skills</code>', '<code>get / list / version</code>'],
            ])
            + p('Use the input and output types shipped with each method. IDs identify resources; a resource\'s <code>label</code> is for display only. An Asset\'s <code>label</code> is what its uploader said it shows, or null. Profile updates use an existing <code>base</code>, while Artifact updates create a new resource version.',
                '按各方法提供的输入输出类型调用。资源以 ID 标识，资源的 <code>label</code> 仅用于展示。Asset 的 <code>label</code> 是上传者对文件内容的说明，可能为 null。实体更新使用现有 <code>base</code>；产物更新会创建新版本。')),
        section('errors', 'Handle errors and uncertain writes', '处理错误与不确定的写入',
            ex('errors', "import { NuvaError, type NuvaClient } from '@nuva/sdk';")
            + table([t('Error', '错误'), t('Handling', '处理方式')], [
                ['<code>UNAUTHENTICATED / FORBIDDEN</code>', t('Check login and resource access.', '检查登录状态和资源权限。')],
                ['<code>REVISION_CONFLICT</code>', t('Retain edits and compare with the latest record.', '保留编辑并与最新记录对比。')],
                ['<code>CALL_ALREADY_RESOLVED / CALL_OBSOLETE</code>', t('Read current interaction state.', '读取当前交互状态。')],
                ['<code>PARTIAL_CREATION</code>', t('Some clip Prompts were saved but not all. Retain saved.prompts, then retry with the same operation key.', '部分片段提示词已保存，但并非全部。保留 saved.prompts，再使用相同操作 key 重试。')],
                ['<code>REJECTED</code>', t('The service refused the input, for example a Storyboard that fails its checks. The message lists the problems.', '服务拒绝了输入，例如分镜未通过检查。错误信息列出具体问题。')],
                ['<code>IDEMPOTENCY_CONFLICT</code>', t('The key belongs to different input. Use the original input for recovery, or a new key for new work.', '该 key 已绑定不同输入。恢复时使用原输入；新任务使用新 key。')],
                ['<code>acceptance: "unknown"</code>', t('Inspect the resource or recover with the saved operation key before issuing another write.', '再次写入前先检查资源，或使用已保存的操作 key 恢复。')],
            ])
            + p('<code>requestId</code> correlates a request; it is not a durable idempotency key. A duplicate chat send may repeat work. The SDK only retries a write after authentication refresh when the backend explicitly reports <code>acceptance: "not_accepted"</code>. Timeouts and lost responses do not establish that a write failed.',
                '<code>requestId</code> 用于关联请求，不是持久化幂等 key。重复发送聊天消息可能重复执行工作。仅当后端明确返回 <code>acceptance: "not_accepted"</code> 时，SDK 才会在刷新认证后重试写入。超时或响应丢失不代表写入失败。')),
        section('options', 'Client options', '客户端选项',
            table([t('Option', '选项'), t('Use', '用途')], [
                ['<code>getAccessToken</code>', t('Application-provided callback returning {token, expiresAt}; the SDK calls it for authentication and refresh.', '由应用实现的回调，返回 {token, expiresAt}；SDK 在认证和刷新时调用。')],
                ['<code>environment</code>', t('sandbox (default, staging) or production. Selects the paired Agent and API addresses.', 'sandbox（默认值，对应 staging）或 production，选择配套的 Agent 和 API 地址。')],
                ['<code>baseUrl / storeBaseUrl / generationBaseUrl</code>', t('Override service addresses for another environment.', '为其他环境覆盖服务地址。')],
                ['<code>requestTimeoutMs</code>', t('Override per-request deadlines. storyboards.generate and prompts.generate default to 300 seconds; scripts.generate, assets.register and file-byte uploads to 180 seconds. All other requests, including Script create/update, upload-intent creation and video submission, default to 8 seconds. job.result({timeoutMs}) separately bounds completion waiting.', '覆盖单次请求超时。storyboards.generate 和 prompts.generate 默认 300 秒；scripts.generate、assets.register 和文件字节上传默认 180 秒。其他请求（包括脚本创建与更新、上传意图创建和视频任务提交）默认 8 秒。job.result({timeoutMs}) 另行控制等待任务完成的时长。')],
                ['<code>jobPollIntervalMs</code>', t('Set the interval between Job status polls.', '设置任务状态轮询间隔。')],
                ['<code>tokenRefreshSkewMs</code>', t('Set how early expiry-aware tokens refresh.', '设置令牌在过期前多久刷新。')],
                ['<code>onTrace / onWireTrace</code>', t('Inspect SDK diagnostics. Redact credentials and private content before retaining or sharing traces.', '查看 SDK 诊断信息。保存或分享前应去除凭证和私有内容。')],
            ])),
        section('versions', 'Versions and stored content', '版本与存储内容',
            table([t('Value', '值'), t('Meaning', '含义')], [
                ['<code>0.1.0-preview.4</code>', t('SDK package version.', 'SDK 包版本。')],
                ['<code>/v1/…</code>', t('Public HTTP API version.', '公开 HTTP API 版本。')],
                ['<code>version: 1</code>', t('Agent message-envelope protocol revision; omission also means v1.', 'Agent 消息封装协议版本；省略时同样按 v1 处理。')],
                ['<code>schema_version: 1</code>', t('Current backend Artifact schema.', '当前后端产物 schema。')],
                ['<code>script.format: 3</code>', t('Script content in script.content (stored as nuva.script version 3).', '通过 script.content 返回的脚本内容（存储为 nuva.script 版本 3）。')],
                ['<code>script.format: 2</code>', t('A read-only ScriptPackage saved before Storyboards, in script.legacy.', '分镜功能推出前保存的只读 ScriptPackage，位于 script.legacy。')],
                ['<code>nuva.storyboard version 1</code>', t('Storyboard content in storyboard.content.', '通过 storyboard.content 返回的分镜内容。')],
            ])
            + p('Use the typed Script and Storyboard clients to validate content. When using a generic Artifact reader, inspect its kind and schema version before interpreting its data.',
                '使用类型化的 Script 和 Storyboard 客户端校验内容。使用通用产物读取接口时，先检查 kind 和 schema 版本，再解释 data。')),
    ]
    return {'frontend': start, 'agent': agent, 'store': resources, 'generation': generation, 'reference': reference}
