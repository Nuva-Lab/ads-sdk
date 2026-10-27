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
        ('install', t('Install the Go Admin SDK', '安装 Go Admin SDK'),
         p('Use Go 1.22 or newer and authenticated access to the private SDK repository.',
           '使用 Go 1.22 或更新版本，并确保有权访问私有 SDK 仓库。')
         + c('GOPRIVATE=github.com/Nuva-Lab/ads-sdk \\\n  go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.2', 'sh')),
        ('client', t('Create the Admin client', '创建 Admin 客户端'),
         p('Set the customer Admin API key in your server environment as <code>NUVA_CUSTOMER_API_KEY</code>. Create the Admin client once during server initialization.',
           '在服务端环境变量 <code>NUVA_CUSTOMER_API_KEY</code> 中设置客户 Admin API key。服务初始化时创建一次 Admin 客户端。')
         + ex('admin-client', 'import (\n    "os"\n    nuva "github.com/Nuva-Lab/ads-sdk/go"\n)')
         + table([t('Client environment', '客户端环境'), t('Go Admin API URL', 'Go Admin API 地址')], [
             ['<code>"sandbox"</code> ' + t('(default)', '（默认）'), '<code>https://api-staging.nuvalab.ai</code>'],
             ['<code>"production"</code>', '<code>https://api.nuvalab.ai</code>'],
         ])
         + p('Pass the matching API URL to <code>NewAdsAdmin</code> and configure an Admin key issued for that environment. Changing the frontend environment does not change your token backend. Handle initialization errors before serving requests.',
           '将配套 API 地址传给 <code>NewAdsAdmin</code>，并配置由该环境签发的 Admin key。修改前端环境不会自动修改签发令牌的后端。开始处理请求前应处理初始化错误。')),
        ('tokens', t('Implement the user-token route', '实现用户令牌接口'),
         p('Implement this route in your backend. <code>POST /api/ads/token</code> is an example path; use your own route if preferred. Supply <code>userID</code> from your application’s authenticated session or middleware. Do not let a request body choose another user’s identity.',
           '在你的后端实现此接口。<code>POST /api/ads/token</code> 是示例路径，也可使用你自己的路径。由应用的登录会话或认证中间件提供 <code>userID</code>，不要让请求体指定其他用户的身份。')
         + ex('token-handler', 'import (\n    "encoding/json"\n    "net/http"\n    "time"\n)')
         + p('The response is <code>{token, expiresAt}</code>. User tokens expire after one hour; always return the expiry provided by the service. The client SDK calls this route again when it needs to renew access.',
           '返回结构为 <code>{token, expiresAt}</code>。用户令牌一小时后过期；始终返回服务提供的过期时间。客户端 SDK 需要刷新访问凭证时会再次调用此接口。')
         + p(f'Connect it to <a href="{filename("frontend", locale)}#authentication">getAccessToken</a> in the client. Apply your application’s usual session and CSRF protections to this route.',
             f'将此接口接入客户端的 <a href="{filename("frontend", locale)}#authentication">getAccessToken</a>。对该接口应用你现有的登录会话和 CSRF 防护。')),
        ('skills', t('Register a Skill', '注册 Skill'),
         ex('register-skill', 'import "context"')
         + p('Provide UTF-8 text files, including <code>SKILL.md</code>. The writer supports <code>.md</code>, <code>.txt</code>, <code>.json</code>, <code>.yaml</code> and <code>.yml</code> files. It checks every file in the version, including files outside <code>attributes.preload</code>; registration alone does not establish writer compatibility.',
           '提供 UTF-8 文本文件，其中必须包含 <code>SKILL.md</code>。编写服务支持 <code>.md</code>、<code>.txt</code>、<code>.json</code>、<code>.yaml</code> 和 <code>.yml</code> 文件。它会检查版本中的全部文件，包括未列入 <code>attributes.preload</code> 的文件；注册成功不代表该版本一定能被编写服务加载。')
         + p('Add required reference paths to <code>attributes.preload</code>; the writer loads them before generating. Other supported Skill files remain available on demand.',
           '将必需的参考文件路径写入 <code>attributes.preload</code>，编写服务会在生成前加载；其他受支持的 Skill 文件可按需读取。')
         + p('Save <code>registered.Skill.ID</code> and <code>registered.Version.Version</code> when the client needs to select that guidance. Registering a Skill stores text and metadata; it does not execute scripts.',
           '客户端需要选择这份指导时，保存 <code>registered.Skill.ID</code> 和 <code>registered.Version.Version</code>。注册 Skill 只保存文本和元数据，不执行脚本。')),
        ('activate', t('Select the main Skill version', '选择 Skill 主版本'),
         ex('activate-skill')
         + p('The first version becomes main. Later registrations create versions without switching main. Call <code>SetSkillMain</code> after your backend approves the new version. A user token or Agent conversation cannot activate it.',
           '首个版本会成为主版本。后续注册只创建版本，不自动切换主版本。后端确认采用新版本后，再调用 <code>SetSkillMain</code>。用户令牌和 Agent 对话不能执行激活。')),
        ('read', t('Read Skills with a user token', '使用用户令牌读取 Skill'),
         ex('read-skill')
         + p('<code>UserClient</code> also exposes <code>ListSkills</code> and <code>GetSkill</code>. It does not refresh tokens automatically; create a new reader with a fresh token for the same user when needed.',
           '<code>UserClient</code> 还提供 <code>ListSkills</code> 和 <code>GetSkill</code>。它不会自动刷新令牌；需要时签发同一用户的新令牌并创建新的 reader。')),
        ('errors', t('Handle backend errors', '处理后端错误'),
         table([t('Field', '字段'), t('Use', '用途')], [
             ['<code>StatusCode / Code</code>', t('Identify the HTTP status and service error.', '识别 HTTP 状态和服务错误。')],
             ['<code>RequestID</code>', t('Correlate a failed request when available.', '在可用时关联失败请求。')],
             ['<code>Acceptance</code>', t('Distinguish a rejected write from an uncertain result.', '区分被拒绝的写入与结果不确定的写入。')],
         ])
         + p('Use <code>errors.As</code> with <code>*nuva.APIError</code>. Inspect state before retrying an uncertain write. Use context deadlines; <code>errors.Is</code> can identify cancellation or timeout. The Go client does not automatically replay writes.',
           '通过 <code>errors.As</code> 获取 <code>*nuva.APIError</code>。重试结果不确定的写入前先检查状态。设置 context 截止时间，并用 <code>errors.Is</code> 判断取消或超时。Go 客户端不会自动重放写入。')
         + p('Download the <a href="examples/guide_backend.go">complete backend example</a>.', '下载<a href="examples/guide_backend.go">完整后端示例</a>。')),
    ]
