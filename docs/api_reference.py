"""The field-level API reference page (`reference-fields`), generated from the Client SDK's contract.

Everything a table shows is read at build time from the contract, so the page cannot drift from it:

- `typescript/schema/backend.openapi.json`, the public backend contract (API version 2026-11-07): each field's type,
  whether it is required, its default, its limits and its English `description`. The internal contract
  (`backend-internal.openapi.json`) is never read.
- `reference_contract.mjs` (a small node script) for what the OpenAPI file does not hold:
  * the zod schemas of the generate inputs and of Script and Storyboard content, turned into JSON Schema with
    `z.toJSONSchema` in the same zod instance the sources use. That is more robust than reading `.describe()` from the
    source text: shared schemas, `.optional()`, `.extend()`, `.omit()`, limits and descriptions come out resolved,
    exactly as zod validates them, and the result is walked by the same code as the OpenAPI schemas;
  * the client interfaces (`StoreClients`, `SessionsClient`, `AgentHandle`, `NuvaClientOptions`, ...), read with the
    TypeScript checker: every method with its parameter names, and every property with its TSDoc.
  The script loads the TypeScript sources as they are (reference_loader.mjs transpiles them), so no SDK build is needed.
- `METHODS` below, the only hand-written mapping: which schema each method takes and returns, a one-sentence purpose,
  and the descriptions the contract does not have (SDK-only fields, zod fields without `.describe()`), in English and
  Chinese.
- `reference_zh.json`: the Chinese for each English description the contract supplies.

`problems()` lists every gap: a reachable field without a description, a description without Chinese, a public method
or interface member missing from the map, a map entry the contract no longer has, a mapped schema that no longer matches
its backend route, and unused translations or notes. `build_customer.py` and `check_customer.py` fail on any of them.
"""
from functools import lru_cache
from html import escape
import json
from pathlib import Path
import re
import subprocess

from build import ROOT
from customer_layout import code, filename

SDK = ROOT.parent
OPENAPI = SDK / 'typescript' / 'schema' / 'backend.openapi.json'
ZH_FILE = ROOT / 'reference_zh.json'
PAGE = 'reference-fields'
SAFE_INTEGER = 9007199254740991
ID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'


@lru_cache(maxsize=None)
def openapi():
    return json.loads(OPENAPI.read_text())


@lru_cache(maxsize=None)
def contract():
    result = subprocess.run(['node', str(ROOT / 'reference_contract.mjs')], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError('reference_contract.mjs failed:\n' + result.stderr)
    return json.loads(result.stdout)


@lru_cache(maxsize=None)
def translations():
    return json.loads(ZH_FILE.read_text())


# ── Text ─────────────────────────────────────────────────────────────────

class T:
    """A description. `zh` None: English from the contract, translated with reference_zh.json."""

    def __init__(self, en, zh=None, source=''):
        self.en, self.zh, self.source = en, zh, source

    def html(self, locale):
        """English and translated contract text use `code` spans; a docs-owned Chinese text is already HTML."""
        if locale == 'en':
            return inline(self.en)
        if self.zh is not None:
            return self.zh
        text = translations().get(self.en)
        return inline(text) if text is not None else ''


def inline(text):
    """Escape a description and set `code` spans."""
    return re.sub(r'`([^`]+)`', lambda m: '<code>' + m.group(1) + '</code>', escape(text, quote=False))


# ── Specs: what a method takes or returns ────────────────────────────────

class Api:
    """An OpenAPI component's fields."""

    def __init__(self, name, omit=(), only=None, partial=False, prefix=''):
        self.name, self.omit, self.only, self.partial, self.prefix = name, omit, only, partial, prefix


class Zod(Api):
    """A zod schema's fields (see reference_contract.mjs)."""


class Ts:
    """A TypeScript interface's members, with their TSDoc or a note."""

    def __init__(self, name, omit=()):
        self.name, self.omit = name, omit


class Query:
    """The query parameters a route takes that the SDK's query object has."""

    def __init__(self, route, names):
        self.route, self.names = route, names


class Row:
    """A field the SDK adds or shapes, described here. `link` points its type at a full expansion elsewhere."""

    def __init__(self, path, type_, required, en, zh, default='', link=None):
        self.path, self.type, self.required, self.desc, self.default, self.link = path, type_, required, T(en, zh), default, link


class Field:
    """One contract field shown at another path, with its own description."""

    def __init__(self, schema, name, path=None, required=None, note=None):
        self.schema, self.name, self.path, self.required, self.note = schema, name, path or name, required, note


class P:
    """A method parameter: `spec` for an object (its fields get a table), or a scalar with a description."""

    def __init__(self, name, type_, spec=None, en=None, zh=None):
        self.name, self.type, self.spec, self.desc = name, type_, spec, (T(en, zh) if en else None)


class Method:
    def __init__(self, path, params, returns, purpose, output=(), route=None, body=None, notes=()):
        self.path, self.params, self.returns, self.purpose = path, params, returns, T(*purpose)
        self.output, self.route, self.body, self.notes = list(output), route, body, [T(*note) for note in notes]


def links(kind, en, zh):
    """The `ref` and `label` the SDK adds to a record it returns."""
    return [
        Row('ref', '{kind, id}', True, f'Added by the SDK: `{{kind: "{kind}", id}}`, the reference to attach to a message or pass to a method.',
            f'由 SDK 添加：<code>{{kind: "{kind}", id}}</code>，可附加到消息或传给方法的引用。'),
        Row('label', 'string', True, en, zh),
    ]


ARTIFACT = lambda kind: links(kind, 'Added by the SDK: the id, for display.', '由 SDK 添加：用于展示的 ID。') + [
    Row('schemaVersion', 'number', True, 'Added by the SDK: the same as `schema_version`.', '由 SDK 添加：与 <code>schema_version</code> 相同。')]
NEXT = Row('nextCursor', 'string | null', True, 'Added by the SDK: the same as `next_cursor`; null at the end of the list.', '由 SDK 添加：与 <code>next_cursor</code> 相同；为 null 表示已到列表末尾。')
OPTIONS = P('options', 'StoreCommandOptions', Ts('StoreCommandOptions'))
COMMAND = P('options', 'CommandOptions', Ts('CommandOptions'))
ID = lambda what_en, what_zh: P('id', 'string', None, f'The {what_en}\'s id.', f'{what_zh}的 ID。')
REF = lambda kind, what_en, what_zh: P('ref', f'ResourceRef<"{kind}">', None, f'The {what_en}: `{{kind: "{kind}", id}}`, with the id of the version to read.', f'{what_zh}：<code>{{kind: "{kind}", id}}</code>，id 为要读取的版本的 ID。')
BASE = lambda kind, record, what_en, what_zh: P('base', f'ResourceRef<"{kind}"> | {record}', None,
    f'The {what_en} to start from: `{{kind: "{kind}", id}}`, or the record you read (then it is not read again). It stays as it was.',
    f'作为起点的{what_zh}：<code>{{kind: "{kind}", id}}</code>，或已读取的记录（此时不再重新读取）。它保持不变。')
BASE_REF = lambda kind, what_en, what_zh: P('base', f'ResourceRef<"{kind}">', None, f'The {what_en} to start from: `{{kind: "{kind}", id}}`. It stays as it was.',
    f'作为起点的{what_zh}：<code>{{kind: "{kind}", id}}</code>。它保持不变。')
VERSION_QUERY = P('query', '{version?: number}', Query(None, ('version',)))
LIST_QUERY = lambda route, *names: P('query', 'StoreQuery', Query(route, ('limit', 'cursor') + names))


def profiles(kind, name, en, zh):
    """create / get / list / update for a Brand, Product or Character."""
    plural = kind + 's'
    record = links(kind, f'Added by the SDK: the {en}\'s name (`data.name`), for display.', f'由 SDK 添加：{zh}名称（<code>data.name</code>），用于展示。')
    return [
        Method(f'{plural}.create', [P('input', f'{name}Create', Api(f'{name}Create')), OPTIONS], f'Promise<{name}>',
               (f'Creates a {en} and returns its first version.', f'创建{zh}，返回其第一个版本。'),
               output=[Api(name), *record], route=('POST', f'/v1/{plural}'), body=f'{name}Create'),
        Method(f'{plural}.get', [ID(en, zh), VERSION_QUERY], f'Promise<{name}>',
               (f'Reads the latest version of a {en}, or the `version` you ask for.', f'读取{zh}的最新版本，或指定的 <code>version</code>。'),
               output=[Api(name)], route=('GET', f'/v1/{plural}/{{{kind}_id}}')),
        Method(f'{plural}.list', [LIST_QUERY(('GET', f'/v1/{plural}'), *(('brand_id',) if kind == 'product' else ()))], f'Promise<BackendPage<{name}>>',
               (f'Lists the {en}s you can read, a page at a time, each at its latest version.', f'分页列出你有权读取的{zh}，每个均为最新版本。'),
               output=[Field(f'{name}Page', 'items'), Field(f'{name}Page', 'next_cursor'), NEXT], route=('GET', f'/v1/{plural}')),
        Method(f'{plural}.update', [P('ref', 'EntityRef', Ts('EntityRef')), P('changes', f'{name}Changes', Api(f'{name}Edit', omit=('version',))), OPTIONS], f'Promise<{name}>',
               (f'Changes the fields you send and saves the next version; if someone saved a newer version since you read it, it fails with `REVISION_CONFLICT` and nothing changes.',
                f'修改传入的字段并保存下一个版本；如果读取之后已有人保存了更新的版本，返回 <code>REVISION_CONFLICT</code>，不做任何修改。'),
               output=[Api(name)], route=('PATCH', f'/v1/{plural}/{{{kind}_id}}'), body=f'{name}Edit'),
    ]


SCRIPT_OUT = [Api('Script'), *ARTIFACT('script'),
              Row('format', '3 | 2', True, 'Added by the SDK: 3 for a Script with `content`; 2 for a read-only Script saved before Storyboards, in `legacy`.',
                  '由 SDK 添加：3 表示带 <code>content</code> 的脚本；2 表示分镜功能推出前保存的只读脚本，内容在 <code>legacy</code> 中。'),
              Zod('ScriptContent', prefix='content'),
              Row('legacy', 'ScriptPackage', False, 'Added by the SDK for `format: 2` only: the old ScriptPackage, read-only. It cannot be revised or shot; write a new Script instead.',
                  '仅 <code>format: 2</code> 时由 SDK 添加：旧的 ScriptPackage，只读。不能修改或拍成分镜，请生成新脚本。')]
STORYBOARD_OUT = [Api('Storyboard'), *ARTIFACT('storyboard'), Zod('StoryboardContent', prefix='content')]
PROMPT_OUT = [Api('Prompt'), *ARTIFACT('prompt')]
JOB_METHODS = [
    Row('subscribe(listener, onError?)', 'Unsubscribe', True,
        'Added by the SDK: calls `listener` with each state of this Job, polled every `jobPollIntervalMs`, until it is `completed`, `failed` or `cancelled`. The returned function stops it locally; the Job keeps running.',
        '由 SDK 添加：按 <code>jobPollIntervalMs</code> 轮询，将任务的每个状态传给 <code>listener</code>，直到 <code>completed</code>、<code>failed</code> 或 <code>cancelled</code>。返回的函数只停止本地轮询，任务继续运行。'),
    Row('result(options?)', 'Promise<Asset>', True,
        'Added by the SDK: resolves to the generated Asset once the Job completes, and rejects when it fails or is cancelled. `options.timeoutMs` and `options.signal` stop waiting locally, not the Job.',
        '由 SDK 添加：任务完成后返回生成的 Asset；任务失败或取消时抛出错误。<code>options.timeoutMs</code> 和 <code>options.signal</code> 只停止本地等待，不会停止任务。'),
]

# Sections in page order; each holds the methods of one or more clients.
SECTIONS = [
    ('assets', 'Assets', '素材（Asset）', [
        Method('assets.upload', [P('source', 'File | {url: string}', None, 'The file: a `File` from your upload UI, or `{url}` for a public HTTPS URL the service fetches.',
                                   '文件：上传控件中的 <code>File</code>，或由服务抓取的公开 HTTPS 地址 <code>{url}</code>。'),
                                 P('options', 'StoreCommandOptions & {kind?, label?, description?}', [
                                     Field('UploadRequest', 'kind', required=False, note=T('`image` (JPEG, PNG or WebP), `video` (MP4) or `audio` (MP3, WAV or MP4). For a `File`, taken from its MIME type when left out; required with `{url}`.',
                                                                                         '<code>image</code>（JPEG、PNG 或 WebP）、<code>video</code>（MP4）或 <code>audio</code>（MP3、WAV 或 MP4）。上传 <code>File</code> 时可省略，按其 MIME 类型确定；使用 <code>{url}</code> 时必填。')),
                                     Field('AssetCreate', 'label'), Field('AssetCreate', 'description'),
                                     Row('idempotencyKey', 'string', False, 'See `StoreCommandOptions`.', '参见 <code>StoreCommandOptions</code>。'),
                                     Row('requestId', 'string', False, 'See `StoreCommandOptions`.', '参见 <code>StoreCommandOptions</code>。')])],
               'Promise<Asset>', ('Adds a file, uploaded or fetched from a public HTTPS URL, and returns its Asset; the same file added again returns the same Asset.',
                                  '添加文件（上传或从公开 HTTPS 地址抓取），返回其 Asset；再次添加同一文件会返回同一个 Asset。'),
               output=[Api('AssetOut'), Row('ref', '{kind, id}', True, 'Added by the SDK: `{kind: "asset", id}`, the reference to attach to a message.', '由 SDK 添加：<code>{kind: "asset", id}</code>，可附加到消息的引用。')],
               route=('POST', '/v1/assets'), body='AssetCreate',
               notes=[('Uploading a `File` takes three requests: an upload URL, the upload, then registration; a file larger than the kind allows is refused before it is sent.',
                       '上传 <code>File</code> 需要三次请求：获取上传地址、上传文件、登记文件；超过该类型大小上限的文件会在发送前被拒绝。')]),
        Method('assets.get', [ID('Asset', 'Asset ')], 'Promise<Asset>',
               ('Reads an Asset you uploaded or generated, or one a shared Product or Character uses, with a fresh download URL.',
                '读取你上传或生成的 Asset，或共享产品、人物使用的 Asset，并返回新的下载地址。'),
               output=[Api('AssetOut')], route=('GET', '/v1/assets/{asset_id}')),
    ]),
    ('profiles', 'Brands, Products and Characters', '品牌、产品与人物',
        profiles('brand', 'Brand', 'Brand', '品牌') + profiles('product', 'Product', 'Product', '产品') + [
        Method('products.delete', [ID('Product', '产品'), COMMAND], 'Promise<void>',
               ('Deletes the Product for everyone in the organization: it is no longer listed or readable, and what was made from it stays readable but cannot be revised. Deleting it again succeeds.',
                '为整个组织删除该产品：不再出现在列表中，也不能读取；已用它做出的内容仍可读取，但不能再修订。重复删除同样成功。'),
               route=('DELETE', '/v1/products/{product_id}')),
        ] + profiles('character', 'Character', 'Character', '人物')),
    ('scripts', 'Scripts', '脚本', [
        Method('scripts.generate', [P('input', 'ScriptInput', Zod('NewScriptInput')), OPTIONS], 'Promise<Script>',
               ('The writer writes a new Script for a Product and saves it.', '编写服务为产品写出一个新脚本并保存。'), output=SCRIPT_OUT),
        Method('scripts.get', [REF('script', 'Script', '脚本')], 'Promise<Script>',
               ('Reads a Script; its `content` is validated and decoded.', '读取脚本；其 <code>content</code> 已校验并解码。'), output=[Api('Script')],
               route=('GET', '/v1/artifacts/script/{artifact_id}')),
        Method('scripts.generateFrom', [BASE_REF('script', 'Script', '脚本'), P('input', 'ReviseScriptInput', Zod('ReviseScriptInput')), OPTIONS], 'Promise<Script>',
               ('The writer writes a new Script from `base`, as instructed, for the same Product.', '编写服务按指示从 <code>base</code> 写出一个新脚本，产品不变。'), output=[Api('Script')]),
        Method('scripts.createFrom', [BASE('script', 'Script', 'Script', '脚本'), P('changes', 'Partial<ScriptContent>', Zod('ScriptContent', partial=True)), OPTIONS], 'Promise<Script>',
               ('Saves a new Script with the top-level content fields you pass; the rest is copied from `base`, and it gets the same checks as a written Script.',
                '用传入的顶层内容字段保存一个新脚本，其余字段从 <code>base</code> 复制；它与编写服务写出的脚本经过相同检查。'), output=[Api('Script')]),
    ]),
    ('storyboards', 'Storyboards', '分镜', [
        Method('storyboards.generate', [P('input', 'StoryboardInput', Zod('NewStoryboardInput')), OPTIONS], 'Promise<Storyboard>',
               ('The writer casts and shoots a Script as a new Storyboard, with every clip\'s shots, and saves it.', '编写服务为脚本选角并编写拍法，生成包含每个片段镜头的新分镜并保存。'),
               output=STORYBOARD_OUT),
        Method('storyboards.get', [REF('storyboard', 'Storyboard', '分镜')], 'Promise<Storyboard>',
               ('Reads a Storyboard; its `content` is validated and decoded.', '读取分镜；其 <code>content</code> 已校验并解码。'), output=[Api('Storyboard')],
               route=('GET', '/v1/artifacts/storyboard/{artifact_id}')),
        Method('storyboards.generateFrom', [BASE_REF('storyboard', 'Storyboard', '分镜'), P('input', 'ReviseStoryboardInput', Zod('ReviseStoryboardInput')), OPTIONS], 'Promise<Storyboard>',
               ('The writer writes a new Storyboard from `base`, as instructed, for the same Script.', '编写服务按指示从 <code>base</code> 写出一个新分镜，脚本不变。'), output=[Api('Storyboard')]),
        Method('storyboards.createFrom', [BASE('storyboard', 'Storyboard', 'Storyboard', '分镜'), P('changes', 'Partial<Omit<StoryboardContent, "script">>', Zod('StoryboardContent', omit=('script',), partial=True)), OPTIONS], 'Promise<Storyboard>',
               ('Saves a new Storyboard with the top-level content fields you pass (`cast`, `direction`, `clips`); the rest, including its Script and the Product and Character versions, is copied from `base`.',
                '用传入的顶层内容字段（<code>cast</code>、<code>direction</code>、<code>clips</code>）保存一个新分镜；其余内容（包括脚本以及产品和人物版本）从 <code>base</code> 复制。'),
               output=[Api('Storyboard')],
               notes=[('An edit gets the same checks as the writer\'s Storyboards; content that fails them is refused with `422 REJECTED`, listing every problem.',
                       '编辑后的内容与编写服务写出的分镜经过相同检查；未通过时返回 <code>422 REJECTED</code>，并列出全部问题。')]),
    ]),
    ('prompts', 'Prompts', '提示词', [
        Method('prompts.get', [REF('prompt', 'Prompt', '提示词')], 'Promise<Prompt>',
               ('Reads a Prompt, for example the one a Job renders (`job.prompt`).', '读取提示词，例如任务所渲染的提示词（<code>job.prompt</code>）。'), output=PROMPT_OUT,
               route=('GET', '/v1/artifacts/prompt/{artifact_id}')),
        Method('prompts.generate', [P('input', 'PromptInput', Zod('GeneratePromptInput')), OPTIONS], 'Promise<{prompts: Prompt[]}>',
               ('Compiles a Storyboard\'s clips, or one clip, into saved Prompts in clip order; a clip compiled before from the same inputs returns its saved Prompt.',
                '将分镜的所有片段（或一个片段）按顺序编译为已保存的提示词；已用相同输入编译过的片段直接返回已保存的提示词。'),
               output=[Row('prompts', 'Prompt[]', True, 'One saved Prompt per clip, in clip order, each with `data.clip_id` naming its clip.',
                           '每个片段一条已保存的提示词，按片段顺序排列，每条的 <code>data.clip_id</code> 指明其片段。', link='out-Prompt')],
               notes=[('If some Prompts are saved and a later clip fails, it throws `PartialCreationError` with `saved.prompts`; retry with the same input and `idempotencyKey` to finish.',
                       '如果部分提示词已保存而之后的片段失败，会抛出带有 <code>saved.prompts</code> 的 <code>PartialCreationError</code>；使用相同输入和 <code>idempotencyKey</code> 重试即可完成。')]),
        Method('prompts.createFrom', [BASE('prompt', 'Prompt', 'Prompt', '提示词'),
                                      P('changes', 'PromptChanges', Api('PromptReadV1', only=('prompt', 'image_asset_ids', 'video_asset_ids', 'audio_asset_ids', 'seconds', 'ratio'), partial=True)), OPTIONS],
               'Promise<Prompt>',
               ('Saves a new Prompt from `base` with the render fields you pass; the rest is copied from `base`.', '用传入的渲染字段从 <code>base</code> 保存一个新提示词，其余字段从 <code>base</code> 复制。'),
               output=[Api('Prompt')], route=('POST', '/v1/artifacts/prompt/{artifact_id}/versions'), body='PromptVersionCreate',
               notes=[('Its text must name every attached file (see How a Prompt names its files); otherwise it is refused with `422 INVALID_PROMPT`. To change what a compiled clip shows, change its Storyboard and compile again instead.',
                       '其文本必须提到每个附带的文件（参见“提示词如何指代文件”），否则返回 <code>422 INVALID_PROMPT</code>。要修改已编译片段的内容，应修改分镜后重新编译。')]),
    ]),
    ('videos', 'Videos and Jobs', '视频与任务', [
        Method('videos.generate', [P('input', 'GenerateVideoInput', Api('GenerateVideo')), OPTIONS], 'Promise<Job<Asset>>',
               ('Starts a Job that renders one clip, from a saved Prompt (`prompt`) or from raw input (`input`), and returns it before the video is ready.',
                '启动一个渲染片段的任务，来源为已保存的提示词（<code>prompt</code>）或原始输入（<code>input</code>），在视频完成前返回。'),
               output=[Api('JobOut'), *JOB_METHODS], route=('POST', '/v1/generate/video'), body='GenerateVideo',
               notes=[('Give exactly one of `prompt` or `input`.', '<code>prompt</code> 和 <code>input</code> 只能且必须给出一个。')]),
        Method('jobs.get', [ID('Job', '任务')], 'Promise<JobState>', ('Reads a Job\'s current state.', '读取任务的当前状态。'), output=[Api('JobOut')],
               route=('GET', '/v1/jobs/{job_id}')),
        Method('jobs.subscribe', [ID('Job', '任务'), P('listener', '(state: JobState) => void', None, 'Called with each state, polled every `jobPollIntervalMs`, until the Job is `completed`, `failed` or `cancelled`.',
                                                     '按 <code>jobPollIntervalMs</code> 轮询，每个状态都会传入，直到任务为 <code>completed</code>、<code>failed</code> 或 <code>cancelled</code>。'),
                                  P('onError', '(error: NuvaErrorInfo) => void', None, 'Called when a poll fails; polling continues.', '某次轮询失败时调用；轮询继续。')],
               'Unsubscribe', ('Watches a Job; the returned function stops watching locally, not the Job.', '关注任务状态；返回的函数只停止本地关注，不会停止任务。')),
        Method('jobs.cancel', [ID('Job', '任务'), COMMAND], 'Promise<JobState>',
               ('Stops a queued or running Job, which ends `cancelled`; a finished Job cannot be cancelled (`JOB_FINISHED`).', '停止排队中或运行中的任务，任务以 <code>cancelled</code> 结束；已结束的任务不能取消（<code>JOB_FINISHED</code>）。'),
               output=[Api('JobOut')], route=('POST', '/v1/jobs/{job_id}/cancel')),
    ]),
    ('ads-batches', 'Ads and Batches', '成片广告与批次', [
        Method('ads.get', [ID('Ad', '广告')], 'Promise<Ad>', ('Reads a final Ad: its video and how it was put together.', '读取成片广告：其视频及合成方式。'),
               output=[Api('AdOut'), *links('ad', 'Added by the SDK: the id, for display.', '由 SDK 添加：用于展示的 ID。')], route=('GET', '/v1/ads/{ad_id}')),
        Method('ads.list', [LIST_QUERY(('GET', '/v1/ads'), 'batch_id')], 'Promise<BackendPage<Ad>>', ('Lists Ads, newest first, optionally of one Batch.', '按从新到旧列出广告，可只列出某个批次的广告。'),
               output=[Field('AdPage', 'items'), Field('AdPage', 'next_cursor'), NEXT], route=('GET', '/v1/ads')),
        Method('batches.get', [ID('Batch', '批次')], 'Promise<Batch>', ('Reads a Batch with its Ads and how many of its Jobs are in each status.', '读取批次，包括其广告和各状态的任务数量。'),
               output=[Api('BatchOut'), *links('batch', 'Added by the SDK: the Batch\'s `intent`, for display.', '由 SDK 添加：批次的 <code>intent</code>，用于展示。')], route=('GET', '/v1/batches/{batch_id}')),
        Method('batches.list', [LIST_QUERY(('GET', '/v1/batches'))], 'Promise<BackendPage<BatchSummary>>', ('Lists Batches, newest first.', '按从新到旧列出批次。'),
               output=[Api('BatchPage'), NEXT], route=('GET', '/v1/batches')),
    ]),
    ('skills', 'Skills', 'Skill', [
        Method('skills.get', [ID('Skill', 'Skill ')], 'Promise<Skill>', ('Reads a Skill and its main version, with download URLs for its files.', '读取 Skill 及其主版本，并附带文件下载地址。'),
               output=[Api('SkillDetail'), *links('skill', 'Added by the SDK: the Skill\'s `name`, for display.', '由 SDK 添加：Skill 的 <code>name</code>，用于展示。')], route=('GET', '/v1/skills/{skill_id}')),
        Method('skills.list', [LIST_QUERY(('GET', '/v1/skills'))], 'Promise<BackendPage<SkillOut>>', ('Lists the Skills you can use, newest first.', '按从新到旧列出你可使用的 Skill。'),
               output=[Api('SkillPage'), NEXT], route=('GET', '/v1/skills')),
        Method('skills.version', [ID('Skill', 'Skill '), P('version', 'number', None, 'The version\'s number, 1 or more.', '版本号，从 1 开始。')], 'Promise<SkillVersionOut>',
               ('Reads one version of a Skill, for example one that `skills` on a Script names.', '读取 Skill 的某个版本，例如脚本 <code>skills</code> 中所列的版本。'),
               output=[Api('SkillVersionOut')], route=('GET', '/v1/skills/{skill_id}/versions/{version}')),
    ]),
    ('shares', 'Shares', '共享', [
        Method('shares.set', [P('item', 'ShareTarget', Ts('ShareTarget')),
                              P('scope', 'string', None, '`customer` (everyone in the organization) or the external id of an org or group: 1–255 characters, without `/` or control characters.',
                                '<code>customer</code>（组织内所有人）或某个 org 或 group 的外部 ID：1–255 个字符，不含 <code>/</code> 或控制字符。'),
                              P('access', 'ShareAccess', None, '`read` lets everyone at or below the scope see and use the item; `write` also lets them edit it.',
                                '<code>read</code> 允许该范围内（含下级）的所有人查看和使用；<code>write</code> 还允许编辑。'), COMMAND], 'Promise<Share>',
               ('Shares the item with everyone at or below `scope`; a repeat changes the access. Only an admin of the scope or above shares into it.',
                '将内容共享给 <code>scope</code> 范围内（含下级）的所有人；重复调用会修改权限。只有该范围或上级范围的管理员可以共享到该范围。'),
               output=[Api('ShareOut')], route=('PUT', '/v1/shares/{kind}/{item_id}/{scope}'), body='ShareRequest'),
        Method('shares.list', [P('item', 'ShareTarget', Ts('ShareTarget'))], 'Promise<Share[]>',
               ('Lists an item\'s shares, for whoever may share it (its owner or an admin above them); others who can read it get `FORBIDDEN`.',
                '列出某项内容的共享，仅限可共享它的人（所有者或其上级管理员）；其他能读取它的人得到 <code>FORBIDDEN</code>。'),
               output=[Field('SharesOut', 'items', '[]')], route=('GET', '/v1/shares/{kind}/{item_id}')),
        Method('shares.remove', [P('item', 'ShareTarget', Ts('ShareTarget')), P('scope', 'string', None, 'The scope to stop sharing with.', '要停止共享的范围。'), COMMAND], 'Promise<void>',
               ('Removes the item\'s share with `scope`; it succeeds when there was none, and those it reached get `NOT_FOUND` again.', '移除内容与 <code>scope</code> 的共享；原本没有共享时同样成功，原先通过它访问的人再次得到 <code>NOT_FOUND</code>。'),
               route=('DELETE', '/v1/shares/{kind}/{item_id}/{scope}')),
    ]),
]

# Members of the Agent-side clients, documented briefly; behaviour is on the Agent page.
AGENT_METHODS = {
    'NuvaClient.agent': ('Binds the chat operations to one Session and returns its `AgentHandle`.', '将对话操作绑定到一个 Session，返回其 <code>AgentHandle</code>。'),
    'NuvaClient.close': ('Closes local connections and clears this client\'s state on logout or account change; server work continues.', '退出或切换账号时关闭本地连接并清除客户端状态；服务端工作继续。'),
    'SessionsClient.create': ('Creates a Session with a title.', '创建带标题的 Session。'),
    'SessionsClient.get': ('Reads a Session you can access.', '读取有权访问的 Session。'),
    'SessionsClient.list': ('Lists your Sessions; with `owner`, an admin lists those of a user below them.', '列出你的 Session；传入 <code>owner</code> 时，管理员列出其下级用户的 Session。'),
    'SessionsClient.getMessage': ('Reads one saved message by its `MessageRef`.', '按 <code>MessageRef</code> 读取一条已保存的消息。'),
    'SessionsClient.history': ('Reads saved messages, a page at a time, without a live handle.', '分页读取已保存的消息，无需实时 handle。'),
    'AgentHandle.sessionId': ('The Session this handle is bound to.', '该 handle 绑定的 Session。'),
    'AgentHandle.send': ('Sends a user message; returns a receipt once it is accepted. Replies arrive through `subscribe`.', '发送用户消息，被接受后返回回执；回复通过 <code>subscribe</code> 返回。'),
    'AgentHandle.stop': ('Stops the current Agent loop, and the Agent continuing on its own when watched Jobs finish; Jobs keep running.', '停止当前 Agent 循环，并让 Agent 在所关注的任务完成后不再自动继续；任务继续运行。'),
    'AgentHandle.subscribe': ('Receives the current Session state at once, then each update.', '立即收到当前 Session 状态，之后收到每次更新。'),
    'AgentHandle.refresh': ('Resynchronizes the state without resending anything.', '重新同步状态，不会重发任何内容。'),
    'AgentHandle.loadEarlierMessages': ('Adds older messages to the subscribed state.', '将更早的消息加入订阅状态。'),
    'AgentHandle.respond': ('Answers a pending client tool. The Ads Agent declares none, so this is not called today.', '答复待处理的客户端工具。Ads Agent 未声明客户端工具，目前不会用到。'),
    'AgentHandle.fail': ('Reports that a client tool could not be answered. Not used with the Ads Agent today.', '报告无法答复客户端工具。目前 Ads Agent 不会用到。'),
    'AgentHandle.onClientTool': ('Receives client tools. Never fires: the Ads Agent declares none.', '接收客户端工具。Ads Agent 未声明客户端工具，不会触发。'),
    'AgentHandle.onHostCall': ('Receives host calls. Never fires: the Ads Agent declares none.', '接收宿主调用。Ads Agent 未声明宿主调用，不会触发。'),
    'AgentHandle.listPendingCalls': ('Lists pending client-tool calls; empty for the Ads Agent.', '列出待处理的客户端工具调用；Ads Agent 为空。'),
    'AgentHandle.getHostCall': ('Reads a stored client-tool or host-call record; there are none for the Ads Agent.', '读取已保存的客户端工具或宿主调用记录；Ads Agent 没有此类记录。'),
    'AgentHandle.files': ('This Session\'s files: `files.get(id)` returns a `SessionFile`.', '本 Session 的文件：<code>files.get(id)</code> 返回 <code>SessionFile</code>。'),
    'SessionFilesClient.get': ('Reads a Session file\'s metadata and a signed URL to its bytes.', '读取 Session 文件的元数据和带签名的下载地址。'),
}

# Descriptions for members whose declaration has no TSDoc; TSDoc is used (and translated) otherwise.
TS_NOTES = {
    'NuvaClientOptions.onTrace': ('Receives SDK diagnostics for each request and event. Redact credentials and private content before keeping or sharing them.', '接收每个请求和事件的 SDK 诊断信息。保存或分享前应去除凭证和私有内容。'),
    'NuvaClientOptions.getAccessToken': ('Your callback that fetches a user token from your backend: `{token, expiresAt}` (or a bare token string, which has no expiry). The SDK caches it and calls this again before it expires; concurrent refreshes share one call.',
                                         '由你实现的回调，从你的后端获取用户令牌：<code>{token, expiresAt}</code>（或仅令牌字符串，此时没有过期时间）。SDK 会缓存令牌并在过期前再次调用；并发刷新共用一次调用。'),
    'NuvaClientOptions.jobPollIntervalMs': ('How often `subscribe` and `result` poll a Job\'s status, at least 10 ms.', '<code>subscribe</code> 和 <code>result</code> 轮询任务状态的间隔，至少 10 毫秒。'),
    'NuvaClientOptions.tokenRefreshSkewMs': ('How long before a token\'s `expiresAt` the SDK fetches a new one.', 'SDK 在令牌 <code>expiresAt</code> 之前多久获取新令牌。'),
    'AccessToken.token': ('The user token your backend issued with the Go Admin SDK.', '你的后端通过 Go Admin SDK 签发的用户令牌。'),
    'StoreCommandOptions.idempotencyKey': ('Makes this write safe to retry: the same key with the same input returns what the first call made; the same key with other input fails with `IDEMPOTENCY_CONFLICT`. 1–200 visible ASCII characters. Keep it for retries of one write; use a new one for a new write.',
                                           '让本次写入可安全重试：相同 key 和相同输入返回第一次调用的结果；相同 key 但输入不同时返回 <code>IDEMPOTENCY_CONFLICT</code>。1–200 个可见 ASCII 字符。同一次写入的重试保留同一个 key；新的写入使用新 key。'),
    'ShareTarget.kind': ('What the item is. Batches, Jobs and Ads are never shared.', '内容的类型。批次、任务和广告不能共享。'),
    'ShareTarget.id': ('The item\'s id; for an Artifact, the id of any of its versions (a share covers them all).', '内容的 ID；产物可使用其任一版本的 ID（共享覆盖所有版本）。'),
    'EntityRef.id': ('The record\'s id.', '记录的 ID。'),
    'EntityRef.version': ('The version you read.', '读取到的版本。'),
    'SessionFile.label': ('A short name for display.', '用于展示的简短名称。'),
}
# Members whose TSDoc does not describe them for a customer (it is replaced, not translated).
TS_OVERRIDES = {
    'NuvaClientOptions.getAccessToken': TS_NOTES.pop('NuvaClientOptions.getAccessToken'),
    'NuvaClientOptions.requestTimeoutMs': ('A deadline for each request, in milliseconds, instead of the defaults; `job.result({timeoutMs})` bounds the wait for a Job separately.',
                                           '每个请求的超时（毫秒），替代默认值；等待任务完成的时长由 <code>job.result({timeoutMs})</code> 另行控制。'),
    'StoreCommandOptions.requestId': ('Correlates this request in traces and errors (sent as `X-Request-ID`); generated when left out. It is not an idempotency key: use `idempotencyKey` to make a write safe to retry.',
                                      '在诊断信息和错误中关联本次请求（以 <code>X-Request-ID</code> 发送）；省略时自动生成。它不是幂等 key：要让写入可安全重试，请使用 <code>idempotencyKey</code>。'),
    'CommandOptions.requestId': ('Correlates this request in traces and errors (sent as `X-Request-ID`); generated when left out. It does not make a write safe to retry.',
                                 '在诊断信息和错误中关联本次请求（以 <code>X-Request-ID</code> 发送）；省略时自动生成。它不能让写入安全重试。'),
}
TS_TYPES = {
    'NuvaClientOptions.onTrace': '(trace: TraceEntry) => void',
    'NuvaClientOptions.onWireTrace': '(trace: WireTraceEntry) => void | Promise<void>',
    'NuvaClientOptions.getAccessToken': '() => Promise<string | AccessToken>',
    'AccessToken.principal': '{customerId: string, userId: string}',
}
TS_DEFAULTS = {
    'NuvaClientOptions.environment': '"sandbox"',
    'NuvaClientOptions.requestTimeoutMs': ('8000; 180000 for scripts.*, assets.upload; 300000 for storyboards.*, prompts.generate',
                                          '8000；scripts.*、assets.upload 为 180000；storyboards.*、prompts.generate 为 300000'),
    'NuvaClientOptions.jobPollIntervalMs': '500',
    'NuvaClientOptions.tokenRefreshSkewMs': '30000',
}
# Query parameters the contract leaves undescribed.
QUERY_NOTES = {
    'limit': ('How many items a page holds.', '每页包含的条数。'),
    'version': ('A version to read instead of the latest.', '要读取的版本；省略时读取最新版本。'),
    'brand_id': ('Only the Products of this Brand.', '只列出该品牌的产品。'),
    'batch_id': ('Only the Ads of this Batch.', '只列出该批次的广告。'),
}
# Fields of the zod schemas that have no `.describe()`: (schema, path) -> (English, Chinese).
ZOD_NOTES = {
    ('NewScriptInput', 'batch_id'): ('One of your Batches to make the Script in; its Storyboards, Prompts and Jobs follow it.', '脚本所属的批次（须为你的批次）；其分镜、提示词和任务沿用该批次。'),
    ('NewScriptInput', 'acceptable_duration_ms'): ('The length the ad may have, in milliseconds; the writer picks `duration_ms` within it.', '广告允许的时长范围（毫秒）；编写服务在此范围内确定 <code>duration_ms</code>。'),
    ('NewScriptInput', 'acceptable_duration_ms.min'): ('The shortest length, in milliseconds; at most `max`.', '最短时长（毫秒），不大于 <code>max</code>。'),
    ('NewScriptInput', 'acceptable_duration_ms.max'): ('The longest length, in milliseconds.', '最长时长（毫秒）。'),
    ('NewScriptInput', 'instruction'): ('What you want, in words: output language, creative direction, required lines. It may name files with `{{asset:<id>}}` or `{{product:<id>}}` tokens; one you may not use is refused with `422` before anything is written.',
                                        '用文字说明要求：输出语言、创意方向、必需的台词等。可以用 <code>{{asset:&lt;id&gt;}}</code> 或 <code>{{product:&lt;id&gt;}}</code> 标记指定文件；无权使用的文件会在写入前返回 <code>422</code>。'),
    ('ReviseScriptInput', 'instruction'): ('What to change, in words.', '用文字说明要修改的内容。'),
    ('ReviseScriptInput', 'acceptable_duration_ms'): ('A new length range, in milliseconds; left out, the new Script keeps the base\'s length.', '新的时长范围（毫秒）；省略时新脚本保持 base 的时长。'),
    ('ReviseScriptInput', 'acceptable_duration_ms.min'): ('The shortest length, in milliseconds; at most `max`.', '最短时长（毫秒），不大于 <code>max</code>。'),
    ('ReviseScriptInput', 'acceptable_duration_ms.max'): ('The longest length, in milliseconds.', '最长时长（毫秒）。'),
    ('NewStoryboardInput', 'script'): ('The Script to shoot. A Script saved before Storyboards (`format: 2`) is refused.', '要拍摄的脚本。分镜功能推出前保存的脚本（<code>format: 2</code>）会被拒绝。'),
    ('NewStoryboardInput', 'instruction'): ('The shooting style you want, in words. It may name files with tokens, as in `scripts.generate`.', '用文字说明想要的拍摄风格。可以像 <code>scripts.generate</code> 一样用标记指定文件。'),
    ('NewStoryboardInput', 'batch_id'): ('Only for a Script without a Batch: the Batch to make it in. Otherwise the Storyboard keeps its Script\'s Batch.', '仅用于没有批次的脚本：分镜所属的批次。否则分镜沿用脚本的批次。'),
    ('ReviseStoryboardInput', 'instruction'): ('What to change, in words.', '用文字说明要修改的内容。'),
    ('GeneratePromptInput', 'storyboard'): ('The Storyboard whose clips to compile.', '要编译其片段的分镜。'),
    ('GeneratePromptInput', 'ratio'): ('The frame of every Prompt compiled. `adaptive` follows the first image or video.', '所编译的每条提示词的画面比例。<code>adaptive</code> 跟随第一张图片或第一个视频。'),
    ('ScriptContent', 'schema_version'): ('The format of the content: 3.', '内容格式版本：3。'),
    ('ScriptContent', 'concept'): ('The idea of the ad.', '广告的创意。'),
    ('ScriptContent', 'concept.name'): ('A short name for the concept.', '创意的简短名称。'),
    ('ScriptContent', 'concept.category'): ('The product category the writing follows.', '编写所依据的产品品类。'),
    ('ScriptContent', 'concept.purchase_task'): ('The specific product type and the buying task.', '具体的产品类型和购买任务。'),
    ('ScriptContent', 'concept.proposition'): ('The ad\'s argument, in one sentence.', '用一句话说明广告的主张。'),
    ('ScriptContent', 'concept.route'): ('How the ad shows its argument.', '广告如何呈现其主张（表现路线）。'),
    ('ScriptContent', 'concept.route_reason'): ('Why that form fits this product.', '为什么这种形式适合该产品。'),
    ('ScriptContent', 'concept.speaker_relation'): ('Who speaks to whom, and in what register.', '谁对谁说话，以及说话的口吻。'),
    ('ScriptContent', 'beats'): ('The steps of the argument in order, `B01`, `B02`, …: each a change in what the viewer understands or feels.', '按顺序排列的论证步骤 <code>B01</code>、<code>B02</code>…：每一步是观众理解或态度的一次变化。'),
    ('ScriptContent', 'beats[].id'): ('`B01`, `B02`, …', '<code>B01</code>、<code>B02</code>…'),
    ('ScriptContent', 'beats[].purpose'): ('What the viewer learns or how their view changes at this beat.', '观众在这一步了解到什么，或看法如何变化。'),
    ('ScriptContent', 'beats[].fact_ids'): ('The facts (`facts[].id`) the beat relies on.', '这一步依据的事实（<code>facts[].id</code>）。'),
    ('ScriptContent', 'roles'): ('Who takes part. The Product and the narrator are not roles.', '参与者。产品和旁白（narrator）不是角色。'),
    ('ScriptContent', 'roles[].id'): ('A short lowercase word, such as `presenter`; `narrator`, `product` and `asset` are reserved. Storyboard `cast` keys and tokens such as `{{presenter}}` use it.',
                                      '简短的小写单词，例如 <code>presenter</code>；<code>narrator</code>、<code>product</code> 和 <code>asset</code> 为保留字。分镜 <code>cast</code> 的键和 <code>{{presenter}}</code> 之类的标记使用它。'),
    ('ScriptContent', 'roles[].name'): ('The role\'s name.', '角色名称。'),
    ('ScriptContent', 'roles[].description'): ('Who they are for the idea: age range, relationship, persona. Not their looks: the Storyboard casts them.', '角色在创意中的身份：年龄段、关系、人设。不包括外貌，外貌由分镜选角决定。'),
    ('ScriptContent', 'roles[].speaks'): ('Whether the role has lines.', '该角色是否有台词。'),
    ('ScriptContent', 'panels'): ('The story in order, `P01`, `P02`, …, following the beats; every beat has at least one panel.', '按顺序排列的故事 <code>P01</code>、<code>P02</code>…，与 beats 顺序一致；每个 beat 至少有一个 panel。'),
    ('ScriptContent', 'panels[].id'): ('`P01`, `P02`, …', '<code>P01</code>、<code>P02</code>…'),
    ('ScriptContent', 'panels[].beat_id'): ('The beat this panel belongs to.', '该 panel 所属的 beat。'),
    ('ScriptContent', 'panels[].on_screen'): ('The roles who must be seen, and `product` when the Product must be seen.', '必须出镜的角色；产品必须出现时加上 <code>product</code>。'),
    ('ScriptContent', 'panels[].action'): ('What happens, in order, and when each line is said.', '按顺序描述发生的动作，以及每句台词在何时说出。'),
    ('ScriptContent', 'panels[].fact_ids'): ('The facts the panel shows or says.', '该 panel 展示或说出的事实。'),
    ('ScriptContent', 'panels[].lines[].id'): ('`L01`, `L02`, … through the whole Script; a Storyboard shot speaks it as `{{L01}}`.', '整个脚本统一编号的 <code>L01</code>、<code>L02</code>…；分镜镜头用 <code>{{L01}}</code> 说出该台词。'),
    ('ScriptContent', 'panels[].lines[].speaker'): ('A role id, or `narrator`.', '角色 ID 或 <code>narrator</code>。'),
    ('ScriptContent', 'panels[].lines[].mode'): ('`on_camera` (said on screen), `dialogue` (said to another role on screen) or `voiceover` (heard, speaker not seen).', '<code>on_camera</code>（出镜说出）、<code>dialogue</code>（在镜头中对另一角色说）或 <code>voiceover</code>（画外音，说话人不出镜）。'),
    ('ScriptContent', 'panels[].lines[].text'): ('The exact words.', '准确的台词文字。'),
    ('ScriptContent', 'facts'): ('Set by the service: the Product facts the Script may use, each with where it came from.', '由服务设置：脚本可使用的产品事实及其来源。'),
    ('ScriptContent', 'facts[].id'): ('Which Product field the fact comes from.', '事实来自产品的哪个字段。'),
    ('ScriptContent', 'facts[].claim'): ('The fact as the Script may state it.', '脚本中可使用的事实表述。'),
    ('ScriptContent', 'facts[].source_field'): ('The Product field it was read from.', '读取该事实的产品字段。'),
    ('ScriptContent', 'facts[].source_excerpt'): ('The text it was read from.', '读取该事实的原文。'),
    ('ScriptContent', 'images'): ('Set by the service: the Product images the writer saw.', '由服务设置：编写服务看到的产品图片。'),
    ('ScriptContent', 'images[].asset_id'): ('The image\'s Asset id.', '图片的 Asset ID。'),
    ('ScriptContent', 'images[].role'): ('What the image is for: the Product\'s appearance.', '图片用途：产品外观。'),
    ('ScriptContent', 'images[].mime_type'): ('The image\'s MIME type.', '图片的 MIME 类型。'),
    ('ScriptContent', 'images[].url'): ('The URL the writer read it from.', '编写服务读取图片时使用的地址。'),
    ('ScriptContent', 'instruction'): ('Set by the service: the instruction the Script was written with.', '由服务设置：编写该脚本时使用的 instruction。'),
    ('StoryboardContent', 'clips'): ('The clips in order, `C01`, `C02`, …; each becomes one video. Together they last the Script\'s `duration_ms`, within 15% (at least 2 seconds).',
                                     '按顺序排列的片段 <code>C01</code>、<code>C02</code>…，每个片段生成一条视频。片段总时长与脚本 <code>duration_ms</code> 相差不超过 15%（至少允许 2 秒）。'),
    ('StoryboardContent', 'clips[].id'): ('`C01`, `C02`, … in order.', '按顺序编号 <code>C01</code>、<code>C02</code>…'),
    ('StoryboardContent', 'clips[].duration_ms'): ('The clip\'s length, 5 to 15 seconds.', '片段时长，5 到 15 秒。'),
}
# Notes added after a contract field's own description, where the SDK changes how it is used: source -> (English, Chinese).
FIELD_NOTES = {
    'Script.data.text': ('The SDK decodes it into `content` (or `legacy`): read those.', 'SDK 会将其解码到 <code>content</code>（或 <code>legacy</code>），请读取后者。'),
    'Storyboard.data.text': ('The SDK decodes it into `content`: read that.', 'SDK 会将其解码到 <code>content</code>，请读取后者。'),
}
MAP_KEYS = {'cast': '<role>', 'jobs': '<status>'}


# ── Walking JSON Schema (OpenAPI components and zod output alike) ────────

def unwrap(node, defs):
    """The schema a property stands for: (schema, nullable, component name)."""
    nullable = False
    for key in ('anyOf', 'oneOf'):
        if key in node and 'properties' not in node:
            branches = [branch for branch in node[key] if branch.get('type') != 'null']
            nullable = len(branches) < len(node[key])
            if len(branches) == 1:
                inner, more, name = unwrap(branches[0], defs)
                return inner, nullable or more, name
            return {'anyOf': branches}, nullable, None
    ref = node.get('$ref')
    if ref is not None:
        name = ref.rsplit('/', 1)[-1]
        return defs[name], nullable, name
    return node, nullable, None


def is_object(schema):
    return bool(schema.get('properties'))


def map_values(schema):
    values = schema.get('additionalProperties')
    return values if isinstance(values, dict) and values else None


def limits(schema, defs):
    """Limits as (kind, …) tuples, rendered per locale."""
    out = []
    kind = schema.get('type')
    if schema.get('pattern') == ID_PATTERN or schema.get('format') == 'uuid':
        return out
    if kind == 'string' or 'minLength' in schema or 'maxLength' in schema:
        if 'minLength' in schema or 'maxLength' in schema:
            out.append(('chars', schema.get('minLength'), schema.get('maxLength')))
        if 'pattern' in schema:
            out.append(('pattern', schema['pattern']))
    if kind == 'array':
        if 'minItems' in schema or 'maxItems' in schema:
            out.append(('items', schema.get('minItems'), schema.get('maxItems')))
        item, _, name = unwrap(schema.get('items', {}), defs)
        if name is None and not is_object(item):
            each = limits(item, defs)
            if each:
                out.append(('each', each))
    if kind in ('integer', 'number'):
        low = schema.get('minimum', schema.get('exclusiveMinimum'))
        high = schema.get('maximum')
        high = None if high == SAFE_INTEGER else high
        if low is not None or high is not None:
            out.append(('range', low, high, 'exclusiveMinimum' in schema))
    names = schema.get('propertyNames', {})
    if 'maxLength' in names:
        out.append(('keys', [('chars', names.get('minLength'), names['maxLength'])]))
    return out


def number(value):
    return f'{int(value):,}' if float(value).is_integer() else str(value)


def render_limits(items, locale):
    zh = locale == 'zh'
    parts = []
    for item in items:
        kind = item[0]
        if kind in ('chars', 'items'):
            low, high = item[1], item[2]
            unit = ('个字符' if kind == 'chars' else '项') if zh else ('characters' if kind == 'chars' else 'items')
            if low is not None and high is not None:
                parts.append(f'{number(low)}–{number(high)} {unit}')
            elif high is not None:
                parts.append(f'最多 {number(high)} {unit}' if zh else f'≤ {number(high)} {unit}')
            elif low:
                parts.append(f'至少 {number(low)} {unit}' if zh else f'{number(low)} or more {unit}')
        elif kind == 'pattern':
            parts.append('<code>' + escape(item[1]) + '</code>')
        elif kind == 'range':
            low, high, exclusive = item[1], item[2], item[3]
            if low is not None and high is not None:
                parts.append(f'{number(low)}–{number(high)}')
            elif low is not None:
                parts.append(('&gt; ' if exclusive else '≥ ') + number(low))
            else:
                parts.append('≤ ' + number(high))
        elif kind == 'each':
            parts.append(('每项：' if zh else 'each: ') + render_limits(item[1], locale))
        elif kind == 'keys':
            parts.append(('键：' if zh else 'keys: ') + render_limits(item[1], locale))
    return '; '.join(part for part in parts if part)


class Walker:
    """Expands schemas into rows. A named object is shown in full once per direction; later uses link to it."""

    def __init__(self):
        self.anchors = {}
        self.problems = []
        self.used = set()  # English strings translated through reference_zh.json
        self.notes_used = set()

    def anchor(self, direction, name):
        return f'{direction}-{name}'

    def type_html(self, node, defs, direction):
        schema, nullable, name = unwrap(node, defs)
        text = self.base_type(schema, name, defs, direction)
        return text + (' | null' if nullable else '')

    def base_type(self, schema, name, defs, direction):
        if 'anyOf' in schema:
            return ' | '.join(self.type_html(branch, defs, direction) for branch in schema['anyOf'])
        if 'const' in schema:
            return escape(json.dumps(schema['const']))
        if 'enum' in schema:
            return ' | '.join(escape(json.dumps(value)) for value in schema['enum'])
        kind = schema.get('type')
        if kind == 'array':
            item = self.type_html(schema.get('items', {}), defs, direction)
            return (f'({item})' if ' | ' in item else item) + '[]'
        if is_object(schema):
            if name is None:
                return 'object'
            key = self.anchor(direction, name)
            return f'<a href="#{key}">{escape(name)}</a>' if key in self.anchors else escape(name)
        values = map_values(schema)
        if kind == 'object' or values is not None or 'additionalProperties' in schema:
            if values is not None and unwrap(values, defs)[0] != {}:
                return '{[key]: ' + self.type_html(values, defs, direction) + '}'
            return 'JSON object'
        if kind == 'string':
            fmt = schema.get('format')
            if fmt == 'uuid' or schema.get('pattern') == ID_PATTERN:
                return 'string (UUID)'
            if fmt == 'date-time':
                return 'string (date-time)'
            if fmt == 'uri':
                return 'string (URL)'
            return 'string'
        if kind is None:
            return 'JSON'
        return kind

    def description(self, prop, defs, source):
        text = prop.get('description')
        if text is None:
            schema, _, name = unwrap(prop, defs)
            if name is None and schema is not prop:
                text = schema.get('description')
            if text is None and schema.get('type') == 'array':
                item, _, item_name = unwrap(schema.get('items', {}), defs)
                if item_name is None:
                    text = item.get('description')
        return T(text, source=source) if text else None

    def component_note(self, name, schema, source):
        text = schema.get('description')
        return [T(' '.join(text.split()), source=source + ' (component)')] if text else []

    def fields(self, schema, defs, direction, rows, prefix='', omit=(), only=None, partial=False, source='', notes=None):
        schema, _, _ = unwrap(schema, defs)
        required = set(schema.get('required', ()))
        for key, prop in schema.get('properties', {}).items():
            if key in omit or (only is not None and key not in only):
                continue
            path = f'{prefix}.{key}' if prefix else key
            self.field(prop, defs, direction, rows, path, key in required and not partial, f'{source}.{key}', notes)

    def field(self, prop, defs, direction, rows, path, required, source, notes=None, desc=None):
        schema, nullable, name = unwrap(prop, defs)
        if desc is None:
            desc = self.description(prop, defs, source)
        if desc is None and notes is not None:
            note = notes.get(path)
            if note is not None:
                desc = T(*note, source=source)
                self.notes_used.add((notes['__name__'], path))
        elif desc is not None and notes is not None and path in notes:
            self.problems.append(f'{source}: has a description in the schema, so ZOD_NOTES[{notes["__name__"]!r}, {path!r}] is not needed.')
        row = {'path': path, 'type': self.type_html(prop, defs, direction), 'required': required, 'default': prop.get('default', schema.get('default')),
               'limits': limits(schema, defs), 'desc': [desc] if desc else [], 'id': None, 'source': source}
        if source in FIELD_NOTES:
            row['desc'].append(T(*FIELD_NOTES[source], source=source))
            self.notes_used.add('field:' + source)
        if not row['desc']:
            self.problems.append(f'{source}: no description (field {path}).')
        rows.append(row)
        # Expand what it holds: an object, the objects of an array, or the values of a map.
        target, target_name, child = None, None, None
        if is_object(schema):
            target, target_name, child = schema, name, path
        elif schema.get('type') == 'array':
            item, _, item_name = unwrap(schema.get('items', {}), defs)
            if is_object(item):
                target, target_name, child = item, item_name, path + '[]'
        elif map_values(schema) is not None:
            value, _, value_name = unwrap(map_values(schema), defs)
            if is_object(value):
                key = MAP_KEYS.get(path.rsplit('.', 1)[-1].rstrip('[]'), '<id>')
                target, target_name, child = value, value_name, f'{path}.{key}'
        if target is None:
            return
        if target_name is not None:
            key = self.anchor(direction, target_name)
            if key in self.anchors:
                return
            self.anchors[key] = path
            row['id'] = key
            row['desc'] += self.component_note(target_name, target, f'{source}:{target_name}')
        self.fields(target, defs, direction, rows, child, source=source, notes=notes)


# ── The model of the page ────────────────────────────────────────────────

def components():
    return openapi()['components']['schemas']


def ts_members(name):
    members = contract()['clients'].get(name)
    if members is None:
        raise KeyError(f'reference_contract.mjs does not report {name}.')
    return members


def ts_rows(walker, spec, direction):
    rows = []
    for member in ts_members(spec.name):
        if member['name'] in spec.omit:
            continue
        key = f'{spec.name}.{member["name"]}'
        method = member['kind'] == 'method'
        path = member['name'] + ('()' if method else '')
        type_ = TS_TYPES.get(key) or (member.get('type') if not method else None)
        if type_ is None:
            walker.problems.append(f'{key}: no type to show; add it to TS_TYPES.')
            type_ = ''
        if key in TS_OVERRIDES:
            desc = T(*TS_OVERRIDES[key], source=key)
            walker.notes_used.add('override:' + key)
            if not member.get('doc'):
                walker.problems.append(f'{key}: has no TSDoc to replace; move it from TS_OVERRIDES to TS_NOTES.')
        elif member.get('doc'):
            desc = T(member['doc'], source=key)
            if key in TS_NOTES:
                walker.problems.append(f'{key}: has TSDoc, so TS_NOTES[{key!r}] is not needed.')
        elif key in TS_NOTES:
            desc = T(*TS_NOTES[key], source=key)
            walker.notes_used.add(key)
        else:
            desc = None
            walker.problems.append(f'{key}: no TSDoc and no TS_NOTES entry.')
        default = TS_DEFAULTS.get(key)
        if default is not None:
            walker.notes_used.add('default:' + key)
        rows.append({'path': path, 'type': escape(type_), 'required': not member.get('optional', False), 'default': default, 'limits': [],
                     'desc': [desc] if desc else [], 'id': None, 'source': key, 'raw_default': True})
    return rows


def query_rows(walker, spec, route):
    rows = []
    method, path = route
    operation = openapi()['paths'].get(path, {}).get(method.lower())
    if operation is None:
        walker.problems.append(f'{method} {path}: no such route in backend.openapi.json.')
        return rows
    sdk_names = {member['name'] for member in ts_members('StoreQuery')}
    parameters = {parameter['name']: parameter for parameter in operation.get('parameters', []) if parameter['in'] == 'query'}
    for name in spec.names:
        parameter = parameters.get(name)
        if parameter is None:
            walker.problems.append(f'{method} {path}: takes no query parameter {name}.')
            continue
        if name != 'version' and name not in sdk_names:
            walker.problems.append(f'StoreQuery has no {name}.')
        schema = parameter['schema']
        text = parameter.get('description') or schema.get('description')
        if text:
            desc = T(text, source=f'{path}?{name}')
        elif name in QUERY_NOTES:
            desc = T(*QUERY_NOTES[name], source=f'{path}?{name}')
            walker.notes_used.add('query:' + name)
        else:
            desc = None
            walker.problems.append(f'{method} {path}: query parameter {name} has no description and no QUERY_NOTES entry.')
        inner, _, _ = unwrap(schema, {})
        rows.append({'path': name, 'type': walker.type_html(schema, {}, 'in'), 'required': False, 'default': schema.get('default'),
                     'limits': limits(inner, {}), 'desc': [desc] if desc else [], 'id': None, 'source': f'{path}?{name}'})
    return rows


def spec_rows(walker, specs, direction, method):
    """Rows for a list of specs. Returns (rows, same_as): same_as names an earlier full expansion to link to instead."""
    if not isinstance(specs, list):
        specs = [specs]
    rows = []
    first = specs[0] if specs else None
    plain = isinstance(first, (Api, Ts)) and not getattr(first, 'omit', ()) and getattr(first, 'only', None) is None and not getattr(first, 'partial', False) and not getattr(first, 'prefix', '')
    if plain:
        key = walker.anchor(direction, first.name)
        if key in walker.anchors:
            return [], key
        walker.anchors[key] = method
    for spec in specs:
        if isinstance(spec, Zod):
            schema = contract()['zod'].get(spec.name)
            if schema is None:
                walker.problems.append(f'reference_contract.mjs does not report the zod schema {spec.name}.')
                continue
            notes = {path: note for (name, path), note in ZOD_NOTES.items() if name == spec.name}
            # A prefix moves the rows under it; the notes keep their unprefixed paths.
            local = []
            notes['__name__'] = spec.name
            walker.fields(schema, schema.get('$defs', {}), direction, local, '', spec.omit, spec.only, spec.partial, f'zod:{spec.name}', notes)
            for row in local:
                if spec.prefix:
                    row['path'] = spec.prefix + '.' + row['path']
            rows += local
        elif isinstance(spec, Api):
            schema = components().get(spec.name)
            if schema is None:
                walker.problems.append(f'backend.openapi.json has no schema {spec.name}.')
                continue
            walker.fields(schema, components(), direction, rows, spec.prefix, spec.omit, spec.only, spec.partial, spec.name)
        elif isinstance(spec, Ts):
            rows += ts_rows(walker, spec, direction)
        elif isinstance(spec, Query):
            rows += query_rows(walker, spec, spec.route or method_route(method))
        elif isinstance(spec, Field):
            schema = components().get(spec.schema)
            prop = (schema or {}).get('properties', {}).get(spec.name)
            if prop is None:
                walker.problems.append(f'backend.openapi.json has no field {spec.schema}.{spec.name}.')
                continue
            required = spec.required if spec.required is not None else spec.name in schema.get('required', ())
            walker.field(prop, components(), direction, rows, spec.path, required, f'{spec.schema}.{spec.name}', desc=spec.note)
        elif isinstance(spec, Row):
            type_ = f'<a href="#{spec.link}">{escape(spec.type)}</a>' if spec.link else escape(spec.type)
            row = {'path': spec.path, 'type': type_, 'required': spec.required, 'default': spec.default or None, 'limits': [],
                   'desc': [spec.desc], 'id': None, 'source': f'{method}:{spec.path}', 'raw_default': True}
            rows.append(row)
    return rows, None


ROUTES = {}


def method_route(method):
    return ROUTES.get(method)


def build_model():
    """Rows for the whole page, expanded in page order so a type is shown in full where it first appears."""
    walker = Walker()
    model = {'sections': [], 'walker': walker}
    model['errors'] = spec_rows(walker, [Api('Error'), Field('ErrorResponse', 'request_id', 'requestId', required=False),
                                         Row('saved', '{prompts: Prompt[]}', False, 'For `PARTIAL_CREATION` only (`PartialCreationError`): the Prompts saved before a later clip failed.',
                                             '仅用于 <code>PARTIAL_CREATION</code>（<code>PartialCreationError</code>）：之后的片段失败前已保存的提示词。')], 'out', 'errors')[0]
    model['options'] = options_model(walker)
    model['session_file'] = ts_rows(walker, Ts('SessionFile'), 'out')
    model['agent'] = agent_model(walker)
    for section, en, zh, methods in SECTIONS:
        items = []
        for method in methods:
            ROUTES[method.path] = method.route
        for method in methods:
            items.append(method_model(walker, method))
        model['sections'].append((section, en, zh, items))
    return model


def options_model(walker):
    rows = {}
    for name in ('NuvaClientOptions', 'AccessToken', 'StoreCommandOptions', 'CommandOptions'):
        rows[name] = spec_rows(walker, Ts(name), 'in', 'options')[0]
    return rows


def method_model(walker, method):
    params = []
    tables = []
    for param in method.params:
        spec = param.spec
        if spec is None:
            params.append((param, None))
            continue
        specs = spec if isinstance(spec, list) else [spec]
        rows, same = spec_rows(walker, specs, 'in', method.path)
        key = walker.anchor('in', specs[0].name) if isinstance(specs[0], (Api, Ts)) else None
        params.append((param, same or (key if key in walker.anchors and walker.anchors[key] == method.path else None)))
        if rows:
            tables.append((param.name, rows, key if key in walker.anchors and walker.anchors[key] == method.path else None))
    output, same = (spec_rows(walker, method.output, 'out', method.path) if method.output else ([], None))
    out_key = walker.anchor('out', method.output[0].name) if method.output and isinstance(method.output[0], (Api, Ts)) else None
    return {'method': method, 'params': params, 'tables': tables, 'output': output, 'same': same,
            'out_anchor': out_key if out_key and walker.anchors.get(out_key) == method.path else None}


def agent_model(walker):
    entries = []
    for interface, prefix in (('NuvaClient', 'client'), ('SessionsClient', 'client.sessions'), ('AgentHandle', 'agent'), ('SessionFilesClient', 'agent.files')):
        store = set(contract()['clients']['StoreClients'])
        for member in ts_members(interface):
            if interface == 'NuvaClient' and (member['name'] in store or member['name'] == 'sessions'):
                continue
            key = f'{interface}.{member["name"]}'
            purpose = AGENT_METHODS.get(key)
            if purpose is None:
                walker.problems.append(f'{key}: a public member missing from AGENT_METHODS.')
                continue
            walker.notes_used.add('agent:' + key)
            if member['kind'] == 'method':
                signature = f'{prefix}.{member["name"]}(' + ', '.join(p['name'] + ('?' if p['optional'] else '') for p in member['parameters']) + ')'
            else:
                signature = f'{prefix}.{member["name"]}'
            entries.append((signature, T(*purpose)))
    return entries


# ── Checks ───────────────────────────────────────────────────────────────

def check_methods(walker):
    store = contract()['clients']['StoreClients']
    mapped = {method.path: method for _, _, _, methods in SECTIONS for method in methods}
    for client, members in store.items():
        for member in members:
            path = f'{client}.{member["name"]}'
            method = mapped.pop(path, None)
            if method is None:
                walker.problems.append(f'{path}: a public method of StoreClients missing from METHODS.')
                continue
            declared = [(p['name'], p['optional']) for p in member['parameters']]
            listed = [param.name for param in method.params]
            if [name for name, _ in declared] != listed:
                walker.problems.append(f'{path}: METHODS lists parameters {listed}; stores.ts declares {[name for name, _ in declared]}.')
            method.optional = {name for name, optional in declared if optional}
    for path in mapped:
        walker.problems.append(f'{path}: in METHODS but not a method of StoreClients.')
    job = {member['name'] for member in ts_members('Job')}
    documented = {row.path.split('(')[0] for row in JOB_METHODS}
    if job != documented:
        walker.problems.append(f'Job methods are {sorted(job)}; JOB_METHODS documents {sorted(documented)}.')
    for key in AGENT_METHODS:
        if 'agent:' + key not in walker.notes_used:
            walker.problems.append(f'AGENT_METHODS[{key!r}]: no such public member.')


def check_routes(walker):
    """Each mapped schema matches its backend route: request body and success response."""
    paths = openapi()['paths']
    for _, _, _, methods in SECTIONS:
        for method in methods:
            if method.route is None:
                continue
            verb, path = method.route
            operation = paths.get(path, {}).get(verb.lower())
            if operation is None:
                walker.problems.append(f'{method.path}: {verb} {path} is not in backend.openapi.json.')
                continue
            body = operation.get('requestBody', {}).get('content', {}).get('application/json', {}).get('schema', {}).get('$ref', '').rsplit('/', 1)[-1] or None
            if body != method.body:
                walker.problems.append(f'{method.path}: {verb} {path} takes {body}; METHODS says {method.body}.')
            success = [response for status, response in operation['responses'].items() if status.startswith('2')]
            returned = {response.get('content', {}).get('application/json', {}).get('schema', {}).get('$ref', '').rsplit('/', 1)[-1] for response in success}
            first = method.output[0] if method.output else None
            expected = first.name if isinstance(first, Api) else (first.schema if isinstance(first, Field) else '')
            if returned != {expected}:
                walker.problems.append(f'{method.path}: {verb} {path} returns {sorted(returned)}; METHODS says {expected or "nothing"}.')


def check_text(walker, model, rows_iter):
    zh = translations()
    for row in rows_iter:
        for desc in row['desc']:
            if desc.zh is None:
                walker.used.add(desc.en)
                if desc.en not in zh:
                    walker.problems.append(f'{desc.source}: no Chinese in reference_zh.json for "{desc.en}".')
    for key in zh:
        if key not in walker.used:
            walker.problems.append(f'reference_zh.json: "{key}" is not used.')
    for (name, path) in ZOD_NOTES:
        if (name, path) not in walker.notes_used:
            walker.problems.append(f'ZOD_NOTES[{name!r}, {path!r}]: no such field without a description.')
    for key in TS_NOTES:
        if key not in walker.notes_used:
            walker.problems.append(f'TS_NOTES[{key!r}]: not used.')
    for key in FIELD_NOTES:
        if 'field:' + key not in walker.notes_used:
            walker.problems.append(f'FIELD_NOTES[{key!r}]: no such field.')
    for key in TS_OVERRIDES:
        if 'override:' + key not in walker.notes_used:
            walker.problems.append(f'TS_OVERRIDES[{key!r}]: not used.')
    for key in TS_DEFAULTS:
        if 'default:' + key not in walker.notes_used:
            walker.problems.append(f'TS_DEFAULTS[{key!r}]: not used.')
    for key in QUERY_NOTES:
        if 'query:' + key not in walker.notes_used:
            walker.problems.append(f'QUERY_NOTES[{key!r}]: not used.')


def all_rows(model):
    for _, _, _, items in model['sections']:
        for item in items:
            for _, rows, _ in item['tables']:
                yield from rows
            yield from item['output']
    for rows in model['options'].values():
        yield from rows
    yield from model['errors']
    yield from model['session_file']


@lru_cache(maxsize=None)
def model():
    built = build_model()
    walker = built['walker']
    check_methods(walker)
    check_routes(walker)
    check_text(walker, built, all_rows(built))
    for _, _, _, items in built['sections']:
        for item in items:
            for param, _ in item['params']:
                if param.spec is None and param.desc is None:
                    walker.problems.append(f'{item["method"].path}: parameter {param.name} has no description.')
    return built


def problems():
    return list(model()['walker'].problems)


def validate():
    found = problems()
    if found:
        raise SystemExit('The API reference has gaps:\n- ' + '\n- '.join(found))


def stats():
    built = model()
    methods = sum(len(items) for _, _, _, items in built['sections'])
    fields = sum(1 for _ in all_rows(built))
    return methods, len(built['agent']), fields


# ── Rendering ────────────────────────────────────────────────────────────

def render_rows(rows, locale, direction):
    zh = locale == 'zh'
    t = lambda en, zh_: zh_ if zh else en
    headers = [t('Field', '字段'), t('Type', '类型'), t('Required', '必填') if direction == 'in' else t('Present', '返回'), t('Default', '默认值'), t('Limits', '限制'), t('Description', '说明')]
    body = []
    for row in rows:
        if direction == 'in':
            required = t('required', '必填') if row['required'] else t('optional', '可选')
        else:
            required = t('always', '总是') if row['required'] else t('optional', '可能省略')
        default = row['default']
        if isinstance(default, tuple):
            default = default[1] if zh else default[0]
            default_html = escape(default)
        elif default is None:
            default_html = ''
        elif row.get('raw_default'):
            default_html = f'<code>{escape(str(default))}</code>'
        else:
            default_html = f'<code>{escape(json.dumps(default, ensure_ascii=False))}</code>'
        description = ('' if zh else ' ').join(desc.html(locale) for desc in row['desc'])
        attrs = f' id="{row["id"]}"' if row['id'] else ''
        body.append(f'<tr{attrs}><td><code>{escape(row["path"])}</code></td><td><code>{row["type"]}</code></td><td>{required}</td>'
                    f'<td>{default_html}</td><td>{render_limits(row["limits"], locale)}</td><td>{description}</td></tr>')
    return ('<div class="table field-table"><table><thead><tr>' + ''.join(f'<th>{h}</th>' for h in headers)
            + '</tr></thead><tbody>' + ''.join(body) + '</tbody></table></div>')


def reference_sections(locale='zh'):
    built = model()
    zh = locale == 'zh'
    t = lambda en, zh_: zh_ if zh else en
    p = lambda en, zh_: '<p>' + t(en, zh_) + '</p>'
    h3 = lambda key, en, zh_: f'<h3 id="{key}">{t(en, zh_)}</h3>'
    c = lambda text: code(text, 'ts', locale)
    link = lambda page, anchor='': filename(page, locale) + ('#' + anchor if anchor else '')
    caption = lambda key, en, zh_: '<p class="table-caption"' + (f' id="{key}"' if key else '') + f'><strong>{t(en, zh_)}</strong></p>'

    def rows(rows_, direction):
        return render_rows(rows_, locale, direction)

    def description(desc):
        return desc.html(locale)

    sections = []

    # Concepts
    errors_table = rows(built['errors'], 'out')
    concepts = (
        p(f'Every public method of the Client SDK, with each field of what it takes and returns. Types, required fields, defaults, limits and descriptions come from the SDK\'s contract (API version <code>2026-11-07</code>). For how to use the methods together, read the task guides: <a href="{link("store")}">Manage resources</a>, <a href="{link("generation")}">Generate content</a> and <a href="{link("agent")}">Agent conversations</a>.',
          f'本页列出 Client SDK 的每个公开方法，以及其输入和输出的每个字段。类型、必填、默认值、限制和说明均来自 SDK 的接口定义（API 版本 <code>2026-11-07</code>）。各方法如何配合使用，请阅读操作指南：<a href="{link("store")}">管理资源</a>、<a href="{link("generation")}">生成内容</a>和 <a href="{link("agent")}">Agent 对话</a>。')
        + p('A field path joins nested fields with dots (<code>data.image_asset_ids</code>); <code>[]</code> marks the items of a list and <code>&lt;id&gt;</code> the values of a map keyed by id. An object type is shown in full the first time it appears and linked after that. Fields marked “Added by the SDK” are not part of the backend contract.',
            '字段路径用点号连接嵌套字段（<code>data.image_asset_ids</code>）；<code>[]</code> 表示列表中的每一项，<code>&lt;id&gt;</code> 表示以 ID 为键的映射中的值。对象类型在第一次出现时完整展开，之后以链接指向该处。标注“由 SDK 添加”的字段不属于后端接口定义。')
        + h3('ids-versions', 'IDs and versions', 'ID 与版本')
        + p('Brands, Products and Characters change in place. An edit keeps the <code>id</code> and saves the next <code>version</code>: 1 for the first, then one more per edit. A reference to one is <code>{id, version?}</code>; without <code>version</code> it means the latest. <code>get(id)</code> reads the latest version and <code>get(id, {version})</code> an earlier one. <code>update</code> takes the version you read: if someone saved a newer one since, it fails with <code>REVISION_CONFLICT</code> and changes nothing. Assets, Jobs, Ads and Batches have an <code>id</code> and no versions.',
            '品牌、产品和人物原地修改。编辑后 <code>id</code> 不变，并保存下一个 <code>version</code>：第一个版本为 1，此后每次编辑加 1。引用它们时使用 <code>{id, version?}</code>；省略 <code>version</code> 表示最新版本。<code>get(id)</code> 读取最新版本，<code>get(id, {version})</code> 读取较早的版本。<code>update</code> 需要传入读取到的版本：如果之后已有人保存了更新的版本，返回 <code>REVISION_CONFLICT</code>，不做任何修改。Asset、任务、广告和批次只有 <code>id</code>，没有版本。')
        + h3('artifacts', 'Artifacts never change', '产物不会被修改')
        + p('Scripts, Storyboards and Prompts are Artifacts: once saved, they never change. <code>generate</code> makes a new one; <code>generateFrom</code> has the writer make one from an existing one; <code>createFrom</code> saves your own changes as a new one. The one you started from stays as it was. Each version has its own <code>id</code>, <code>base_id</code> is the version it was made from and <code>lineage_id</code> is the first version\'s id, so versions form a tree: calling a <code>…From</code> method twice on the same base gives two alternatives side by side. Read one by <code>{kind, id}</code>, for example <code>{kind: "script", id}</code>. <code>relationships</code> say what it was made from (another Artifact, or a Product or Character version); the service sets them.',
            '脚本、分镜和提示词是产物（Artifact）：保存后不会被修改。<code>generate</code> 生成新的产物；<code>generateFrom</code> 让编写服务从已有产物生成新的产物；<code>createFrom</code> 将你的修改保存为新的产物。作为起点的产物保持不变。每个版本有自己的 <code>id</code>，<code>base_id</code> 是它所基于的版本，<code>lineage_id</code> 是第一个版本的 ID，因此各版本构成一棵树：对同一个 base 调用两次 <code>…From</code> 方法会得到两个并列的备选。按 <code>{kind, id}</code> 读取，例如 <code>{kind: "script", id}</code>。<code>relationships</code> 说明它的来源（另一个产物，或产品、人物的某个版本），由服务设置。')
        + h3('prompt-files', 'How a Prompt names its files', '提示词如何指代文件')
        + p('A Prompt\'s text names each attached file by its position in its list: <code>&lt;Picture 1&gt;</code> is the first of <code>image_asset_ids</code>, <code>&lt;Video 1&gt;</code> the first of <code>video_asset_ids</code> and <code>&lt;Audio 1&gt;</code> the first of <code>audio_asset_ids</code>. The video model ignores a file the text does not name, so a new Prompt must name every attached file and no other; otherwise it is refused with <code>422 INVALID_PROMPT</code>, with a detail for each problem, and nothing is saved.',
            '提示词文本按文件在列表中的位置指代每个附带文件：<code>&lt;Picture 1&gt;</code> 是 <code>image_asset_ids</code> 的第一个，<code>&lt;Video 1&gt;</code> 是 <code>video_asset_ids</code> 的第一个，<code>&lt;Audio 1&gt;</code> 是 <code>audio_asset_ids</code> 的第一个。视频模型会忽略文本中没有提到的文件，因此新的提示词必须提到每个附带文件，且不能提到其他文件；否则返回 <code>422 INVALID_PROMPT</code>，每个问题各有一条详情，不会保存任何内容。')
        + p('Prompts compiled from a Storyboard also use <code>&lt;Subject N&gt;</code>: a line such as <code>&lt;Subject 1&gt; is the woman in &lt;Picture 1&gt;</code> defines a person or thing once, and the shots then refer to <code>&lt;Subject 1&gt;</code>. A Subject is a label inside the text, not a file; only Picture, Video and Audio numbers point at attached files. Removing or reordering a file renumbers the others, which is why you change the Storyboard and compile again rather than edit compiled text.',
            '由分镜编译的提示词还使用 <code>&lt;Subject N&gt;</code>：例如 <code>&lt;Subject 1&gt; is the woman in &lt;Picture 1&gt;</code> 先定义一个人或物，之后的镜头用 <code>&lt;Subject 1&gt;</code> 指代。Subject 是文本中的标签，不是文件；只有 Picture、Video 和 Audio 编号对应附带的文件。删除或调整文件顺序会改变其他文件的编号，因此应修改分镜后重新编译，而不是编辑已编译的文本。')
        + c("// A raw render: the text names both attached images.\nawait client.videos.generate({\n  input: {\n    schema_version: 1,\n    data: {\n      prompt: 'The woman in <Picture 1> holds the bottle in <Picture 2> up to the camera.',\n      image_asset_ids: [presenterImageId, productImageId],\n      seconds: 5,\n      ratio: '9:16',\n    },\n  },\n});")
        + h3('storyboard-or-raw', 'Storyboard path or raw render', '分镜路径与原始渲染')
        + p(f'There are two ways to render a clip. Through a Storyboard: <code>storyboards.generate</code> casts the roles and writes the shots, <code>prompts.generate</code> compiles each clip into a Prompt with its files attached and named, and <code>videos.generate({{prompt}})</code> renders it. Or raw: <code>videos.generate({{input}})</code> renders a Prompt you write yourself. Either way the video model sees only the prompt text, the files attached to it (<code>image_asset_ids</code>, <code>video_asset_ids</code>, <code>audio_asset_ids</code>), the length and the frame.',
            f'渲染片段有两种方式。通过分镜：<code>storyboards.generate</code> 选角并编写镜头，<code>prompts.generate</code> 将每个片段编译为附带并指代好文件的提示词，再由 <code>videos.generate({{prompt}})</code> 渲染。或者原始渲染：<code>videos.generate({{input}})</code> 渲染你自己编写的提示词。无论哪种方式，视频模型只看到提示词文本、附带的文件（<code>image_asset_ids</code>、<code>video_asset_ids</code>、<code>audio_asset_ids</code>）、时长和画面比例。')
        + p('So a Character or a Product reaches a clip only through a Storyboard, or, in a raw render, when you attach its pictures yourself and name them in the text. Nothing else carries it: earlier SDKs sent a <code>characters</code> list with raw input, which was only a record and never reached the video model; it is no longer part of the input, and a non-empty one is refused.',
            '因此，人物或产品只能通过分镜进入片段；在原始渲染中，则需要你自己附加其图片并在文本中指代。其他方式都不会生效：早期 SDK 在原始输入中发送的 <code>characters</code> 列表只是一条记录，从未传给视频模型；它已不再属于输入，非空时会被拒绝。')
        + h3('batches', 'Batches', '批次')
        + p('A Batch groups the work of one attempt: its <code>intent</code> says what it tries, and it lists the Ads made in it and counts its Jobs by status. A Script can be made in a Batch (<code>batch_id</code>); its Storyboards keep the Script\'s Batch, their Prompts the Storyboard\'s, and a Job joins its Prompt\'s Batch unless you pass <code>batch_id</code>. The Agent creates Batches and Ads; the SDK reads them.',
            '批次（Batch）汇集一次尝试中的工作：<code>intent</code> 说明它的目的，并列出其中做出的广告和各状态的任务数量。脚本可以在某个批次中生成（<code>batch_id</code>）；其分镜沿用脚本的批次，提示词沿用分镜的批次，任务沿用提示词的批次，除非你传入 <code>batch_id</code>。批次和广告由 Agent 创建，SDK 负责读取。')
        + h3('skills-concept', 'Skills', 'Skill')
        + p(f'A Skill is versioned writing guidance, a <code>SKILL.md</code> and its files, that the Agent and the writers load. Your backend registers Skills with the <a href="{link("backend-go", "skills")}">Go Admin SDK</a>, and <code>main_version</code> is the version new work uses. Nuva selects the Skills configured for your account; a generate request does not name one. Content made with a Skill version records it in <code>skills</code>, keyed by version id.',
            f'Skill 是带版本的编写指导（一个 <code>SKILL.md</code> 及其文件），由 Agent 和编写服务加载。你的后端通过 <a href="{link("backend-go", "skills")}">Go Admin SDK</a> 注册 Skill，<code>main_version</code> 是新工作默认使用的版本。Nuva 使用为你的账户配置的 Skill，生成请求中不指定 Skill。用某个 Skill 版本做出的内容会在 <code>skills</code> 中记录该版本（以版本 ID 为键）。')
        + h3('idempotency', 'Idempotency keys and request IDs', '幂等 key 与请求 ID')
        + p('<code>idempotencyKey</code> makes a write safe to retry: the same key with the same input returns what the first call made instead of making it again, and the same key with different input fails with <code>IDEMPOTENCY_CONFLICT</code>. Keep one key for the retries of one write and use a new key for a new write, even with the same input. Methods whose options are <code>StoreCommandOptions</code> take one. <code>requestId</code> only correlates a request in traces and errors (it is sent as <code>X-Request-ID</code>); it does not make a write safe to retry.',
            '<code>idempotencyKey</code> 让写入可安全重试：相同 key 和相同输入返回第一次调用的结果，不会再做一次；相同 key 但输入不同时返回 <code>IDEMPOTENCY_CONFLICT</code>。同一次写入的重试使用同一个 key；新的写入即使输入相同也使用新 key。选项类型为 <code>StoreCommandOptions</code> 的方法支持该参数。<code>requestId</code> 只用于在诊断信息和错误中关联请求（以 <code>X-Request-ID</code> 发送），不能让写入安全重试。')
        + h3('errors', 'Errors and acceptance', '错误与 acceptance')
        + p('Every failure is a <code>NuvaError</code> with the fields below; branch on <code>code</code>, not on <code>message</code>. A write\'s error says whether the write happened. <code>acceptance: "not_accepted"</code>: nothing happened, so it is safe to retry. <code>acceptance: "unknown"</code>: it may have happened (a timeout, a lost response, a server error); retry only with the same <code>idempotencyKey</code>, or read the resource first. A read\'s error has no <code>acceptance</code>. The SDK replays a write by itself only after renewing the token, when the service reported <code>not_accepted</code>.',
            '所有失败都是带有下列字段的 <code>NuvaError</code>；请根据 <code>code</code> 而不是 <code>message</code> 判断。写入的错误会说明写入是否发生。<code>acceptance: "not_accepted"</code>：未执行任何操作，可安全重试。<code>acceptance: "unknown"</code>：可能已执行（超时、响应丢失、服务端错误）；只能使用相同的 <code>idempotencyKey</code> 重试，或先读取资源确认。读取的错误没有 <code>acceptance</code>。仅当服务返回 <code>not_accepted</code> 时，SDK 才会在刷新令牌后自行重放写入。')
        + errors_table
        + p(f'Error codes and how to handle them are in <a href="{link("reference", "errors")}">Methods and errors</a>.', f'错误码及处理方式参见<a href="{link("reference", "errors")}">方法与错误</a>。')
    )
    sections.append(('concepts', t('Concepts', '概念'), concepts))

    # Client options
    options = built['options']
    body = (c('createNuva(options: NuvaClientOptions): NuvaClient')
            + p('Creates a client for one signed-in user. Create it once, and call <code>close()</code> on logout or account change.', '为一个已登录用户创建客户端。只创建一次；退出登录或切换账号时调用 <code>close()</code>。')
            + caption('in-NuvaClientOptions', 'NuvaClientOptions', 'NuvaClientOptions') + rows(options['NuvaClientOptions'], 'in')
            + caption('in-AccessToken', 'AccessToken: what <code>getAccessToken</code> returns', 'AccessToken：<code>getAccessToken</code> 的返回值') + rows(options['AccessToken'], 'in')
            + caption('in-StoreCommandOptions', 'StoreCommandOptions: the <code>options</code> of a write', 'StoreCommandOptions：写入方法的 <code>options</code>') + rows(options['StoreCommandOptions'], 'in')
            + caption('in-CommandOptions', 'CommandOptions: the <code>options</code> of a write that takes no idempotency key', 'CommandOptions：不支持幂等 key 的写入方法的 <code>options</code>') + rows(options['CommandOptions'], 'in'))
    sections.append(('client-options', t('Client options', '客户端选项'), body))

    # Agent and Sessions
    agent_rows = ''.join(f'<tr><td><code>{escape(signature)}</code></td><td>{description(desc)}</td></tr>' for signature, desc in built['agent'])
    body = (p(f'Conversations with the Ads Agent. Their behaviour (states, sending while the Agent works, waiting for renders, Stop) is in <a href="{link("agent")}">Agent conversations</a>; message and state types are the ones the SDK exports.',
              f'与 Ads Agent 的对话。其行为（状态、Agent 工作时发送消息、等待渲染、停止）参见 <a href="{link("agent")}">Agent 对话</a>；消息和状态类型以 SDK 导出的类型为准。')
            + c("const session = await client.sessions.create({ title: 'Spring launch' });\nconst agent = client.agent({ sessionId: session.id });")
            + '<div class="table"><table><thead><tr><th>' + t('Method', '方法') + '</th><th>' + t('Purpose', '用途') + '</th></tr></thead><tbody>' + agent_rows + '</tbody></table></div>'
            + caption('out-SessionFile', 'SessionFile: what <code>agent.files.get(id)</code> returns', 'SessionFile：<code>agent.files.get(id)</code> 的返回值') + rows(built['session_file'], 'out'))
    sections.append(('agent-sessions', t('Agent and Sessions', 'Agent 与 Session'), body))

    for key, en, zh_title, items in built['sections']:
        body = ''
        for item in items:
            method = item['method']
            optional = getattr(method, 'optional', set())
            signature = f'client.{method.path}(' + ', '.join(f'{param.name}{"?" if param.name in optional else ""}: {param.type}' for param in method.params) + f'): {method.returns}'
            body += h3(method.path.replace('.', '-'), f'<code>{method.path}</code>', f'<code>{method.path}</code>') + c(signature) + '<p>' + description(method.purpose) + '</p>'
            body += ''.join('<p>' + description(note) + '</p>' for note in method.notes)
            param_rows = []
            for param, anchor in item['params']:
                type_html = f'<a href="#{anchor}">{escape(param.type)}</a>' if anchor else escape(param.type)
                if param.desc is not None:
                    text = description(param.desc)
                elif anchor and anchor in [table_anchor for _, _, table_anchor in item['tables']]:
                    text = t('Fields below.', '字段见下表。')
                elif anchor:
                    text = t('Fields at the link.', '字段见链接处。')
                else:
                    text = t('Fields below.', '字段见下表。')
                required = t('optional', '可选') if param.name in optional else t('required', '必填')
                param_rows.append(f'<tr><td><code>{escape(param.name)}</code></td><td><code>{type_html}</code></td><td>{required}</td><td>{text}</td></tr>')
            if param_rows:
                body += ('<div class="table"><table><thead><tr><th>' + t('Parameter', '参数') + '</th><th>' + t('Type', '类型') + '</th><th>'
                         + t('Required', '必填') + '</th><th>' + t('Description', '说明') + '</th></tr></thead><tbody>' + ''.join(param_rows) + '</tbody></table></div>')
            for name, table_rows, anchor in item['tables']:
                body += caption(anchor, f'<code>{escape(name)}</code> fields', f'<code>{escape(name)}</code> 字段') + rows(table_rows, 'in')
            if item['same']:
                same = f'<a href="#{item["same"]}">{escape(item["same"].split("-", 1)[1])}</a>'
                body += t(f'<p><strong>Returns</strong> <code>{escape(method.returns)}</code>: the same fields as {same}.</p>',
                          f'<p><strong>返回</strong> <code>{escape(method.returns)}</code>：字段同 {same}。</p>')
            elif item['output']:
                body += caption(item['out_anchor'], f'Returns <code>{escape(method.returns)}</code>', f'返回 <code>{escape(method.returns)}</code>') + rows(item['output'], 'out')
            else:
                body += p(f'Returns <code>{escape(method.returns)}</code>.', f'返回 <code>{escape(method.returns)}</code>。')
        sections.append((key, t(en, zh_title), body))
    return sections
