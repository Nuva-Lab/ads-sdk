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
    # A page's opening, before its first section.
    lead = lambda body: ('', '', body)
    download = p('Download the <a href="examples/guide.tsx">complete TypeScript example</a>.', '下载<a href="examples/guide.tsx">完整 TypeScript 示例</a>。')

    start = [
        section('install', '1. Install', '1. 安装',
            p('Install the SDK archive supplied with your integration.', '安装随接入资料提供的 SDK 压缩包。')
            + c('pnpm add /path/to/nuva-sdk-0.1.0-preview.4.tgz', 'sh')),
        section('authentication', '2. Provide a user token', '2. 提供用户令牌',
            p('Expose <code>POST /api/ads/token</code> in your application backend. Authenticate the application user and return their Ads user token and expiry. Keep the customer Admin API key on your backend.',
              '在应用后端提供 <code>POST /api/ads/token</code>。验证应用用户身份后，返回该用户的 Ads 用户令牌和过期时间。客户 Admin API key 仅保存在后端。')
            + c('{\n  "token": "USER_ACCESS_TOKEN",\n  "expiresAt": "2026-10-26T19:00:00Z"\n}', 'json')
            + p(f'Implement this route with the <a href="{link("backend-go", "tokens")}">Go Admin SDK</a>.',
                f'使用 <a href="{link("backend-go", "tokens")}">Go Admin SDK</a> 实现此接口。')
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
        section('first-request', '4. Start a conversation', '4. 开始对话',
            p('Call <code>sessions.create</code> when the user starts a conversation. Save the returned Session ID so the user can reopen it later.',
                '用户开始对话时调用 <code>sessions.create</code>。保存返回的 Session ID，供以后重新打开。')
            + ex('first-session')
            + p(f'Continue with <a href="{link("agent", "session")}">Agent conversations</a> to subscribe, send a message and show the reply; the complete example\'s <code>AdsConversationApp</code> connects these components. <a href="{link("store")}">Products and media</a> covers what the Agent works from, and <a href="{link("generation")}">Content generation</a> the steps it runs, for your own buttons.',
                f'接着按 <a href="{link("agent", "session")}">Agent 对话</a>接入状态订阅、消息发送和回复展示；完整示例中的 <code>AdsConversationApp</code> 已连接这些组件。<a href="{link("store")}">产品与媒体</a>介绍 Agent 所用的素材，<a href="{link("generation")}">内容生成</a>介绍它执行的各个步骤，可用于你自己的按钮。') + download),
    ]

    agent = [
        section('session', 'Open a Session and subscribe', '打开 Session 并订阅状态',
            p('The Agent creates from a conversation: it writes the Script, shoots the Storyboard, renders the clips and assembles the Ad, and saves each result. Your application shows the conversation and what the Agent saved.',
                'Agent 通过对话进行创作：编写脚本、拍成分镜、渲染片段并合成广告，并保存每个结果。你的应用负责展示对话和 Agent 保存的内容。')
            + p(f'Use the client from <a href="{link("frontend", "client")}">setup</a> and a saved Session ID. The subscription receives the current state immediately and subsequent updates as the Agent works.',
                f'使用<a href="{link("frontend", "client")}">接入步骤</a>中创建的客户端和已保存的 Session ID。订阅会立即返回当前状态，并在 Agent 工作过程中继续推送更新。')
            + ex('subscribe', "import { useEffect, useMemo, useState, type FormEvent } from 'react';\nimport { Message, type NuvaClient, type AgentHandle, type AgentState } from '@nuva/sdk';")
            + p('Mount the conversation component with <code>key={sessionId}</code>. Unsubscribing stops local updates; it does not stop server work.',
                '使用 <code>key={sessionId}</code> 挂载对话组件。取消订阅只停止本地状态更新，不会停止服务端工作。')
            + p('After initial loading, a synchronization error can appear in <code>state.error</code> while the last known status and messages remain available. Show it beside the conversation, keep the draft, and offer a refresh once the connection or sign-in is back. Render a failed message\'s error without discarding its partial content.',
                '首次加载后，同步错误可能出现在 <code>state.error</code> 中，同时保留上次已知的状态和消息。应在对话旁显示错误并保留草稿，网络或登录恢复后提供刷新。失败的消息应显示其错误，并保留已生成的部分内容。')
            + table([t('State', '状态'), t('Display / behavior', '展示与行为')], [
                ['<code>loading</code>', t('Wait for the initial Session state.', '等待首次加载 Session。')],
                ['<code>idle</code>', t('Allow a new user message.', '允许发送新消息。')],
                ['<code>running</code>', t('Render streamed updates. A new message can still be sent: it joins the Agent\'s work.', '展示流式更新；仍可发送新消息，它会加入 Agent 当前的工作。')],
                ['<code>error</code>', t('Show the synchronization error and retain the draft.', '展示同步错误并保留草稿。')],
            ])),
        section('send', 'Send a message', '发送消息',
            p('Keep Send available while the Agent works; block it only while the Session is loading or has a synchronization error. Clear only the submitted draft after <code>send()</code> succeeds.',
                'Agent 工作期间也应允许发送；仅在 Session 加载中或出现同步错误时禁用。仅在 <code>send()</code> 成功后清除对应的已提交草稿。')
            + ex('composer')
            + p('<code>send()</code> confirms that the input was accepted. Agent replies and saved resources arrive through the subscription. Sending again with the same <code>requestId</code> answers with the first receipt.',
                '<code>send()</code> 确认输入已被接受；Agent 回复和已保存的资源通过订阅返回。使用相同的 <code>requestId</code> 再次发送时，返回第一次的回执。')
            + p('Users can keep writing while the Agent works. A message sent then is in <code>messages</code> at once, after the reply in progress, with <code>unread: true</code>; the receipt names it. At the Agent\'s next step, after its current tool results, it joins the conversation as its own user message, loses <code>unread</code>, and the reply continues in a new assistant message after it. When no loop is running before that (it finished, failed or was stopped), it starts the next one.',
                'Agent 工作期间，用户可以继续发送消息。此时发送的消息会立即出现在 <code>messages</code> 中（位于正在生成的回复之后），并带有 <code>unread: true</code>；回执会标明该消息。在 Agent 的下一步（当前工具结果之后），它会作为单独的用户消息加入对话，<code>unread</code> 随之消失，回复在其后以新的 assistant 消息继续。若在此之前循环已结束（完成、失败或已停止），它会开始下一个循环。')
            + p('Show the read state under user messages, for example one check while <code>unread</code> and two once read. A message sent while the Agent works that cannot be sent on is marked <code>failed</code> with its error.',
                '可在用户消息下方显示已读状态，例如 <code>unread</code> 时显示一个对勾，已读后显示两个。Agent 工作期间发送、但无法继续发送的消息会被标记为 <code>failed</code> 并附带错误。')),
        section('references', 'Attach Products and quote results', '附加产品与引用结果',
            p('Pass a resource returned by the SDK to <code>attach()</code> or <code>quote()</code>. The reference carries the resource kind and ID, and the Agent reads the current version you may use; a display name alone does not identify a Product or Script.',
                '将 SDK 返回的资源传给 <code>attach()</code> 或 <code>quote()</code>。引用包含资源类型和 ID，Agent 会读取你有权使用的当前版本；仅有展示名称不能确定产品或脚本。')
            + ex('attach', "import type { Product, Script } from '@nuva/sdk';") + ex('revise-message')
            + p('Use <code>Message.create().replyTo(message)</code> to address a particular saved message. Use the same Session to retain the conversation context.',
                '使用 <code>Message.create().replyTo(message)</code> 回复指定的已保存消息。继续使用同一个 Session，以保留对话上下文。')),
        section('results', 'Show messages and what the Agent saved', '展示消息与 Agent 保存的内容',
            p('Render <code>state.messages.items</code> in order. Use each message ID as its list key. Render resource records as clickable previews and load the resource when the user opens one.',
                '按顺序渲染 <code>state.messages.items</code>，并用消息 ID 作为列表 key。将资源记录展示为可点击的预览，在用户打开时读取资源。')
            + ex('render-message', "import type { ReactNode } from 'react';\nimport type { MessageView, MessageRef, ResourceLink, DynamicToolUIPart } from '@nuva/sdk';")
            + p('Supply <code>onOpenResource</code> and <code>onOpenMessage</code> from your UI. Text can be plain text or Markdown; use your Markdown renderer when <code>format === "markdown"</code>. A quote may have no excerpt, so keep a link to its target.',
                '由你的界面提供 <code>onOpenResource</code> 和 <code>onOpenMessage</code>。文本可以是纯文本或 Markdown；当 <code>format === "markdown"</code> 时使用你的 Markdown 渲染器。引用可能没有摘录，应保留指向目标的入口。')
            + p(f'Open a record with its kind\'s client: <code>client.scripts.get(record.ref)</code>, <code>client.storyboards.get(record.ref)</code>, <code>client.products.get(record.ref.id)</code>. What a Script or Storyboard holds is explained where it is made, in <a href="{link("generation", "script")}">Content generation</a>.',
                f'用对应类型的客户端打开记录：<code>client.scripts.get(record.ref)</code>、<code>client.storyboards.get(record.ref)</code>、<code>client.products.get(record.ref.id)</code>。脚本和分镜包含的内容在其生成处说明，见<a href="{link("generation", "script")}">内容生成</a>。')
            + p('A resource of kind <code>session_file</code> is a file the Agent made in a Session, such as candidate images of a presenter or a voice sample. It is not an Asset: show it with <code>agent.files.get(record.ref.id)</code>. It can be attached or quoted only in the same Session, for example so the user can say which candidate to use; when a Character, Storyboard or video uses it, the Agent registers it as an Asset. A client that does not know a resource kind can show its label.',
                '类型为 <code>session_file</code> 的资源是 Agent 在某个会话中生成的文件，例如主播的候选图片或语音样本。它不是素材（Asset）：请用 <code>agent.files.get(record.ref.id)</code> 展示。它只能在同一会话中附加或引用，例如让用户说明要用哪一个候选；角色、分镜或视频使用它时，Agent 会将其登记为素材。不认识的资源类型可以只显示其标签。')),
        section('waiting', 'Waiting for renders', '等待渲染完成',
            p('When the Agent submits video Jobs, it watches them and continues on its own when they finish. While it waits, <code>state.waiting</code> is present (only then). The Session is <code>idle</code> meanwhile, so the user can keep chatting.',
                'Agent 提交视频任务后会持续关注，任务完成后自动继续。等待期间 <code>state.waiting</code> 存在（仅在等待时出现）。此时 Session 为 <code>idle</code>，用户可以继续对话。')
            + table([t('Field', '字段'), t('Meaning', '含义')], [
                ['<code>jobs[].record</code>', t('The Job as a resource link (kind <code>job</code>), labelled like “Clip 03”. Open it as you open other resource records.', '任务的资源链接（类型 <code>job</code>），标签如“Clip 03”。可像其他资源记录一样打开。')],
                ['<code>jobs[].status</code>', t('<code>queued</code> or <code>running</code>, updated as the Job progresses. A finished Job leaves the list.', '<code>queued</code> 或 <code>running</code>，随任务进展更新。已完成的任务会从列表中移除。')],
                ['<code>estimated_done_at</code>', t('When the Jobs usually finish, from your own past Jobs of the same kind. Absent until there is enough history (5 Jobs); show it as “usually”, never as a promise.', '根据你过往同类任务估计的通常完成时间。历史不足（少于 5 个任务）时不提供；请以“通常”表述，不要作为承诺。')],
            ])
            + p('Show a short note above the composer, for example “Waiting for 2 renders · usually about 4 min · The Agent continues when they finish”, with a chip per Job and a “Stop waiting” action that calls <code>agent.stop()</code>. Stop works while the Session is idle: the Jobs keep running and their results stay saved, but the Agent no longer continues on its own. When the Agent continues, its reply begins with a summary of the finished renders and their Job records, and the Session is <code>running</code> like any reply.',
                '可在输入框上方显示简短提示，例如“正在等待 2 个渲染 · 通常约 4 分钟 · 全部完成后 Agent 会自动继续”，为每个任务显示一个标签，并提供调用 <code>agent.stop()</code> 的“停止等待”操作。Session 空闲时也可以 Stop：任务继续运行、结果仍会保存，但 Agent 不再自动继续。Agent 继续时，回复开头会列出已完成的渲染及其任务记录，Session 与普通回复一样处于 <code>running</code>。')),
        section('assembly', 'Have the Agent assemble an Ad', '让 Agent 合成广告',
            p('Attach the finished clips (video Assets) in the order you want and say how to edit them, in the same Session. The Agent assembles the Ad and saves it; progress and the Ad\'s record arrive through the subscription. If you finish the video in your own editor instead, upload it and attach it with its source clips and the editing settings: the Agent registers it as the Ad. A final video belongs to one Ad only.',
                '在同一个 Session 中按顺序附加已完成的片段（视频 Asset），并说明如何剪辑。Agent 合成并保存广告；进度和广告记录通过订阅返回。若在自己的编辑器中完成成片，请上传成片，连同来源片段和剪辑设置一起附加：Agent 会将其登记为广告。一条成片只能属于一个广告。')
            + ex('request-assembly', "import { Message } from '@nuva/sdk';\nimport type { AgentHandle, Asset } from '@nuva/sdk';")
            + p(f'Read the saved Ad as described in <a href="{link("store", "ads-batches")}">Read Ads and Batches</a>.',
                f'读取已保存的广告，参见<a href="{link("store", "ads-batches")}">读取广告与批次</a>。')),
        section('stop-history', 'Stop and read history', '停止回复与读取历史',
            ex('controls')
            + p('Stop ends the current Agent loop and stops the Agent from continuing on its own when watched Jobs finish (see <code>state.waiting</code>); it can be called while the Session is idle. It does not delete messages or cancel submitted video Jobs; cancel a Job with <code>client.jobs.cancel(jobId)</code>. <code>loadEarlierMessages()</code> adds older messages to the subscribed state; <code>refresh()</code> resynchronizes without starting a new turn.',
                'Stop 结束当前 Agent 循环，并让 Agent 在所关注的任务完成后不再自动继续（参见 <code>state.waiting</code>）；Session 空闲时也可以调用。Stop 不删除消息，也不取消已提交的视频任务；取消任务请调用 <code>client.jobs.cancel(jobId)</code>。<code>loadEarlierMessages()</code> 将更早的消息加入订阅状态；<code>refresh()</code> 重新同步状态，不会开启新回合。')
            + c("const saved = await client.sessions.history(sessionId, { limit: 50 });\nconst nextCursor = saved.nextCursor;")
            + p('Use <code>sessions.history</code> for a saved-history view without opening a live Agent handle. Pass <code>nextCursor</code> as <code>cursor</code> for the next page.',
                '仅展示已保存的历史时，可使用 <code>sessions.history</code>，无需打开实时 Agent handle。将 <code>nextCursor</code> 作为 <code>cursor</code> 传入以获取下一页。') + download),
    ]

    resources = [
        section('products', 'Create a Brand and a Product', '创建品牌与产品',
            p('The Agent and the writers work from what you save on a Product: its facts, its pictures and its Brand. Create the Brand first, then the Product with the Brand\'s ID.',
                'Agent 和编写服务依据你在产品中保存的内容工作：事实信息、图片及其品牌。先创建品牌，再用品牌 ID 创建产品。')
            + ex('create-product', "import type { NuvaClient, Product, Script } from '@nuva/sdk';")
            + p(f'The writers state only what the Product says: its <code>facts</code> and <code>selling_points</code>, for its <code>target_audience</code>, within its <code>constraints</code>; <code>description</code> and <code>attributes</code> (also on the Brand) are context for how it is presented. Its pictures and videos come next. Every field is in the <a href="{link("reference-products", "Product")}">Product reference</a>.',
                f'编写服务只陈述产品中保存的内容：<code>facts</code> 和 <code>selling_points</code>，面向 <code>target_audience</code>，并遵守 <code>constraints</code>；<code>description</code> 和 <code>attributes</code>（品牌也有）是如何呈现它的背景信息。图片和视频见下一节。全部字段见<a href="{link("reference-products", "Product")}">产品参考</a>。')),
        section('media', 'Add images and videos', '添加图片和视频',
            ex('label-image')
            + p('Upload a <code>File</code> from your upload control, or <code>{url}</code> for a public HTTPS URL, then list its Asset ID on the Product or Character. <code>label</code> (up to 200 characters) and <code>description</code> (up to 2,000) say what the file shows, such as which side of the package; the Script and Storyboard writers read them to tell a Product\'s pictures apart and to choose one for a shot.',
                '上传上传控件中的 <code>File</code>，或公开 HTTPS 地址 <code>{url}</code>，再把其 Asset ID 写入产品或人物。<code>label</code>（最多 200 个字符）和 <code>description</code>（最多 2,000 个字符）说明文件内容，例如包装的哪一面；脚本和分镜编写服务据此区分产品的各张图片，并为镜头选择图片。')
            + c("// Change what a file says it shows; null removes a value.\nawait client.assets.update(asset.id, { label: 'Box, back', description: null });")
            + p('Adding the same file again returns the same Asset; with a different label or description it fails with <code>ASSET_EXISTS</code>, so change the text with <code>assets.update</code>. If the Product update fails after an upload, the Asset is still saved: retry the update with its ID instead of uploading again.',
                '再次添加同一文件会返回同一个 Asset；若标签或描述不同，会返回 <code>ASSET_EXISTS</code>，请用 <code>assets.update</code> 修改文字。上传后若产品更新失败，Asset 仍已保存：用其 ID 重试更新，不要再次上传。')
            + c("const current = await client.assets.get(asset.id);")
            + c('<video src={current.download_url} controls preload="metadata" />', 'tsx')
            + p('Store the Asset ID, not its download URL: download URLs expire, so read the Asset again for a fresh one. A Product, Character or Ad you read lists its files with fresh URLs in its <code>assets</code> field, also when the Asset itself was uploaded by someone else.',
                '保存 Asset ID，不要保存下载地址：下载地址会过期，需要时重新读取 Asset 获取新地址。读取到的产品、人物或广告会在 <code>assets</code> 字段中列出其文件和新的下载地址，即使这些 Asset 由他人上传。')),
        section('characters', 'Create a Character', '创建人物',
            p('Each clip of a Storyboard is rendered as its own video, so a person described only in words is drawn again in every clip and can look and sound different each time. A Character keeps them the same: a name, a description, one or more photos and, optionally, a voice recording, given to every clip it appears in. The first image is the default.',
                '分镜中的每个片段都单独生成视频，只用文字描述的人物会在每个片段中重新生成，长相和声音可能每次都不同。人物（Character）让他们保持一致：名称、描述、一张或多张照片，以及可选的一段声音录音，会提供给其出现的每个片段。第一张图片是默认图片。')
            + ex('create-character')
            + p(f'Cast it in a Storyboard, as in <a href="{link("generation", "storyboard")}">Shoot it as a Storyboard</a>. A Storyboard records the Character version it cast and its clips are always compiled with it: an update changes Storyboards written afterwards, not existing ones. Use photos and recordings of people who agreed to appear in your ads.',
                f'在分镜中选用它，参见<a href="{link("generation", "storyboard")}">拍成分镜</a>。分镜会记录所选人物的版本，其片段始终按该版本编译：更新人物只影响之后写的分镜，不影响已有分镜。请只使用已同意出现在广告中的人的照片和录音。')),
        section('browse', 'Read, list and update', '读取、列出与更新',
            ex('list-products')
            + p('Brands, Products and Characters work the same way. <code>get(id)</code> reads the latest version (pass <code>{version}</code> for an older one). A <code>list</code> returns one <code>Page</code>; pass its <code>nextCursor</code> as <code>cursor</code> until it is null.',
                '品牌、产品和人物的用法相同。<code>get(id)</code> 读取最新版本（传入 <code>{version}</code> 读取旧版本）。<code>list</code> 每次返回一个 <code>Page</code>；将其 <code>nextCursor</code> 作为 <code>cursor</code> 传入，直到它为 null。')
            + ex('update-product')
            + p('They change in place: <code>update</code> takes the record you read (or <code>{id, version}</code>) and, in <code>data</code>, only the fields you change. A list is replaced as a whole (<code>[]</code> empties it) and <code>null</code> clears an optional value. The <code>id</code> stays and <code>version</code> goes up. If someone saved a newer version since you read it, the update fails with <code>REVISION_CONFLICT</code> and changes nothing: keep the user\'s edit, read the record again and reapply it. For a Product, <code>brand_id</code> moves it to another Brand.',
                '它们原地修改：<code>update</code> 接收读取到的记录（或 <code>{id, version}</code>），并在 <code>data</code> 中只传要修改的字段。列表整体替换（<code>[]</code> 表示清空），<code>null</code> 清除可选值。<code>id</code> 不变，<code>version</code> 递增。如果读取之后已有人保存了更新的版本，更新返回 <code>REVISION_CONFLICT</code>，不做任何修改：保留用户的编辑，重新读取记录后再应用。对于产品，<code>brand_id</code> 可将其移到另一个品牌。')),
        section('ads-batches', 'Read Ads and Batches', '读取广告与批次',
            c("const batch = await client.batches.get(batchId);\nconst ads = await client.ads.list({ batch_id: batchId });\nconst ad = await client.ads.get(adId);\nconst video = ad.asset;")
            + p(f'An Ad is a final video and how it was put together; the Agent makes it (<a href="{link("agent", "assembly")}">Have the Agent assemble an Ad</a>). A Batch groups the work of one attempt, and its <code>intent</code> says what it tries: a Script made in a Batch passes it to its Storyboards and their Prompts, and a Job joins its Prompt\'s Batch. A Batch lists its Ads and counts its Jobs by status.',
                f'广告（Ad）是成片及其合成方式，由 Agent 创建（<a href="{link("agent", "assembly")}">让 Agent 合成广告</a>）。批次（Batch）汇集一次尝试中的工作，<code>intent</code> 说明它的目的：在某个批次中生成的脚本会把批次传给其分镜和提示词，任务沿用其提示词的批次。批次列出其广告，并按状态统计任务数量。') + download),
    ]

    generation = [
        lead(
            p(f'Content generation turns a Product into an ad in steps, each saved as its own record: a <a href="#script">Script</a>, the idea and the words (who the ad is for, its argument, every line); a <a href="#storyboard">Storyboard</a>, how it is shot (who appears, the look, the clips of 5 to 15 seconds); <a href="#prompts">Prompts</a>, one per clip, which is what the video model reads; and <a href="#video">Jobs</a>, one rendered clip each, which the Agent <a href="{link("agent", "assembly")}">assembles into the Ad</a>.',
                f'内容生成按步骤把产品变成广告，每一步都保存为独立记录：<a href="#script">脚本</a>是创意和文字（面向谁、论证、每句台词）；<a href="#storyboard">分镜</a>是拍法（谁出镜、画面风格、5 到 15 秒的各个片段）；<a href="#prompts">提示词</a>每个片段一条，是视频模型读取的内容；<a href="#video">任务</a>每个渲染一个片段，再由 Agent <a href="{link("agent", "assembly")}">合成为广告</a>。')),
        section('script', 'Script', '脚本',
            ex('write-script', "import { useEffect, useState } from 'react';\nimport type { NuvaClient, Script, Job, JobState } from '@nuva/sdk';")
            + response('script')
            + p(f'You get a saved Script for the Product you pass as <code>{{id}}</code> (<a href="{link("store", "products")}">create it first</a>); the writer reads its current version, and <code>product</code> records which one. The Script decides the message: who the ad is for, the reason to buy, the hook, who speaks and the exact words.',
                f'你会得到依据所传产品（<code>{{id}}</code>，需要时先<a href="{link("store", "products")}">创建产品</a>）写成的已保存脚本；编写服务读取其当前版本，<code>product</code> 记录所用版本。脚本决定广告要传达的信息：面向谁、购买理由、开场钩子、谁来说，以及每句准确的台词。')
            + p(f'You read it as <code>content</code>, panel by panel, with every line. It has no clips, shots, timing, voices or casting: the Storyboard decides those. Every field is in the <a href="{link("reference-scripts", "Script")}">Script reference</a>.',
                f'脚本以 <code>content</code> 读取，逐个 panel 列出每句台词。它不包含片段、镜头、时间、声音或选角，这些由分镜决定。全部字段见<a href="{link("reference-scripts", "Script")}">脚本参考</a>。')
            + ex('read-script')
            + ex('revise-script')
            + p('For a different angle, opening, tone or length, have the writer write another from it with <code>scripts.generateFrom(base, {instruction})</code>; without <code>acceptable_duration_ms</code> it keeps the length. <code>base</code> stays as it was, so two calls give two alternatives side by side.',
                '需要不同的切入角度、开场、语气或时长时，用 <code>scripts.generateFrom(base, {instruction})</code> 让编写服务据此再写一个；不传 <code>acceptable_duration_ms</code> 时保持原时长。<code>base</code> 保持不变，因此调用两次会得到两个并列的备选。')),
        section('storyboard', 'Storyboard', '分镜',
            ex('write-storyboard', "import type { NuvaClient, Script, Storyboard } from '@nuva/sdk';")
            + response('storyboard')
            + p('You get a saved Storyboard for the Script, in about a minute or two (its deadline is 300 seconds). It decides how the ad is shot: who appears, the look, setting, camera and pacing (<code>direction</code>), and how the lines split into <code>clips</code> of 5 to 15 seconds, each a list of <code>shots</code> and each rendered as one video. Several Storyboards from one Script are shot differently, so ask for more than one for variety.',
                '你会得到为该脚本写成的已保存分镜，通常需要一到两分钟（超时为 300 秒）。分镜决定广告如何拍摄：谁出镜，画面风格、场景、镜头和节奏（<code>direction</code>），以及台词如何切分为 5 到 15 秒的片段 <code>clips</code>；每个片段由若干镜头 <code>shots</code> 组成，并各渲染为一条视频。同一脚本的多个分镜拍法各不相同，需要多样性时可请求多个。')
            + p(f'<code>cast</code> maps Script role IDs to <a href="{link("store", "characters")}">Characters</a>: cast one for a person who must look and sound the same in every clip. The writer casts the other roles itself, with a described <code>look</code> and <code>voice</code>. A cast entry is <code>{{character?, look?, voice?, own_voice?}}</code>; <code>own_voice: true</code> uses the Character\'s recording; otherwise <code>voice</code> describes the voice. <code>instruction</code> asks for a shooting style. Every field is in the <a href="{link("reference-storyboards", "Storyboard")}">Storyboard reference</a>.',
                f'<code>cast</code> 将脚本角色 ID 对应到<a href="{link("store", "characters")}">人物</a>：需要在每个片段中保持同样长相和声音的人，请选用人物。其他角色由编写服务自行选角，使用文字描述的 <code>look</code> 和 <code>voice</code>。选角项为 <code>{{character?, look?, voice?, own_voice?}}</code>；<code>own_voice: true</code> 使用人物的录音，否则由 <code>voice</code> 描述声音。<code>instruction</code> 用于说明拍摄风格。全部字段见<a href="{link("reference-storyboards", "Storyboard")}">分镜参考</a>。')
            + f'<h3 id="tokens">{t("Tokens in shots", "镜头中的标记")}</h3>'
            + p('Shots name people, the Product, other files and Script lines with tokens. A token says who or what, and optionally which file; the file\'s own kind (image, video or audio) decides how it is used. The service works out each clip\'s references from its tokens, so the same person and files go into every clip that names them.',
                '镜头文字用标记指代人物、产品、其他文件和脚本台词。标记说明是谁或是什么，并可指定用哪个文件；文件本身的类型（图片、视频或音频）决定其用法。服务根据每个片段中的标记确定参考素材，因此提到同一人物或文件的每个片段都使用相同素材。')
            + table([t('Token', '标记'), t('Meaning', '含义')], [
                ['<code>{{host}}</code>', t('The role <code>host</code> as cast. With a Character, its default image.', '按选角出演的角色 <code>host</code>。若为人物，使用其默认图片。')],
                ['<code>{{host:&lt;asset id&gt;}}</code>', t('The role, with that file of its Character (an image, or its voice).', '该角色，使用其人物的指定文件（图片或其声音）。')],
                ['<code>{{product}}</code>', t('The Product, with its default (first) image.', '产品，使用默认（第一张）图片。')],
                ['<code>{{product:&lt;asset id&gt;}}</code>', t('That file of the Product: one of its images or videos, told apart by their labels.', '产品的指定文件：其图片或视频之一，可按 label 区分。')],
                ['<code>{{asset:&lt;asset id&gt;}}</code>', t('Any image, video or audio Asset you may use, as a subject of its own. Say in the shot how it is used, for example "background music from {{asset:…}}".', '你可使用的任意图片、视频或音频 Asset，作为独立的主体。请在镜头中写明用法，例如“背景音乐用 {{asset:…}}”。')],
                ['<code>{{L01}}</code>', t('Script line <code>L01</code>, spoken by its speaker.', '脚本台词 <code>L01</code>，由其说话人说出。')],
            ])
            + p('The same file tokens work in <code>instruction</code> for <code>scripts.generate</code> and <code>storyboards.generate</code>.',
                '<code>scripts.generate</code> 和 <code>storyboards.generate</code> 的 <code>instruction</code> 也可以使用相同的文件标记。')
            + ex('read-storyboard')
            + ex('revise-storyboard')
            + p('For a different person, look, setting or shots, have the writer write another with <code>storyboards.generateFrom(base, {instruction, cast?})</code>; pass <code>cast</code> to recast. It keeps the base\'s treatment unless you ask otherwise, and <code>base</code> stays as it was. A line is changed in the Script, not here: a Storyboard speaks the Script\'s lines word for word.',
                '需要不同的人物、画面风格、场景或镜头时，用 <code>storyboards.generateFrom(base, {instruction, cast?})</code> 让编写服务再写一个；需要重新选角时传入 <code>cast</code>。除非另有要求，它沿用 base 的拍法，<code>base</code> 保持不变。台词在脚本中修改，而不是在这里：分镜逐字使用脚本台词。')),
        section('prompts', 'Prompts', '提示词',
            ex('generate-prompts', "import type { NuvaClient, Storyboard } from '@nuva/sdk';")
            + response('prompts')
            + p('You get one saved Prompt per clip, in clip order, each with its <code>data.clip_id</code> and <code>storyboard</code>: the text and the clip\'s files in order, which is what the video model reads. Prompts decide nothing creative; they carry each clip to the model. Pass <code>clip</code> (<code>"C01"</code>) for one clip and <code>ratio</code> for the frame. You get every clip\'s Prompt or an error; a clip compiled before from the same inputs returns its saved Prompt without being compiled or charged again, so calling again after a failure compiles only what is missing. <code>prompts.get</code> reads one later, such as the one <code>job.prompt</code> names.',
                '你会得到按片段顺序排列的已保存提示词，每个片段一条，带有 <code>data.clip_id</code> 和 <code>storyboard</code>：提示词文本和按顺序排列的片段文件，即视频模型读取的内容。提示词不做任何创意决定，只负责把每个片段交给模型。只编译一个片段时传入 <code>clip</code>（<code>"C01"</code>），用 <code>ratio</code> 指定画面比例。要么返回所有片段的提示词，要么返回错误；已用相同输入编译过的片段直接返回已保存的提示词，不会再次编译或计费，因此失败后再次调用只会编译缺少的部分。之后可用 <code>prompts.get</code> 读取提示词，例如 <code>job.prompt</code> 所指的提示词。')
            + f'<h3 id="change-render">{t("Change what gets rendered", "修改生成的内容")}</h3>'
            + p('To change what renders, change the Storyboard, Product or Character and compile again; a Prompt\'s text names each attached file by its position (<code>&lt;Picture 1&gt;</code> is the first image), so it is regenerated rather than edited.',
                '需要修改渲染内容时，修改分镜、产品或人物后重新编译；提示词文本按位置指代附带的文件（<code>&lt;Picture 1&gt;</code> 是第一张图片），因此应重新生成，而不是手动编辑。')
            + table([t('To change', '要修改'), t('Do this, then compile again', '执行以下操作，然后重新编译')], [
                [t('A Product image', '产品图片'), t('Update the Product, then write a new Storyboard, which uses the new Product version.', '更新产品，然后写一个新分镜，它会使用新的产品版本。')],
                [t('Shots, casting or which files a clip uses', '镜头、选角或片段使用的文件'), t('<code>storyboards.generateFrom</code>, or <code>storyboards.createFrom</code>.', '<code>storyboards.generateFrom</code> 或 <code>storyboards.createFrom</code>。')],
                [t('A line', '台词'), t('<code>scripts.generateFrom</code> or <code>scripts.createFrom</code>, then a Storyboard for the new Script.', '<code>scripts.generateFrom</code> 或 <code>scripts.createFrom</code>，然后为新脚本生成分镜。')],
            ])
),
        section('video', 'Render', '渲染',
            ex('generate-video')
            + response('job')
            + p('You get a Job for the clip\'s Prompt, accepted before the video is ready: save <code>job.id</code> at once. It joins the Prompt\'s Batch. Each Job is one take; its <code>seed</code> is random unless you pass one, and passing a Job\'s <code>seed</code> again with the same Prompt repeats that take, while a new seed gives another.',
                '你会得到该片段提示词的任务；任务被接受时视频尚未完成，请立即保存 <code>job.id</code>。任务沿用提示词的 Batch。每个任务是一次拍摄；不传 <code>seed</code> 时随机生成，用同一提示词再次传入某个任务的 <code>seed</code> 会重现那一次，换一个 seed 则得到另一次。')
            + p('For progress in your UI, subscribe; mount the preview with <code>key={jobId}</code> and show <code>job.asset.download_url</code> once it completes.', '界面需要显示进度时进行订阅；使用 <code>key={jobId}</code> 挂载预览，完成后展示 <code>job.asset.download_url</code>。')
            + ex('job-progress')
            + p('Code that only needs the finished video can wait with <code>result()</code>.', '只需要成片的代码可以用 <code>result()</code> 等待。')
            + ex('wait-video')
            + response('asset')
            + table([t('Job status', '任务状态'), t('Action', '处理方式')], [
                ['<code>queued / running</code>', t('Show progress and keep the Job ID.', '展示进度并保留任务 ID。')],
                ['<code>completed</code>', t('Show the returned Asset.', '展示返回的 Asset。')],
                ['<code>failed / cancelled</code>', t('Show <code>job.error</code>; <code>error_code</code> says why, for example <code>GENERATION_FAILED</code>. Rendering again is a new Job.', '展示 <code>job.error</code>；<code>error_code</code> 说明原因，例如 <code>GENERATION_FAILED</code>。重新渲染是一个新任务。')],
            ])
            + response('job-failed')
            + p(f'A timeout or AbortSignal stops waiting locally, not the Job: read it again with <code>client.jobs.get(jobId)</code>. To stop the Job itself, call <code>client.jobs.cancel(jobId)</code>; a finished Job returns <code>JOB_FINISHED</code>. Retrying a call safely is described once, in <a href="{link("reference", "errors")}">Errors</a> and <a href="{link("reference", "idempotency")}">Idempotency keys</a>; the <a href="examples/creation-chain.ts">Product-to-clips example</a> keeps each step\'s key across a reload.',
                f'超时或 AbortSignal 只停止本地等待，不会停止任务：可用 <code>client.jobs.get(jobId)</code> 重新读取。需要停止任务本身时调用 <code>client.jobs.cancel(jobId)</code>；已完成的任务返回 <code>JOB_FINISHED</code>。如何安全地重试调用，统一见<a href="{link("reference", "errors")}">错误</a>和<a href="{link("reference", "idempotency")}">幂等 key</a>；<a href="examples/creation-chain.ts">从产品到片段的示例</a>会在页面刷新后保留每一步的 key。')),
        section('skill', 'Language and creative direction', '语言与创意方向',
            c("const script = await client.scripts.generate({\n  product: { id: productId },\n  acceptable_duration_ms: { min: 8000, max: 15000 },\n  instruction: 'Write in English. Keep the supplied product facts.',\n});")
            + p('Ask for an output language or a creative change in <code>instruction</code>; <code>storyboards.generate</code> takes it the same way for the shooting style. Product and brand names, approved lines and saved facts stay as their sources say, and a Storyboard speaks the Script\'s lines word for word: to change a line, revise the Script.',
                '在 <code>instruction</code> 中指定输出语言或创意修改；<code>storyboards.generate</code> 以同样方式用它说明拍摄风格。产品和品牌名称、已确认台词及已保存事实以其来源为准，分镜逐字使用脚本台词：需要修改台词时请修改脚本。')
            + p(f'The writers follow the writing guidance (Skills) configured for your account, at their <code>main_version</code>; a request does not name one. Each Script, Storyboard and Prompt names the Skill version that wrote it in <code>skill</code>; read it with <code>skills.get(id, {{version}})</code>. Your backend registers Skills: see <a href="{link("backend-go", "skills")}">Backend setup</a>.',
                f'编写服务遵循为你的账户配置的编写指导（Skill）的 <code>main_version</code>；请求中不指定 Skill。每个脚本、分镜和提示词在 <code>skill</code> 中给出编写它的 Skill 版本，可用 <code>skills.get(id, {{version}})</code> 读取。Skill 由你的后端注册，参见<a href="{link("backend-go", "skills")}">后端接入</a>。')),
        section('edit', 'Edit content yourself', '自己编辑内容',
            p('Here you write the content yourself; the service checks it as it checks the writer\'s. Each <code>createFrom(base, changes)</code> saves a new version with the top-level fields you pass and copies the rest from <code>base</code>, which stays as it was; content that fails the checks is rejected with <code>422 REJECTED</code>, and the message lists every problem.',
                '这里由你自己编写内容；服务会像检查编写服务的结果一样检查它。每个 <code>createFrom(base, changes)</code> 用传入的顶层字段保存新版本，其余字段从 <code>base</code> 复制，<code>base</code> 保持不变；未通过检查的内容返回 <code>422 REJECTED</code>，错误信息列出全部问题。')
            + ex('save-script')
            + ex('edit-storyboard')
            + p('A Storyboard edit keeps its Script (leave <code>script</code> out). A Storyboard you save passes these checks: every Script role (and the narrator, if there are narrator lines) has one cast entry; clips are numbered <code>C01</code>, <code>C02</code>… in order; every line is placed exactly once, in Script order; an <code>on_camera</code> or <code>dialogue</code> line names its speaker in the same shot; each clip names at least one image or video and at most 9 images, 3 videos, 3 audio files and 12 references in all; every file a token names belongs to that Character or Product, or is an Asset you may use; the clips add up to the Script\'s <code>duration_ms</code> within 15% (at least 2 seconds). Line and file tokens belong in shots, not in <code>direction</code>.',
                '编辑分镜时沿用其脚本（不要传 <code>script</code>）。保存的分镜需通过以下检查：每个脚本角色（以及有旁白台词时的 narrator）各有一个选角项；片段按顺序编号为 <code>C01</code>、<code>C02</code>…；每句台词按脚本顺序恰好出现一次；<code>on_camera</code> 或 <code>dialogue</code> 台词所在镜头必须提到其说话人；每个片段至少使用一张图片或一个视频，最多 9 张图片、3 个视频、3 段音频、共 12 个参考素材；标记指定的文件必须属于该人物或产品，或是你可使用的 Asset；片段总时长与脚本 <code>duration_ms</code> 相差不超过 15%（至少允许 2 秒）。台词和文件标记只能写在镜头中，不能写在 <code>direction</code> 中。')
            + p('<code>prompts.createFrom(base, changes)</code> saves a Prompt with other render fields (<code>prompt</code>, the file lists, <code>seconds</code>, <code>ratio</code>) and keeps the clip it was compiled for.',
                '<code>prompts.createFrom(base, changes)</code> 用其他渲染字段（<code>prompt</code>、文件列表、<code>seconds</code>、<code>ratio</code>）保存提示词，并保留其所属片段。')
            + f'<h3 id="raw">{t("Render text of your own", "渲染自己的文本")}</h3>'
            + ex('generate-video-raw')
            + p('<code>videos.generate({input})</code> renders text no Storyboard describes. <code>data</code> is only what the video model sees: <code>prompt</code>, <code>image_asset_ids</code>, <code>video_asset_ids</code>, <code>audio_asset_ids</code>, <code>seconds</code> and <code>ratio</code>. The text must name each attached file as <code>&lt;Picture N&gt;</code>, <code>&lt;Video N&gt;</code> or <code>&lt;Audio N&gt;</code>, by its position in its list; otherwise it is rejected with <code>422 INVALID_PROMPT</code>. A Character or Product reaches a raw render only as the pictures you attach and name. The backend saves the Prompt (<code>job.prompt</code>), and without <code>seed</code> each Job gets a random one, returned as <code>job.seed</code>.',
                '<code>videos.generate({input})</code> 用于渲染不来自分镜的文本。<code>data</code> 只包含视频模型看到的内容：<code>prompt</code>、<code>image_asset_ids</code>、<code>video_asset_ids</code>、<code>audio_asset_ids</code>、<code>seconds</code> 和 <code>ratio</code>。文本必须按文件在列表中的位置，以 <code>&lt;Picture N&gt;</code>、<code>&lt;Video N&gt;</code> 或 <code>&lt;Audio N&gt;</code> 提到每个附带的文件，否则返回 <code>422 INVALID_PROMPT</code>。人物或产品只能以你附加并提到的图片进入原始渲染。后端会保存该提示词（<code>job.prompt</code>）；不传 <code>seed</code> 时每个任务使用随机种子，并通过 <code>job.seed</code> 返回。')),
    ]

    return {'frontend': start, 'agent': agent, 'store': resources, 'generation': generation}
