"""Customer-facing reference generated from checked SDK examples."""
from html import escape
import json
from pathlib import Path
import re
from textwrap import dedent
from build import table
from customer_layout import code
from customer_layout import filename


def message_example():
    return {
        'ref': {'sessionId': '11111111-1111-4111-8111-111111111111', 'messageId': '22222222-2222-4222-8222-222222222222'},
        'role': 'assistant', 'state': 'complete', 'createdAt': '2026-10-26T12:00:00.000Z',
        'content': [
            {'id': 'text_1', 'type': 'text', 'format': 'markdown', 'text': 'The Script is saved and ready for review.'},
            {'id': 'result_1', 'type': 'resource', 'record': {
                'ref': {'kind': 'script', 'id': '33333333-3333-4333-8333-333333333333'}, 'label': 'Script 1'}},
            {'type': 'dynamic-tool', 'toolName': 'nuva.review', 'toolCallId': 'call_17',
             'state': 'input-available', 'input': {'prompt': 'Approve this Script or describe the changes.',
             'targets': [{'kind': 'script', 'id': '33333333-3333-4333-8333-333333333333'}]}}
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
    return code(snippet, 'go' if source.endswith('.go') else 'tsx', locale)


def guide_pages(locale='zh'):
    t = lambda en, zh: zh if locale == 'zh' else en
    p = lambda en, zh: '<p>' + t(en, zh) + '</p>'
    ex = lambda key, prelude='': source_example(key, locale, prelude)
    c = lambda text, language='ts': code(text, language, locale)
    link = lambda page, anchor='': filename(page, locale) + ('#' + anchor if anchor else '')
    section = lambda key, en, zh, body: (key, t(en, zh), body)
    download = p('Download the <a href="examples/guide.tsx">complete TypeScript example</a>.', '下载<a href="examples/guide.tsx">完整 TypeScript 示例</a>。')

    start = [
        section('install', '1. Install', '1. 安装',
            p('Install the SDK archive supplied with your integration.', '安装随接入资料提供的 SDK 压缩包。')
            + c('pnpm add /path/to/nuva-sdk-0.1.0-preview.1.tgz', 'sh')),
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
                [t('Call Script, Prompt and video generation from your own buttons.', '通过自己的按钮调用脚本、提示词和视频生成。'), f'<a href="{link("generation")}">{t("Generate content", "生成内容")}</a>'],
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
            + table([t('State', '状态'), t('Display / behavior', '展示与行为')], [
                ['<code>loading</code>', t('Wait for the initial Session state.', '等待首次加载 Session。')],
                ['<code>idle</code>', t('Allow a new user message.', '允许发送新消息。')],
                ['<code>running</code>', t('Render streamed updates. Keep a new draft until this loop finishes.', '展示流式更新；当前循环结束前保留新的草稿。')],
                ['<code>waiting_for_response</code>', t('Show the pending interaction and submit its response.', '展示待答交互并提交答复。')],
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
            + p(f'Load Scripts with <code>client.scripts.get(record.ref)</code> and Products with <code>client.products.get(record.ref.id)</code>. See <a href="{link("store", "artifacts")}">artifact reads</a>.',
                f'使用 <code>client.scripts.get(record.ref)</code> 读取脚本，使用 <code>client.products.get(record.ref.id)</code> 读取产品。参见<a href="{link("store", "artifacts")}">产物读取</a>。')),
        section('interactions', 'Answer a pending request', '回答待答请求',
            p('A <code>dynamic-tool</code> part with <code>state: "input-available"</code> needs a user or application response. Render the registered input and submit output matching that tool’s schema. For the built-in <code>nuva.review</code> request:',
                '状态为 <code>input-available</code> 的 <code>dynamic-tool</code> 内容需要用户或应用答复。展示已注册的输入，并按该工具的 schema 提交输出。以内置 <code>nuva.review</code> 为例：')
            + ex('review')
            + p('Retain the original call object when responding. Disable its controls while submitting. For <code>CALL_ALREADY_RESOLVED</code> or <code>CALL_OBSOLETE</code>, refresh the Session state instead of submitting another answer. Use <code>agent.fail(call, failure)</code> when the application cannot obtain a result, not when the user rejects a review.',
                '答复时保留原始 call 对象，提交期间禁用对应控件。收到 <code>CALL_ALREADY_RESOLVED</code> 或 <code>CALL_OBSOLETE</code> 时刷新 Session 状态，不要再提交另一份答复。应用无法取得结果时使用 <code>agent.fail(call, failure)</code>；用户否决审核不属于这种失败。')
            + p('Use <code>agent.listPendingCalls()</code> to read pending requests after reopening a Session. <code>agent.onClientTool()</code> subscribes to their updates.',
                '重新打开 Session 后，使用 <code>agent.listPendingCalls()</code> 读取待答请求，使用 <code>agent.onClientTool()</code> 订阅其更新。')),
        section('host-actions', 'Handle application actions', '处理应用操作',
            p('Subscribe to <code>onHostCall</code> for UI actions that do not require a reply. Handle only actions your application supports. This example assumes your registered Skill declares <code>workspace.openEditor</code> with an <code>assetId</code> input.',
                '通过 <code>onHostCall</code> 接收不需要回传结果的界面操作。只处理应用支持的操作。下例假设已注册的 Skill 声明了 <code>workspace.openEditor</code>，输入包含 <code>assetId</code>。')
            + ex('host-action')
            + p('Do not call <code>respond()</code> for these notifications. Implement <code>openEditor</code> in your application.',
                '此类通知不需要调用 <code>respond()</code>。<code>openEditor</code> 由你的应用实现。')),
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
                '继续请求分页，直到 <code>nextCursor</code> 为 null。品牌和角色也使用 get/list/create/update 操作。')
            + ex('update-product')
            + p('Pass the record you read as <code>base</code>. Its <code>id</code> remains stable after an edit; <code>version</code> increments and <code>revision</code> identifies the saved revision. On <code>REVISION_CONFLICT</code>, keep the user’s edit, read the current record, and ask the user how to reconcile it.',
                '将读取到的记录传入 <code>base</code>。编辑后 <code>id</code> 保持不变，<code>version</code> 递增，<code>revision</code> 标识此次保存的版本。发生 <code>REVISION_CONFLICT</code> 时保留用户编辑，读取当前记录，再由用户决定如何合并。')),
        section('media', 'Upload and display media', '上传与展示媒体',
            c("const asset = await client.assets.upload(file, { kind: 'video' });\n\n// Fetch a fresh URL when reopening saved media.\nconst current = await client.assets.get(asset.id);")
            + c('<video src={current.download_url} controls preload="metadata" />', 'tsx')
            + p('Store the Asset ID, not its download URL. Download URLs expire; read the Asset again for fresh access. For shared Products and Ads, use their authorized <code>assets</code> sidecars when direct Asset reads are not permitted.',
                '保存 Asset ID，不要把下载地址当作永久标识。下载地址会过期，应重新读取 Asset 获取有效地址。共享产品或广告不允许直接读取 Asset 时，使用其返回的已授权 <code>assets</code> 附带资源。')
            + ex('upload-error')
            + p('A Product image upload can succeed before the Product update fails. Retain <code>ProductImageUploadError.asset</code>; avoid uploading the same file again just to retry attachment.',
                '产品图片可能已上传成功，但随后更新产品失败。保留 <code>ProductImageUploadError.asset</code>，不要仅为重试附加而再次上传同一文件。')),
        section('artifacts', 'Read and edit Scripts and Prompts', '读取与编辑脚本和提示词',
            ex('read-script') + ex('save-script')
            + p('An Artifact update returns a new ID and leaves the original intact. Use the returned reference for later operations. <code>base_id</code> points to the previous version. Use <code>script.content</code> for structured Script content; the typed client handles its stored encoding.',
                '更新产物会返回新 ID，原记录保持不变。后续操作应使用返回的新引用，<code>base_id</code> 指向前一版本。结构化脚本使用 <code>script.content</code>；存储编码由类型化客户端处理。')
            + c("const prompt = await client.prompts.get({ kind: 'prompt', id: promptId });\nconst text = prompt.data.prompt;\nconst referenceImages = prompt.data.image_asset_ids;")
            + p('Use <code>artifacts.get({kind, id})</code> when you need a generic reader. Use <code>scripts</code> and <code>prompts</code> for typed reads and writes.',
                '需要通用读取入口时使用 <code>artifacts.get({kind, id})</code>；需要类型化读写时使用 <code>scripts</code> 和 <code>prompts</code>。')),
        section('ads-batches', 'Read final Ads and Batches', '读取成片广告与批次',
            c("const batch = await client.batches.get(batchId);\nconst ads = await client.ads.list({ batch_id: batchId });\nconst ad = await client.ads.get(adId);\nconst video = ad.asset;")
            + p('Batch and Ad creation are handled by the Agent. To finish work in your own editor, upload the final video and attach it to the same Session with its source clips and editing settings. The Agent registers the Ad and returns its reference. A final-video Asset can belong to only one Ad.',
                '批次和广告由 Agent 创建。若使用自己的编辑器完成制作，请上传成片，并连同来源片段和编辑设置附加到同一个 Session。Agent 注册广告后返回其引用；同一个成片 Asset 只能属于一个 Ad。') + download),
    ]

    generation = [
        section('script', 'Generate a Script from a Product', '根据产品生成脚本',
            p(f'Use these methods for generation buttons in your application. Start with a saved Product containing its facts and reference images. <a href="{link("store", "products")}">Create the Product first</a> if needed.',
                f'在应用的生成按钮中调用以下方法。输入应为已保存事实信息和参考图片的产品；需要时先<a href="{link("store", "products")}">创建产品</a>。')
            + ex('write-script', "import { useEffect, useState } from 'react';\nimport type { NuvaClient, Script, Job, JobState } from '@nuva/sdk';")
            + p('Pass the Product ID, not a copied set of facts or image URLs. The service reads the authorized Product revision. The response contains a saved Script ID and validated <code>content</code>. Read <code>content.clips</code> to review the proposed clips.',
                '传入产品 ID，不要重复传入事实和图片地址。服务会读取已授权的产品版本。结果包含已保存的脚本 ID 和经过校验的 <code>content</code>；通过 <code>content.clips</code> 查看规划的片段。')),
        section('revision', 'Revise the Script', '修改脚本',
            ex('revise-script')
            + p('Set <code>base</code> to the Script being revised. The writer receives the original content and returns a new Script. Keep both references when your UI supports comparing revisions.',
                '将待修改脚本的 ID 设为 <code>base</code>。编写服务会读取原内容并返回新脚本。界面需要对比版本时，应保留两个引用。')),
        section('prompts', 'Generate clip Prompts', '生成片段提示词',
            ex('write-prompts')
            + p('The response is <code>{prompts}</code> in clip order. Each Prompt is saved independently and contains its generation text in <code>data.prompt</code>. Each clip currently requires at least one authorized reference image. Review the returned text and settings before submitting video generation.',
                '结果为按片段顺序排列的 <code>{prompts}</code>。每条提示词单独保存，生成文本位于 <code>data.prompt</code>。目前每个片段至少需要一张已授权参考图片。提交视频生成前，检查返回的文本和设置。')
            + p('If creation stops partway through, <code>PartialCreationError.saved.prompts</code> contains the already saved Prompts. Keep them and inspect the failure before retrying.',
                '如果生成流程中途失败，<code>PartialCreationError.saved.prompts</code> 包含已保存的提示词。保留这些结果，并在重试前检查失败原因。')),
        section('video', 'Submit a video Job and display the result', '提交视频任务并展示结果',
            ex('generate-video')
            + p('Use a subscription for UI progress. Render <code>job.asset.download_url</code> in a video element after the Job completes. Mount the preview component with <code>key={jobId}</code>.', '界面需要显示进度时使用订阅。任务完成后，将 <code>job.asset.download_url</code> 传给视频元素，并使用 <code>key={jobId}</code> 挂载预览组件。')
            + ex('job-progress')
            + p('For code that needs to wait for the completed Asset, use <code>result()</code> instead of a separate subscription.', '代码需要等待已完成的 Asset 时，使用 <code>result()</code> 即可，无需另外订阅。')
            + ex('wait-video')
            + p('Save <code>job.id</code> as soon as submission succeeds. Submission returns before the video is ready. <code>subscribe</code> polls status; <code>result</code> resolves to the registered Asset after completion.',
                '提交成功后立即保存 <code>job.id</code>。接口返回时视频通常尚未完成。<code>subscribe</code> 轮询任务状态；<code>result</code> 在完成后返回已注册的 Asset。')
            + table([t('Job status', '任务状态'), t('Action', '处理方式')], [
                ['<code>queued / running</code>', t('Show progress and retain the Job ID.', '展示进度并保留任务 ID。')],
                ['<code>completed</code>', t('Display the returned Asset.', '展示返回的 Asset。')],
                ['<code>failed / cancelled</code>', t('Show the result or error; a new generation is a separate request.', '展示状态或错误；重新生成属于新的请求。')],
            ])
            + p('A timeout or AbortSignal stops waiting locally, not the Job. Resume reading with <code>client.jobs.get(jobId)</code> or <code>client.jobs.subscribe(jobId, listener)</code>. Ask the Agent for best-effort cancellation.',
                '超时或 AbortSignal 只停止本地等待，不会停止任务。可使用 <code>client.jobs.get(jobId)</code> 或 <code>client.jobs.subscribe(jobId, listener)</code> 继续查询。需要取消时请让 Agent 尝试执行。')),
        section('skill', 'Select writing guidance and output language', '选择编写指导与输出语言',
            c("const script = await client.scripts.generate({\n  product: productId,\n  acceptable_duration_ms: { min: 8000, max: 15000 },\n  skill: { id: skillId, version: 2 },\n  instruction: 'Write in English. Keep the supplied product facts.',\n});")
            + p('Omit <code>skill</code> to use the configured default. Select an authorized Skill ID and optional version when you need specific guidance. Use <code>instruction</code> for a requested output language or creative change. Product and brand names, approved dialogue, and saved source facts remain tied to their sources.',
                '省略 <code>skill</code> 时使用已配置的默认 Skill。需要指定指导时，选择已授权的 Skill ID，并按需指定版本。使用 <code>instruction</code> 指定输出语言或创意修改。产品和品牌名称、已确认对白及已保存事实仍以来源内容为准。')),
        section('retry', 'Retry the same submission', '重试同一次提交',
            ex('idempotency')
            + p('Create this object once per deliberate generation. Retrying <code>submit()</code> reuses the same input and operation key. Persist both if retries must survive a page reload. Create a new object for a deliberate regeneration, even when the Prompt is unchanged.',
                '每次明确发起新的生成时创建此对象。重试 <code>submit()</code> 会复用相同输入和操作 key。需要跨页面刷新重试时，将两者一并持久化。即使提示词不变，主动重新生成也应创建新对象。')
            + p('The SDK does not automatically replay a write with unknown acceptance. See <a href="' + link('reference', 'errors') + '">errors and retry behavior</a>.',
                'SDK 不会自动重放接受状态不明的写入。参见<a href="' + link('reference', 'errors') + '">错误与重试行为</a>。')
            + p('Download the <a href="examples/creation-chain.ts">complete Product-to-clips example</a>.', '下载<a href="examples/creation-chain.ts">从产品到视频片段的完整示例</a>。')),
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
                ['<code>respond(call, output) / fail(call, failure)</code>', t('Resolve a registered pending client interaction.', '处理已注册的待答客户端交互。')],
                ['<code>onClientTool(listener) / onHostCall(listener)</code>', t('Observe interactions requiring replies or response-free UI actions.', '接收需要答复的交互或无需答复的 UI 操作。')],
                ['<code>refresh() / loadEarlierMessages()</code>', t('Resynchronize or page history without resending input.', '重新同步或加载历史，不重发输入。')],
                ['<code>listPendingCalls() / getHostCall(id)</code>', t('Read stored interaction records.', '读取已保存的交互记录。')],
            ])),
        section('resources', 'Resource and generation methods', '资源与生成方法',
            table([t('Module', '模块'), t('Methods', '方法')], [
                ['<code>products / brands / characters</code>', '<code>create / get / list / update</code>'],
                ['<code>products</code>', '<code>uploadImage({base, file})</code>'],
                ['<code>assets</code>', '<code>upload / uploadIntent / register / get</code>'],
                ['<code>artifacts</code>', '<code>get / create / update / forSchema</code>'],
                ['<code>scripts / prompts</code>', '<code>get / create / update / generate</code>'],
                ['<code>videos</code>', '<code>generate</code>'],
                ['<code>jobs</code>', '<code>get / subscribe</code>'],
                ['<code>ads / batches</code>', '<code>get / list</code>'],
                ['<code>skills</code>', '<code>get / list / version</code>'],
            ])
            + p('Use the input and output types shipped with each method. IDs identify resources; labels are presentation only. Profile updates use an existing <code>base</code>, while Artifact updates create a new resource version.',
                '按各方法提供的输入输出类型调用。资源以 ID 标识，label 仅用于展示。实体更新使用现有 <code>base</code>；产物更新会创建新版本。')),
        section('errors', 'Handle errors and uncertain writes', '处理错误与不确定的写入',
            ex('errors', "import { NuvaError, type NuvaClient } from '@nuva/sdk';")
            + table([t('Error', '错误'), t('Handling', '处理方式')], [
                ['<code>UNAUTHENTICATED / FORBIDDEN</code>', t('Check login and resource access.', '检查登录状态和资源权限。')],
                ['<code>REVISION_CONFLICT</code>', t('Retain edits and compare with the latest record.', '保留编辑并与最新记录对比。')],
                ['<code>CALL_ALREADY_RESOLVED / CALL_OBSOLETE</code>', t('Read current interaction state.', '读取当前交互状态。')],
                ['<code>PARTIAL_CREATION</code>', t('Retain saved.prompts and inspect the unfinished work.', '保留 saved.prompts 并检查尚未完成的部分。')],
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
                ['<code>requestTimeoutMs</code>', t('Set the client request timeout.', '设置客户端请求超时。')],
                ['<code>jobPollIntervalMs</code>', t('Set the interval between Job status polls.', '设置任务状态轮询间隔。')],
                ['<code>tokenRefreshSkewMs</code>', t('Set how early expiry-aware tokens refresh.', '设置令牌在过期前多久刷新。')],
                ['<code>onTrace / onWireTrace</code>', t('Inspect SDK diagnostics. Redact credentials and private content before retaining or sharing traces.', '查看 SDK 诊断信息。保存或分享前应去除凭证和私有内容。')],
            ])),
        section('versions', 'Versions and stored content', '版本与存储内容',
            table([t('Value', '值'), t('Meaning', '含义')], [
                ['<code>0.1.0-preview.1</code>', t('SDK package version.', 'SDK 包版本。')],
                ['<code>schema_version: 1</code>', t('Current backend Artifact schema.', '当前后端产物 schema。')],
                ['<code>ScriptPackage schema_version: 2</code>', t('Structured Script content exposed as script.content.', '通过 script.content 返回的结构化脚本格式。')],
            ])
            + p('Use typed Script and Prompt clients to validate content. When using a generic Artifact reader, inspect its kind and schema version before interpreting its data.',
                '使用类型化的 Script 和 Prompt 客户端校验内容。使用通用产物读取接口时，先检查 kind 和 schema 版本，再解释 data。')),
    ]
    return {'frontend': start, 'agent': agent, 'store': resources, 'generation': generation, 'reference': reference}
