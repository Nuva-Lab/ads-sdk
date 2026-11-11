"""Backend instructions using the same checked examples in both languages."""
from customer_layout import code, filename
from client_reference import source_example
from build import table


def go_sections(locale='zh'):
    t = lambda en, zh: zh if locale == 'zh' else en
    p = lambda en, zh: '<p>' + t(en, zh) + '</p>'
    c = lambda text, language='go': code(text, language, locale)
    ex = lambda key, prelude='': source_example(key, locale, prelude, 'guide_backend.go')
    return [
        ('install', t('Install and create the Admin client', '安装并创建 Admin 客户端'),
         p('Use Go 1.22 or newer.',
           '使用 Go 1.22 或更新版本。')
         + c('go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.6', 'sh')
         + p('Set the customer Admin API key in your server environment as <code>NUVA_CUSTOMER_API_KEY</code>, and create the Admin client once when the server starts.',
           '在服务端环境变量 <code>NUVA_CUSTOMER_API_KEY</code> 中设置客户 Admin API key，并在服务启动时创建一次 Admin 客户端。')
         + ex('admin-client', 'import (\n    "os"\n    nuva "github.com/Nuva-Lab/ads-sdk/go"\n)')
         + table([t('Client environment', '客户端环境'), t('Go Admin API URL', 'Go Admin API 地址')], [
             ['<code>"sandbox"</code> ' + t('(default)', '（默认）'), '<code>https://api-staging.nuvalab.ai</code>'],
             ['<code>"production"</code>', '<code>https://api.nuvalab.ai</code>'],
         ])
         + p('Pass the API URL that matches your client environment to <code>NewAdsAdmin</code>, with an Admin key issued for that environment.',
           '将与客户端环境对应的 API 地址传给 <code>NewAdsAdmin</code>，并使用该环境签发的 Admin key。')),
        ('tokens', t('Issue user tokens', '签发用户令牌'),
         p('Implement this route in your backend. <code>POST /api/ads/token</code> is an example path; use your own route if preferred. Supply <code>userID</code> from your application’s authenticated session or middleware. Do not let a request body choose another user’s identity.',
           '在你的后端实现此接口。<code>POST /api/ads/token</code> 是示例路径，也可使用你自己的路径。由应用的登录会话或认证中间件提供 <code>userID</code>，不要让请求体指定其他用户的身份。')
         + ex('token-handler', 'import (\n    "encoding/json"\n    "net/http"\n    "time"\n)')
         + p('The response is <code>{token, expiresAt}</code>. User tokens expire after one hour; always return the expiry provided by the service. The client SDK calls this route again when it needs to renew access.',
           '返回结构为 <code>{token, expiresAt}</code>。用户令牌一小时后过期；始终返回服务提供的过期时间。客户端 SDK 需要刷新访问凭证时会再次调用此接口。')
         + p(f'Connect it to <a href="{filename("frontend", locale)}#authentication">getAccessToken</a> in the client. Apply your application’s usual session and CSRF protections to this route.',
             f'将此接口接入客户端的 <a href="{filename("frontend", locale)}#authentication">getAccessToken</a>。对该接口应用你现有的登录会话和 CSRF 防护。')),
        ('permissions', t('Organize users: scopes, admins and sharing', '组织用户：范围、管理员与共享'),
         p('A Brand, Product, Character, Asset or Artifact belongs to the user who made it. It is private to that user and to the admins above them until it is shared. Your account may also share every new Brand, Product and Character with the whole organization automatically.',
           '品牌、产品、角色、Asset 和产物归创建它的用户所有。在共享之前，只有该用户及其上级管理员可以访问。你的账户也可以设置为把新建的品牌、产品和角色自动共享给整个组织。')
         + ex('permissions', 'import "context"')
         + table([t('Role', '角色'), t('What it allows', '允许的操作')], [
             ['<code>RoleMember</code>', t('Reads what is shared with its scope or a scope above it. Every user is a member of <code>customer</code> without a row.', '读取共享给其范围或上级范围的内容。每个用户都默认是 <code>customer</code> 的成员。')],
             ['<code>RoleAdmin</code>', t('Reads, writes, deletes and shares what users at or below its scope own, and can drive their Agent Sessions.', '读取、修改、删除和共享其范围内（含下级）用户拥有的内容，并可代为操作他们的 Agent Session。')],
             ['<code>RoleViewer</code>', t('Reads what users at or below its scope own, and changes nothing of theirs. A viewer is still a member: an item shared with them for writing, they can edit.', '读取其范围内（含下级）用户拥有的内容，但不能修改。查看者仍是成员：以可编辑方式共享给他们的内容可以编辑。')],
         ])
         + p('Scopes form a tree: <code>customer</code> (your whole organization), orgs under it, and groups under an org. <code>SetMemberships</code> replaces a user’s memberships. It takes effect at once for the API; the Agent follows within a minute for Session access. An admin of <code>customer</code> administers everyone. Name your admins before users need to see each other’s work.',
           '范围是一棵树：<code>customer</code>（整个组织）、其下的 org，以及 org 下的 group。<code>SetMemberships</code> 会替换用户的全部成员关系，对 API 立即生效；Agent 对 Session 的访问权限在一分钟内同步。<code>customer</code> 的管理员可管理所有人。在用户需要查看彼此的内容之前，请先指定管理员。')
         + p('A share reaches everyone at or below its scope: <code>AccessRead</code> to see and use the item, <code>AccessWrite</code> to also edit it. It never allows deleting the item or sharing it on. You can share Brands, Products, Characters, Assets and Artifacts; Batches, Jobs and Ads are never shared. Removing a share makes the item <code>NOT_FOUND</code> again for those it reached. The API key administers your whole organization: it lists, reads and shares everyone’s items, but writing items takes a user token. <code>ListShares</code> takes the right to share the item.',
           '共享对其范围内（含下级）的所有人生效：<code>AccessRead</code> 可查看和使用，<code>AccessWrite</code> 还可编辑。共享不允许删除该内容，也不允许再次共享。可以共享品牌、产品、角色、Asset 和产物；批次、任务和广告不能共享。取消共享后，原先能访问的人再读取会得到 <code>NOT_FOUND</code>。API key 可管理整个组织：可列出、读取和共享所有人的内容，但修改内容需要用户令牌。<code>ListShares</code> 需要共享该内容的权限。')
         + p('Brands, Products and Characters saved before this permission model have no owner. Everyone in your organization keeps reading and editing them; deleting or sharing them takes an admin of <code>customer</code>.',
           '在此权限模型之前保存的品牌、产品和角色没有所有者。组织内所有人仍可读取和编辑它们；删除或共享它们需要 <code>customer</code> 的管理员。')),
        ('skills', t('Register Skills and choose the main version', '注册 Skill 并选择主版本'),
         p('A Skill is the writing guidance the Agent and the writers load: <code>SKILL.md</code> and its files. Your backend registers each new version; the writers use the Skill\'s main version, and a generation request does not name one.',
           'Skill 是 Agent 和编写服务加载的编写指导：<code>SKILL.md</code> 及其文件。你的后端注册每个新版本；编写服务使用 Skill 的主版本，生成请求中不指定 Skill。')
         + ex('register-skill', 'import "context"')
         + p('Provide UTF-8 text files, including <code>SKILL.md</code>; the writer reads <code>.md</code>, <code>.txt</code>, <code>.json</code>, <code>.yaml</code> and <code>.yml</code>. List the files it must read first in <code>attributes.preload</code>; it reads the others when it needs them. It checks every file in the version, so registering a version does not by itself mean the writer can load it. Registering stores text and metadata and runs nothing.',
           '提供 UTF-8 文本文件，其中必须包含 <code>SKILL.md</code>；编写服务读取 <code>.md</code>、<code>.txt</code>、<code>.json</code>、<code>.yaml</code> 和 <code>.yml</code> 文件。将必须先读取的文件写入 <code>attributes.preload</code>，其余文件按需读取。它会检查版本中的全部文件，因此注册成功并不代表编写服务一定能加载该版本。注册只保存文本和元数据，不执行任何内容。')
         + ex('activate-skill')
         + p('The first version becomes main; later ones do not move it. Call <code>SetSkillMain</code> once your backend approves a new version; running work keeps the version it started with. A user token or a conversation cannot change it. <code>UserClient</code> reads Skills with a user token (<code>ListSkills</code>, <code>GetSkill</code>); it does not renew the token.',
           '首个版本会成为主版本，后续版本不会自动替换它。后端确认采用新版本后调用 <code>SetSkillMain</code>；进行中的工作沿用其开始时的版本。用户令牌和对话不能修改主版本。<code>UserClient</code> 用用户令牌读取 Skill（<code>ListSkills</code>、<code>GetSkill</code>），不会自动更新令牌。')),
        ('errors', t('Handle errors', '处理错误'),
         table([t('Field', '字段'), t('Use', '用途')], [
             ['<code>StatusCode / Code</code>', t('Identify the HTTP status and service error.', '识别 HTTP 状态和服务错误。')],
             ['<code>RequestID</code>', t('Correlate a failed request when available.', '在可用时关联失败请求。')],
             ['<code>Retryable</code>', t('Whether the same call may succeed if sent again.', '再次发送相同调用是否可能成功。')],
         ])
         + p('Use <code>errors.As</code> with <code>*nuva.APIError</code>. Every Admin write repeats to the same result (scopes, memberships and shares are replaced; the same Skill content is the same version), so a <code>Retryable</code> error can be sent again. Use context deadlines; <code>errors.Is</code> can identify cancellation or timeout. The Go client does not replay writes by itself.',
           '通过 <code>errors.As</code> 获取 <code>*nuva.APIError</code>。每个 Admin 写入重复执行的结果都相同（范围、成员关系和共享会被替换；相同 Skill 内容即同一版本），因此 <code>Retryable</code> 的错误可以再次发送。设置 context 截止时间，并用 <code>errors.Is</code> 判断取消或超时。Go 客户端不会自行重放写入。')
         + p('Download the <a href="examples/guide_backend.go">complete backend example</a>.', '下载<a href="examples/guide_backend.go">完整后端示例</a>。')),
    ]
