"""The API reference: an Introduction page (`reference`) and one page per resource (`reference-products`, ...), each with
its methods and models, generated from the Client SDK's contract.

Everything a field list shows is read at build time from the contract, so the pages cannot drift from it:

- `typescript/schema/backend.openapi.json`, the public backend contract (API version 2026-11-07): each field's type,
  whether it is required, its default, its limits and its English `description`. The backend's internal contract
  (WhatIf's `ads_backend/openapi.internal.json`) is never read; the docs check only makes sure no page names it.
- `reference_contract.mjs` (a small node script) for what the OpenAPI file does not hold:
  * the zod schemas of the generate inputs and of Script and Storyboard content, turned into JSON Schema with
    `z.toJSONSchema` in the same zod instance the sources use, so limits and descriptions come out exactly as zod
    validates them;
  * the client interfaces (`StoreClients`, `SessionsClient`, `AgentHandle`, `NuvaClientOptions`, ...), read with the
    TypeScript checker: every method with its parameter names, and every property with its TSDoc.
- `reference_examples.mjs`, which runs each method's example (`examples/reference.ts`) through the SDK against the
  backend answers in `examples/reference-responses.ts`: each answer is checked against its route's public schema with
  the SDK's `backendSchema`, the example's last request must be the method's route, and the value the call returns is
  the response the page shows.
- `PAGES`, `MODELS` and the notes below, the only hand-written part: which schema each method takes and returns, its
  title and purpose, and the descriptions the contract does not have, in English and Chinese.
- `reference_zh.json`: the Chinese for each English description the contract supplies.

`problems()` lists every gap: a reachable field without a description, a description without Chinese, a public method
or interface member missing from the map, a map entry the contract no longer has, a mapped schema that no longer matches
its backend route, an example that fails or is missing, and unused translations or notes. `build_customer.py` and
`check_customer.py` fail on any of them.
"""
from functools import lru_cache
from html import escape
import json
import re
import subprocess
from textwrap import dedent

from build import ROOT, table
from customer_layout import DOCUMENTS, REFERENCE, code, filename
from client_reference import source_example

SDK = ROOT.parent
OPENAPI = SDK / 'typescript' / 'schema' / 'backend.openapi.json'
ZH_FILE = ROOT / 'reference_zh.json'
EXAMPLES_FILE = ROOT / 'examples' / 'reference.ts'
INTRO = 'reference'
API_VERSION = '2026-11-07'
SAFE_INTEGER = 9007199254740991
ID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
# The writers' routes are a separate service, not in the public OpenAPI file; the SDK checks their answers.
GENERATION_ROUTES = {'/v1/generate/script', '/v1/generate/storyboard', '/v1/generate/prompt'}


@lru_cache(maxsize=None)
def openapi():
    return json.loads(OPENAPI.read_text())


def node(script):
    result = subprocess.run(['node', str(ROOT / script)], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f'{script} failed:\n' + result.stderr)
    return json.loads(result.stdout)


@lru_cache(maxsize=None)
def contract():
    return node('reference_contract.mjs')


@lru_cache(maxsize=None)
def runs():
    """Each example's requests, returned value and problems, from reference_examples.mjs."""
    return node('reference_examples.mjs')


@lru_cache(maxsize=None)
def translations():
    return json.loads(ZH_FILE.read_text())


def region(name):
    """One `#region` of examples/reference.ts, dedented."""
    text = EXAMPLES_FILE.read_text()
    found = re.findall(rf'^[\t ]*// #region {re.escape(name)}\n(.*?)^[\t ]*// #endregion {re.escape(name)}$', text, re.M | re.S)
    if len(found) != 1:
        raise ValueError(f'Expected one example region {name} in examples/reference.ts')
    return dedent(found[0].replace('\t', '  ')).strip()


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
    """A field the SDK adds or shapes, described here. Its type may name models (`Prompt[]`), which are linked."""

    def __init__(self, path, type_, required, en, zh, default=''):
        self.path, self.type, self.required, self.desc, self.default = path, type_, required, T(en, zh), default


class Field:
    """One contract field shown at another path, with its own description."""

    def __init__(self, schema, name, path=None, required=None, note=None):
        self.schema, self.name, self.path, self.required, self.note = schema, name, path or name, required, note


class P:
    """A method parameter: `spec` for an object (its fields are listed under it), or a scalar with a description.
    A parameter typed StoreCommandOptions or CommandOptions links to the Introduction instead."""

    def __init__(self, name, type_, spec=None, en=None, zh=None):
        self.name, self.type, self.spec, self.desc = name, type_, spec, (T(en, zh) if en else None)


class Method:
    """`route` is the request the method ends with (the example's last request); `body` and `response` are the
    contract schemas that route takes and returns, checked against backend.openapi.json."""

    def __init__(self, path, title, params, returns, purpose, route, body=None, response=None, notes=(), output=None):
        self.path, self.title, self.params, self.returns, self.purpose = path, T(*title), params, returns, T(*purpose)
        self.route, self.body, self.response, self.notes, self.output = route, body, response, [T(*note) for note in notes], output
        self.optional = set()

    @property
    def anchor(self):
        return self.path.replace('.', '-')


class Page:
    def __init__(self, key, title, blurb, summary, methods, models):
        self.key, self.title, self.blurb, self.summary, self.methods, self.models = key, title, T(*blurb), [T(*s) for s in summary], methods, models


def links(kind, en, zh):
    """The `ref` and `label` the SDK adds to a record it returns."""
    return [
        Row('ref', '{kind, id}', True, f'Added by the SDK: `{{kind: "{kind}", id}}`, the reference to attach to a message or pass to a method.',
            f'由 SDK 添加：<code>{{kind: "{kind}", id}}</code>，可附加到消息或传给方法的引用。'),
        Row('label', 'string', True, en, zh),
    ]


ARTIFACT = lambda kind: links(kind, 'Added by the SDK: the id, for display.', '由 SDK 添加：用于展示的 ID。')
OPTIONS = P('options', 'StoreCommandOptions')
COMMAND = P('options', 'CommandOptions')
ID = lambda what_en, what_zh: P('id', 'string', None, f'The {what_en}\'s id.', f'{what_zh}的 ID。')
REF = lambda kind, what_en, what_zh: P('ref', 'ArtifactRef', None, f'The {what_en}: `{{id}}`, the id of the version to read, or the {what_en} you read.', f'{what_zh}：<code>{{id}}</code>（要读取的版本的 ID），或已读取的{what_zh}。')
BASE = lambda kind, record, what_en, what_zh: P('base', f'ArtifactRef | {record}', None,
    f'The {what_en} to start from: `{{id}}`, or the {what_en} you read (then it is not read again). It stays as it was.',
    f'作为起点的{what_zh}：<code>{{id}}</code>，或已读取的{what_zh}（此时不再重新读取）。它保持不变。')
BASE_REF = lambda kind, what_en, what_zh: BASE(kind, {'script': 'Script', 'storyboard': 'Storyboard', 'prompt': 'Prompt'}[kind], what_en, what_zh)
VERSION_QUERY = P('query', '{version?: number}', Query(None, ('version',)))
LIST_QUERY = lambda route, *names: P('query', 'StoreQuery', Query(route, ('limit', 'cursor') + names))
READS_BASE = ('With a reference as `base`, it reads `base` first (`GET`), then saves.', '<code>base</code> 为引用时，先读取 <code>base</code>（<code>GET</code>），再保存。')


NEXT_CURSOR = Row('nextCursor', 'string | null', True, 'Pass as `cursor` for the next page; null on the last one.', '作为 <code>cursor</code> 传入以获取下一页；最后一页为 null。')


def page_of(component):
    """What a list method returns: the page's items, as the contract describes them, and its cursor."""
    return [Field(component, 'items'), NEXT_CURSOR]


def profiles(kind, name, en, zh):
    """create / get / list / update for a Brand, Product or Character."""
    plural = kind + 's'
    return [
        Method(f'{plural}.create', (f'Create a {en}', f'创建{zh}'), [P('input', f'{name}Create', Api(f'{name}Create')), OPTIONS], f'Promise<{name}>',
               (f'Creates a {en} and returns its first version.', f'创建{zh}，返回其第一个版本。'),
               ('POST', f'/v1/{plural}'), body=f'{name}Create', response=name),
        Method(f'{plural}.get', (f'Retrieve a {en}', f'读取{zh}'), [ID(en, zh), VERSION_QUERY], f'Promise<{name}>',
               (f'Reads the latest version of a {en}, or the `version` you ask for.', f'读取{zh}的最新版本，或指定的 <code>version</code>。'),
               ('GET', f'/v1/{plural}/{{{kind}_id}}'), response=name),
        Method(f'{plural}.list', (f'List {en}s', f'列出{zh}'), [LIST_QUERY(('GET', f'/v1/{plural}'), *(('brand_id',) if kind == 'product' else ()))], f'Promise<Page<{name}>>',
               (f'Lists the {en}s you can read, a page at a time, each at its latest version.', f'分页列出你有权读取的{zh}，每个均为最新版本。'),
               ('GET', f'/v1/{plural}'), response=f'{name}Page', output=page_of(f'{name}Page')),
        Method(f'{plural}.update', (f'Update a {en}', f'修改{zh}'), [P('ref', 'EntityRef', Ts('EntityRef')), P('changes', f'{name}Changes', Api(f'{name}Edit', omit=('version',))), OPTIONS], f'Promise<{name}>',
               (f'Changes the fields you send and saves the next version; a list is replaced as a whole and `null` clears an optional value. If someone saved a newer version since the one you pass, it fails with `REVISION_CONFLICT` and nothing changes.',
                f'修改传入的字段并保存下一个版本；列表整体替换，<code>null</code> 清空可选值。如果传入的版本之后已有人保存了更新的版本，返回 <code>REVISION_CONFLICT</code>，不做任何修改。'),
               ('PATCH', f'/v1/{plural}/{{{kind}_id}}'), body=f'{name}Edit', response=name),
    ]


def profile_record(kind, en, zh):
    return links(kind, f'Added by the SDK: the {en}\'s name (`data.name`), for display.', f'由 SDK 添加：{zh}名称（<code>data.name</code>），用于展示。')


CONTENT_SCRIPT = Row('content', 'ScriptContent', False, 'Added by the SDK for `format: 3`: the Script decoded from `data.text` and validated. Read this, not `data.text`.',
                     '仅 <code>format: 3</code> 时由 SDK 添加：从 <code>data.text</code> 解码并校验后的脚本。请读取此字段，而不是 <code>data.text</code>。')
CONTENT_STORYBOARD = Row('content', 'StoryboardContent', True, 'Added by the SDK: the Storyboard decoded from `data.text` and validated. Read this, not `data.text`.',
                         '由 SDK 添加：从 <code>data.text</code> 解码并校验后的分镜。请读取此字段，而不是 <code>data.text</code>。')
JOB_METHODS = [
    Row('subscribe(listener, onError?)', '() => void', True,
        'Calls `listener` with each state of this Job, polled every `jobPollIntervalMs`, until it is `completed`, `failed` or `cancelled`. The returned function stops it locally; the Job keeps running.',
        '按 <code>jobPollIntervalMs</code> 轮询，将任务的每个状态传给 <code>listener</code>，直到 <code>completed</code>、<code>failed</code> 或 <code>cancelled</code>。返回的函数只停止本地轮询，任务继续运行。'),
    Row('result(options?)', 'Promise<Asset>', True,
        'Resolves to the generated Asset once the Job completes, and rejects when it fails or is cancelled. `options.timeoutMs` and `options.signal` stop waiting locally, not the Job.',
        '任务完成后返回生成的 Asset；任务失败或取消时抛出错误。<code>options.timeoutMs</code> 和 <code>options.signal</code> 只停止本地等待，不会停止任务。'),
]

# Every type a method returns, defined once on the page that lists it. The key is the SDK's name for it.
MODELS = {
    'Asset': [Api('AssetOut'), Row('ref', '{kind, id}', True, 'Added by the SDK: `{kind: "asset", id}`, the reference to attach to a message.', '由 SDK 添加：<code>{kind: "asset", id}</code>，可附加到消息的引用。')],
    'Brand': [Api('Brand'), *profile_record('brand', 'Brand', '品牌')],
    'Product': [Api('Product'), *profile_record('product', 'Product', '产品')],
    'Character': [Api('Character'), *profile_record('character', 'Character', '人物')],
    'Script': [Api('Script'), *ARTIFACT('script'),
               Row('format', '3 | 2', True, 'Added by the SDK: 3 for a Script with `content`; 2 for a read-only Script saved before Storyboards, in `legacy`.',
                   '由 SDK 添加：3 表示带 <code>content</code> 的脚本；2 表示分镜功能推出前保存的只读脚本，内容在 <code>legacy</code> 中。'),
               CONTENT_SCRIPT, Zod('ScriptContent', prefix='content'),
               Row('legacy', 'ScriptPackage', False, 'Added by the SDK for `format: 2` only: the old ScriptPackage, read-only. It cannot be revised or shot; write a new Script instead.',
                   '仅 <code>format: 2</code> 时由 SDK 添加：旧的 ScriptPackage，只读。不能修改或拍成分镜，请生成新脚本。')],
    'Storyboard': [Api('Storyboard'), *ARTIFACT('storyboard'), CONTENT_STORYBOARD, Zod('StoryboardContent', prefix='content')],
    'Prompt': [Api('Prompt'), *ARTIFACT('prompt')],
    'JobState': [Api('JobOut')],
    'Job': JOB_METHODS,
    'Ad': [Api('AdOut'), *links('ad', 'Added by the SDK: the id, for display.', '由 SDK 添加：用于展示的 ID。')],
    'Batch': [Api('BatchOut'), *links('batch', 'Added by the SDK: the Batch\'s `intent`, for display.', '由 SDK 添加：批次的 <code>intent</code>，用于展示。')],
    'Skill': [Api('SkillRead'), *links('skill', 'Added by the SDK: the Skill\'s `name`, for display.', '由 SDK 添加：Skill 的 <code>name</code>，用于展示。')],
    'Share': [Api('ShareOut')],
    'SessionFile': [Ts('SessionFile')],
}
# The contract component each model shows, so a field of that type links to the model instead of repeating it.
COMPONENT_MODELS = {'AssetOut': 'Asset', 'Brand': 'Brand', 'Product': 'Product', 'Character': 'Character', 'Script': 'Script',
                    'Storyboard': 'Storyboard', 'Prompt': 'Prompt', 'JobOut': 'JobState', 'AdOut': 'Ad', 'BatchOut': 'Batch',
                    'BatchListed': 'Batch', 'SkillRead': 'Skill', 'SkillListed': 'Skill', 'ShareOut': 'Share'}
MODEL_NOTES = {
    'Job': ('What `videos.generate` returns: a JobState and two methods.', '<code>videos.generate</code> 的返回值：JobState 加两个方法。'),
}
# Types defined on the Introduction page.
INTRO_TYPES = ('NuvaClientOptions', 'AccessToken', 'AdsError', 'StoreCommandOptions', 'CommandOptions', 'Page')

PAGES = [
    Page('reference-assets', ('Assets', '素材（Asset）'),
         ('Upload files and read them with fresh download URLs.', '上传文件，并读取带新下载地址的文件。'),
         [('An Asset is a file: an image, video or audio you add, or a clip a Job renders. Products, Characters, Prompts and messages name Assets by id. `download_url` expires; read the Asset again for a new one.',
           'Asset 是一个文件：你添加的图片、视频或音频，或任务渲染出的片段。产品、人物、提示词和消息都按 ID 引用 Asset。<code>download_url</code> 会过期，需要时重新读取 Asset 获取新地址。')],
         [Method('assets.upload', ('Upload a file', '上传文件'),
                 [P('source', 'File | {url: string}', None, 'The file: a `File` from your upload control, or `{url}` for a public HTTPS URL the service fetches.',
                    '文件：上传控件中的 <code>File</code>，或由服务抓取的公开 HTTPS 地址 <code>{url}</code>。'),
                  P('options', 'StoreCommandOptions & {kind?, label?, description?}', [
                      Field('UploadRequest', 'kind', required=False, note=T('`image` (JPEG, PNG or WebP), `video` (MP4) or `audio` (MP3, WAV or MP4). For a `File`, taken from its MIME type when left out; required with `{url}`.',
                                                                          '<code>image</code>（JPEG、PNG 或 WebP）、<code>video</code>（MP4）或 <code>audio</code>（MP3、WAV 或 MP4）。上传 <code>File</code> 时可省略，按其 MIME 类型确定；使用 <code>{url}</code> 时必填。')),
                      Field('AssetCreate', 'label'), Field('AssetCreate', 'description'),
                      Row('idempotencyKey', 'string', False, 'For `{url}`: see StoreCommandOptions. A `File` needs none: adding the same file again returns the same Asset.',
                          '用于 <code>{url}</code>，参见 StoreCommandOptions。<code>File</code> 不需要：再次添加同一文件会返回同一个 Asset。'),
                      Row('requestId', 'string', False, 'See StoreCommandOptions.', '参见 StoreCommandOptions。')])],
                 'Promise<Asset>', ('Adds a file and returns its Asset. The same file added again returns the same Asset; with a different `label` or `description` it fails with `ASSET_EXISTS` (change them with `assets.update`).',
                                    '添加文件并返回其 Asset。再次添加同一文件会返回同一个 Asset；若 <code>label</code> 或 <code>description</code> 不同，返回 <code>ASSET_EXISTS</code>（请用 <code>assets.update</code> 修改）。'),
                 ('POST', '/v1/assets'), body='AssetCreate', response='AssetOut',
                 notes=[('A `File` takes three requests: `POST /v1/assets/uploads` for an upload URL, `PUT` to it, then `POST /v1/assets`. A file larger than its kind allows is refused before it is sent. `{url}` takes only the last.',
                         '<code>File</code> 需要三次请求：<code>POST /v1/assets/uploads</code> 获取上传地址，<code>PUT</code> 上传，再 <code>POST /v1/assets</code> 登记。超过该类型大小上限的文件在发送前被拒绝。<code>{url}</code> 只需最后一次请求。')]),
          Method('assets.get', ('Retrieve an Asset', '读取 Asset'), [ID('Asset', 'Asset ')], 'Promise<Asset>',
                 ('Reads an Asset you uploaded or generated, or one a shared Product or Character uses, with a fresh download URL.',
                  '读取你上传或生成的 Asset，或共享产品、人物使用的 Asset，并返回新的下载地址。'),
                 ('GET', '/v1/assets/{asset_id}'), response='AssetOut'),
          Method('assets.update', ('Update an Asset', '修改 Asset'), [ID('Asset', 'Asset '), P('changes', 'AssetChanges', Api('AssetEdit')), COMMAND], 'Promise<Asset>',
                 ('Changes the `label` and `description` you send and keeps the other; `null` removes one. The file never changes. Only the user who uploaded it, or an admin above them, can edit it.',
                  '修改传入的 <code>label</code> 和 <code>description</code>，未传入的保持不变；<code>null</code> 删除该值。文件本身不会改变。只有上传者或其上级管理员可以修改。'),
                 ('PATCH', '/v1/assets/{asset_id}'), body='AssetEdit', response='AssetOut')],
         ['Asset']),
    Page('reference-brands', ('Brands', '品牌'),
         ('Create, read, list and update Brands, which group Products.', '创建、读取、列出和修改品牌；品牌用于归类产品。'),
         [('A Brand groups Products. Brands, Products and Characters change in place: `update` keeps the `id` and saves the next `version`, and takes the version you read so it never overwrites a newer one.',
           '品牌用于归类产品。品牌、产品和人物原地修改：<code>update</code> 保留 <code>id</code> 并保存下一个 <code>version</code>；它需要传入读取到的版本，因此不会覆盖更新的版本。')],
         profiles('brand', 'Brand', 'Brand', '品牌'), ['Brand']),
    Page('reference-products', ('Products', '产品'),
         ('Create, read, list, update and delete the Products ads are made for.', '创建、读取、列出、修改和删除广告所推广的产品。'),
         [('A Product is what the ads sell: its name, pictures and the facts the writers may use. It changes in place like a Brand (`update` saves the next `version`); a Script records the Product version it was written from.',
           '产品是广告推广的商品：名称、图片以及编写服务可以使用的事实。它与品牌一样原地修改（<code>update</code> 保存下一个 <code>version</code>）；脚本记录其所依据的产品版本。')],
         profiles('product', 'Product', 'Product', '产品') + [
             Method('products.delete', ('Delete a Product', '删除产品'), [ID('Product', '产品'), COMMAND], 'Promise<void>',
                    ('Deletes the Product for everyone in the organization: it is no longer listed or readable, and what was made from it stays readable but cannot be revised. Deleting it again succeeds.',
                     '为整个组织删除该产品：不再出现在列表中，也不能读取；已用它做出的内容仍可读取，但不能再修订。重复删除同样成功。'),
                    ('DELETE', '/v1/products/{product_id}'))],
         ['Product']),
    Page('reference-characters', ('Characters', '人物'),
         ('Create, read, list and update the Characters that play Script roles.', '创建、读取、列出和修改出演脚本角色的人物。'),
         [('A Character is a person who can play a Script role: their pictures and voice keep them the same in every clip. It changes in place like a Brand (`version`); a Storyboard records the Character version it casts.',
           '人物是可以出演脚本角色的人：其图片和声音让人物在每个片段中保持一致。它与品牌一样原地修改（<code>version</code>）；分镜记录其选用的人物版本。')],
         profiles('character', 'Character', 'Character', '人物'), ['Character']),
    Page('reference-scripts', ('Scripts', '脚本'),
         ('Have the writer write Scripts, read them and save your own edits.', '让编写服务写出脚本、读取脚本并保存你的编辑。'),
         [('A Script is the idea of the ad and its exact lines, written for a Product. Scripts never change: `generate`, `generateFrom` and `createFrom` each return a new one, `base_id` points to the one it was made from, and that one stays as it was.',
           '脚本是为某个产品写的广告创意及其准确台词。脚本不会被修改：<code>generate</code>、<code>generateFrom</code> 和 <code>createFrom</code> 都返回一个新脚本，<code>base_id</code> 指向它所基于的脚本，后者保持不变。')],
         [Method('scripts.generate', ('Generate a Script', '生成脚本'), [P('input', 'ScriptInput', Zod('NewScriptInput')), OPTIONS], 'Promise<Script>',
                 ('The writer writes a new Script for a Product and saves it.', '编写服务为产品写出一个新脚本并保存。'), ('POST', '/v1/generate/script')),
          Method('scripts.get', ('Retrieve a Script', '读取脚本'), [REF('script', 'Script', '脚本')], 'Promise<Script>',
                 ('Reads a Script; its `content` is validated and decoded.', '读取脚本；其 <code>content</code> 已校验并解码。'),
                 ('GET', '/v1/artifacts/script/{artifact_id}'), response='Script'),
          Method('scripts.generateFrom', ('Generate a Script from another', '基于已有脚本生成'), [BASE_REF('script', 'Script', '脚本'), P('input', 'ReviseScriptInput', Zod('ReviseScriptInput')), OPTIONS], 'Promise<Script>',
                 ('The writer writes a new Script from `base`, as instructed, for the same Product.', '编写服务按指示从 <code>base</code> 写出一个新脚本，产品不变。'), ('POST', '/v1/generate/script'),
                 notes=[('It reads `base` first (`GET`).', '它会先读取 <code>base</code>（<code>GET</code>）。')]),
          Method('scripts.createFrom', ('Save an edited Script', '保存编辑后的脚本'), [BASE('script', 'Script', 'Script', '脚本'), P('changes', 'Partial<ScriptContent>', Zod('ScriptContent', partial=True)), OPTIONS], 'Promise<Script>',
                 ('Saves a new Script with the top-level content fields you pass; the rest is copied from `base`. It gets the same checks as a written Script.',
                  '用传入的顶层内容字段保存一个新脚本，其余字段从 <code>base</code> 复制；它与编写服务写出的脚本经过相同检查。'), ('POST', '/v1/generate/script'),
                 notes=[READS_BASE])],
         ['Script']),
    Page('reference-storyboards', ('Storyboards', '分镜'),
         ('Have the writer cast and shoot a Script as a Storyboard, read it and save your own edits.', '让编写服务为脚本选角并编写拍法、读取分镜并保存你的编辑。'),
         [('A Storyboard is how a Script is shot: who plays each role (`cast`), one `direction` for the whole video, and clips of 5 to 15 seconds, each a list of shots that name people, the Product, files and lines with tokens. Like Scripts, Storyboards never change: each method returns a new one.',
           '分镜说明脚本如何拍摄：每个角色由谁出演（<code>cast</code>）、整条视频统一的 <code>direction</code>，以及 5 到 15 秒的片段；每个片段由若干镜头组成，镜头用标记指代人物、产品、文件和台词。与脚本一样，分镜不会被修改：每个方法都返回一个新分镜。'),
          ('Tokens: <a href="@guide:generation#tokens">Tokens in shots</a>. The checks a Storyboard you save passes: <a href="@guide:generation#edit">Edit content yourself</a>.', '标记：<a href="@guide:generation#tokens">镜头中的标记</a>。自己保存的分镜需通过的检查：<a href="@guide:generation#edit">自己编辑内容</a>。')],
         [Method('storyboards.generate', ('Generate a Storyboard', '生成分镜'), [P('input', 'StoryboardInput', Zod('NewStoryboardInput')), OPTIONS], 'Promise<Storyboard>',
                 ('The writer casts and shoots a Script as a new Storyboard, with every clip\'s shots, and saves it. Several Storyboards for the same Script are shot differently from each other.',
                  '编写服务为脚本选角并编写拍法，生成包含每个片段镜头的新分镜并保存。同一脚本的多个分镜拍法互不相同。'), ('POST', '/v1/generate/storyboard')),
          Method('storyboards.get', ('Retrieve a Storyboard', '读取分镜'), [REF('storyboard', 'Storyboard', '分镜')], 'Promise<Storyboard>',
                 ('Reads a Storyboard; its `content` is validated and decoded.', '读取分镜；其 <code>content</code> 已校验并解码。'),
                 ('GET', '/v1/artifacts/storyboard/{artifact_id}'), response='Storyboard'),
          Method('storyboards.generateFrom', ('Generate a Storyboard from another', '基于已有分镜生成'), [BASE_REF('storyboard', 'Storyboard', '分镜'), P('input', 'ReviseStoryboardInput', Zod('ReviseStoryboardInput')), OPTIONS], 'Promise<Storyboard>',
                 ('The writer writes a new Storyboard from `base`, as instructed, for the same Script, with the latest Product and Characters.', '编写服务按指示从 <code>base</code> 写出一个新分镜，脚本不变，使用最新的产品和人物。'), ('POST', '/v1/generate/storyboard')),
          Method('storyboards.createFrom', ('Save an edited Storyboard', '保存编辑后的分镜'), [BASE('storyboard', 'Storyboard', 'Storyboard', '分镜'), P('changes', 'Partial<Omit<StoryboardContent, "script">>', Zod('StoryboardContent', omit=('script',), partial=True)), OPTIONS], 'Promise<Storyboard>',
                 ('Saves a new Storyboard with the top-level content fields you pass (`cast`, `direction`, `clips`); the rest, including its Script and the Product and Character versions, is copied from `base`.',
                  '用传入的顶层内容字段（<code>cast</code>、<code>direction</code>、<code>clips</code>）保存一个新分镜；其余内容（包括脚本以及产品和人物版本）从 <code>base</code> 复制。'),
                 ('POST', '/v1/generate/storyboard'),
                 notes=[('It gets the same checks as the writer\'s Storyboards; content that fails them is refused with `422 REJECTED`, listing every problem.',
                         '它与编写服务写出的分镜经过相同检查；未通过时返回 <code>422 REJECTED</code>，并列出全部问题。'), READS_BASE])],
         ['Storyboard']),
    Page('reference-prompts', ('Prompts', '提示词'),
         ('Compile a Storyboard\'s clips into Prompts, read them and save edited copies.', '将分镜的片段编译为提示词、读取提示词并保存修改后的副本。'),
         [('A Prompt is one clip as the video model takes it: its text and the files attached to it. The text names each file by its position: `<Picture 1>` is the first of `image_asset_ids`, likewise `<Video N>` and `<Audio N>`; `<Subject N>` is a label the text defines, not a file. Only attached and named files reach the video model, so to change what a clip shows, change its Storyboard and compile again.',
           '提示词是视频模型接收的一个片段：文本和附带的文件。文本按位置指代每个文件：<code>&lt;Picture 1&gt;</code> 是 <code>image_asset_ids</code> 的第一个，<code>&lt;Video N&gt;</code> 和 <code>&lt;Audio N&gt;</code> 同理；<code>&lt;Subject N&gt;</code> 是文本中定义的标签，不是文件。只有附带且被提到的文件才会传给视频模型，因此要修改片段内容，应修改分镜后重新编译。')],
         [Method('prompts.generate', ('Compile Prompts', '编译提示词'), [P('input', 'PromptInput', Zod('GeneratePromptInput')), OPTIONS], 'Promise<{prompts: Prompt[]}>',
                 ('Compiles a Storyboard\'s clips, or one clip, into saved Prompts in clip order. A clip compiled before from the same inputs returns its saved Prompt and is not charged again.',
                  '将分镜的所有片段（或一个片段）按顺序编译为已保存的提示词。已用相同输入编译过的片段直接返回已保存的提示词，不再计费。'),
                 ('POST', '/v1/generate/prompt'),
                 output=[Row('prompts', 'Prompt[]', True, 'One saved Prompt per clip, in clip order, each with `data.clip_id` naming its clip.',
                             '每个片段一条已保存的提示词，按片段顺序排列，每条的 <code>data.clip_id</code> 指明其片段。')],
                 notes=[('You get every clip\'s Prompt or an error. If a clip fails, call it again: the clips already compiled are reused, so only the failed ones are compiled (and charged) again. To get the clips that work while one keeps failing, compile them one at a time with `clip`.',
                         '要么返回所有片段的提示词，要么返回错误。某个片段失败时再次调用即可：已编译的片段会被复用，只有失败的片段会重新编译（并计费）。如果某个片段持续失败，可以用 <code>clip</code> 逐个编译其余片段。')]),
          Method('prompts.get', ('Retrieve a Prompt', '读取提示词'), [REF('prompt', 'Prompt', '提示词')], 'Promise<Prompt>',
                 ('Reads a Prompt, for example the one a Job renders (`job.prompt`).', '读取提示词，例如任务所渲染的提示词（<code>job.prompt</code>）。'),
                 ('GET', '/v1/artifacts/prompt/{artifact_id}'), response='Prompt'),
          Method('prompts.createFrom', ('Save an edited Prompt', '保存编辑后的提示词'), [BASE('prompt', 'Prompt', 'Prompt', '提示词'),
                 P('changes', 'PromptChanges', Api('PromptReadV1', only=('prompt', 'image_asset_ids', 'video_asset_ids', 'audio_asset_ids', 'seconds', 'ratio'), partial=True)), OPTIONS],
                 'Promise<Prompt>',
                 ('Saves a new Prompt from `base` with the render fields you pass; the rest is copied from `base`. Its text must name every attached file and no other, or it is refused with `422 INVALID_PROMPT`.',
                  '用传入的渲染字段从 <code>base</code> 保存一个新提示词，其余字段从 <code>base</code> 复制。其文本必须提到每个附带文件且不提其他文件，否则返回 <code>422 INVALID_PROMPT</code>。'),
                 ('POST', '/v1/artifacts/prompt/{artifact_id}/versions'), body='PromptVersionCreate', response='Prompt', notes=[READS_BASE])],
         ['Prompt']),
    Page('reference-videos', ('Videos and Jobs', '视频与任务'),
         ('Render clips and follow, wait for or cancel their Jobs.', '渲染片段，并关注、等待或取消其任务。'),
         [('`videos.generate` starts a Job that renders one clip, from a saved Prompt or from a raw Prompt of your own, and returns before the video exists. A Job is `queued`, then `running`, and ends `completed` with its Asset, `failed` or `cancelled`. Stopping a wait or a subscription never stops the Job.',
           '<code>videos.generate</code> 启动一个渲染片段的任务，来源为已保存的提示词或你自己编写的原始提示词，并在视频生成前返回。任务先 <code>queued</code>、再 <code>running</code>，最后以带 Asset 的 <code>completed</code>、<code>failed</code> 或 <code>cancelled</code> 结束。停止等待或订阅不会停止任务。')],
         [Method('videos.generate', ('Render a clip', '渲染片段'), [P('input', 'GenerateVideoInput', Api('GenerateVideo')), OPTIONS], 'Promise<Job>',
                 ('Starts a Job that renders one clip and returns it queued. Give exactly one of `prompt` (a saved Prompt) or `input` (raw).',
                  '启动一个渲染片段的任务，并以排队状态返回。<code>prompt</code>（已保存的提示词）和 <code>input</code>（原始输入）只能且必须给出一个。'),
                 ('POST', '/v1/generate/video'), body='GenerateVideo', response='JobOut',
                 notes=[('A Character or Product reaches a raw render only through the pictures you attach and name in its text.', '在原始渲染中，人物或产品只能通过你附加并在文本中提到的图片进入片段。')]),
          Method('jobs.get', ('Retrieve a Job', '读取任务'), [ID('Job', '任务')], 'Promise<JobState>', ('Reads a Job\'s current state.', '读取任务的当前状态。'),
                 ('GET', '/v1/jobs/{job_id}'), response='JobOut'),
          Method('jobs.subscribe', ('Watch a Job', '关注任务'), [ID('Job', '任务'), P('listener', '(state: JobState) => void', None, 'Called with each state, polled every `jobPollIntervalMs`, until the Job is `completed`, `failed` or `cancelled`.',
                                                       '按 <code>jobPollIntervalMs</code> 轮询，每个状态都会传入，直到任务为 <code>completed</code>、<code>failed</code> 或 <code>cancelled</code>。'),
                                    P('onError', '(error: AdsErrorInfo) => void', None, 'Called when a poll fails; polling continues.', '某次轮询失败时调用；轮询继续。')],
                 '() => void', ('Polls a Job and calls `listener` with each state; the returned function stops watching locally, not the Job.', '轮询任务并将每个状态传给 <code>listener</code>；返回的函数只停止本地关注，不会停止任务。'),
                 ('GET', '/v1/jobs/{job_id}'), response='JobOut'),
          Method('jobs.cancel', ('Cancel a Job', '取消任务'), [ID('Job', '任务'), COMMAND], 'Promise<JobState>',
                 ('Stops a queued or running Job, which ends `cancelled`; a finished Job cannot be cancelled (`JOB_FINISHED`).', '停止排队中或运行中的任务，任务以 <code>cancelled</code> 结束；已结束的任务不能取消（<code>JOB_FINISHED</code>）。'),
                 ('POST', '/v1/jobs/{job_id}/cancel'), response='JobOut')],
         ['Job', 'JobState']),
    Page('reference-ads', ('Ads and Batches', '成片广告与批次'),
         ('Read final Ads and the Batches they were made in.', '读取成片广告及其所属的批次。'),
         [('An Ad is a final video and how it was put together. A Batch groups the work of one attempt: a Script made in a Batch passes it to its Storyboards, their Prompts and the Jobs that render them, and the Batch lists the Ads made in it. The Agent creates Ads and Batches; the SDK reads them.',
           '成片广告（Ad）是最终视频及其合成方式。批次（Batch）汇集一次尝试中的工作：在某个批次中生成的脚本，其分镜、提示词以及渲染它们的任务都沿用该批次；批次列出其中做出的广告。广告和批次由 Agent 创建，SDK 负责读取。')],
         [Method('ads.get', ('Retrieve an Ad', '读取广告'), [ID('Ad', '广告')], 'Promise<Ad>', ('Reads a final Ad: its video and how it was put together.', '读取成片广告：其视频及合成方式。'),
                 ('GET', '/v1/ads/{ad_id}'), response='AdOut'),
          Method('ads.list', ('List Ads', '列出广告'), [LIST_QUERY(('GET', '/v1/ads'), 'batch_id')], 'Promise<Page<Ad>>', ('Lists Ads, newest first, optionally of one Batch.', '按从新到旧列出广告，可只列出某个批次的广告。'),
                 ('GET', '/v1/ads'), response='AdPage', output=page_of('AdPage')),
          Method('batches.get', ('Retrieve a Batch', '读取批次'), [ID('Batch', '批次')], 'Promise<Batch>', ('Reads a Batch with its Ads and how many of its Jobs are in each status.', '读取批次，包括其广告和各状态的任务数量。'),
                 ('GET', '/v1/batches/{batch_id}'), response='BatchOut'),
          Method('batches.list', ('List Batches', '列出批次'), [LIST_QUERY(('GET', '/v1/batches'))], 'Promise<Page<Batch>>', ('Lists Batches, newest first, each as `batches.get` reads it.', '按从新到旧列出批次，每个与 <code>batches.get</code> 读取的相同。'),
                 ('GET', '/v1/batches'), response='BatchPage', output=page_of('BatchPage'))],
         ['Ad', 'Batch']),
    Page('reference-skills', ('Skills', 'Skill'),
         ('Read the Skills the writers use and their versions.', '读取编写服务使用的 Skill 及其版本。'),
         [('A Skill is versioned writing guidance, a `SKILL.md` and its files, that the Agent and the writers load. Your backend registers Skills with the <a href="@guide:backend-go#skills">Go Admin SDK</a>; Nuva uses the Skills configured for your account, and a Script, Storyboard or Prompt names the version it was written with in `skill`. A `Skill` is one version: the latest unless you ask for another; `main_version` is the one new work uses.',
           'Skill 是带版本的编写指导（一个 <code>SKILL.md</code> 及其文件），由 Agent 和编写服务加载。你的后端通过 <a href="@guide:backend-go#skills">Go Admin SDK</a> 注册 Skill；Nuva 使用为你的账户配置的 Skill，脚本、分镜或提示词在 <code>skill</code> 中给出编写时所用的版本。一个 <code>Skill</code> 是一个版本：默认为最新版本，也可以指定其他版本；<code>main_version</code> 是新工作使用的版本。')],
         [Method('skills.get', ('Retrieve a Skill', '读取 Skill'), [ID('Skill', 'Skill '), P('options', '{version?: number}', [Row('version', 'number', False, 'The version to read, 1 or more, for example the one a Script\'s `skill` names. Left out: the latest.', '要读取的版本，从 1 开始，例如脚本 <code>skill</code> 中给出的版本。省略时为最新版本。')])], 'Promise<Skill>',
                 ('Reads a Skill at its latest version, or the one you ask for, with download URLs for its files.', '读取 Skill 的最新版本或指定版本，并附带文件下载地址。'),
                 ('GET', '/v1/skills/{skill_id}'), response='SkillRead'),
          Method('skills.list', ('List Skills', '列出 Skill'), [LIST_QUERY(('GET', '/v1/skills'))], 'Promise<Page<Skill>>', ('Lists the Skills you can use, newest first, each at its latest version.', '按从新到旧列出你可使用的 Skill，每个均为最新版本。'),
                 ('GET', '/v1/skills'), response='SkillPage', output=page_of('SkillPage'))],
         ['Skill']),
    Page('reference-shares', ('Shares', '共享'),
         ('Share Brands, Products, Characters, Assets and Artifacts with an organization, org or group.', '将品牌、产品、人物、Asset 和产物共享给组织、org 或 group。'),
         [('Scopes (orgs, groups) and who administers them are set from your backend: see <a href="@guide:backend-go#permissions">Backend setup › Organize users, name admins and share</a> (the Go Admin SDK\'s `PutScope` and `SetMemberships`).',
           '范围（org、group）及其管理员由你的后端设置：参见<a href="@guide:backend-go#permissions">后端接入 › 组织用户、指定管理员与共享</a>（Go Admin SDK 的 <code>PutScope</code> 和 <code>SetMemberships</code>）。'),
          ('An item is private to the user who made it, and to the admins above them, until it is shared with a scope: `customer` (everyone in the organization) or an org or group. Only an admin of the scope or above it shares into it. A share never allows deleting the item or sharing it on.',
           '内容在共享给某个范围之前，只有创建者及其上级管理员可见；范围可以是 <code>customer</code>（组织内所有人）或某个 org、group。只有该范围或上级范围的管理员可以共享到该范围。共享不允许删除内容或再次共享。')],
         [Method('shares.set', ('Share an item', '共享内容'), [P('item', 'ShareTarget', Ts('ShareTarget')),
                 P('scope', 'string', None, '`customer` or the external id of an org or group: 1–255 characters, without `/` or control characters.',
                   '<code>customer</code> 或某个 org、group 的外部 ID：1–255 个字符，不含 <code>/</code> 或控制字符。'),
                 P('access', 'ShareAccess', None, '`read` lets everyone at or below the scope see and use the item; `write` also lets them edit it.',
                   '<code>read</code> 允许该范围内（含下级）的所有人查看和使用；<code>write</code> 还允许编辑。'), COMMAND], 'Promise<Share>',
                 ('Shares the item with everyone at or below `scope`; a repeat changes the access.', '将内容共享给 <code>scope</code> 范围内（含下级）的所有人；重复调用会修改权限。'),
                 ('PUT', '/v1/shares/{kind}/{item_id}/{scope}'), body='ShareRequest', response='ShareOut'),
          Method('shares.list', ('List an item\'s shares', '列出共享'), [P('item', 'ShareTarget', Ts('ShareTarget'))], 'Promise<Share[]>',
                 ('Lists an item\'s shares, oldest first, for whoever may share it (its owner or an admin above them); others who can read it get `FORBIDDEN`. It returns an array, not a page: an item has few shares.',
                  '按从旧到新列出某项内容的共享，仅限可共享它的人（所有者或其上级管理员）；其他能读取它的人得到 <code>FORBIDDEN</code>。返回数组而非分页：一项内容的共享很少。'),
                 ('GET', '/v1/shares/{kind}/{item_id}'), response='SharesOut'),
          Method('shares.remove', ('Stop sharing', '取消共享'), [P('item', 'ShareTarget', Ts('ShareTarget')), P('scope', 'string', None, 'The scope to stop sharing with.', '要停止共享的范围。'), COMMAND], 'Promise<void>',
                 ('Removes the item\'s share with `scope`; it succeeds when there was none, and those it reached get `NOT_FOUND` again.', '移除内容与 <code>scope</code> 的共享；原本没有共享时同样成功，原先通过它访问的人再次得到 <code>NOT_FOUND</code>。'),
                 ('DELETE', '/v1/shares/{kind}/{item_id}/{scope}'))],
         ['Share']),
    Page('reference-sessions', ('Agent and Sessions', 'Agent 与 Session'),
         ('Open Sessions with the Ads Agent and bind a handle to one.', '与 Ads Agent 打开 Session，并将 handle 绑定到 Session。'),
         [('A Session is one conversation with the Ads Agent. Its behaviour (states, sending while the Agent works, waiting for renders, Stop) is in <a href="@guide:agent">Agent conversations</a>; message and state types are the ones the SDK exports.',
           'Session 是与 Ads Agent 的一次对话。其行为（状态、Agent 工作时发送消息、等待渲染、停止）参见 <a href="@guide:agent">Agent 对话</a>；消息和状态类型以 SDK 导出的类型为准。')],
         [], ['SessionFile']),
]
PAGE_KEYS = [page.key for page in PAGES]
MODEL_PAGE = {name: page.key for page in PAGES for name in page.models}
SECTIONS = [(page.key, page.title[0], page.title[1], page.methods) for page in PAGES]

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
    ('NewStoryboardInput', 'instruction'): ('The shooting style you want, in words. It may name files with tokens, as in `scripts.generate`.', '用文字说明想要的拍摄风格。可以像 <code>scripts.generate</code> 一样用标记指定文件。'),
    ('NewStoryboardInput', 'batch_id'): ('Only for a Script without a Batch: the Batch to make it in. Otherwise the Storyboard keeps its Script\'s Batch.', '仅用于没有批次的脚本：分镜所属的批次。否则分镜沿用脚本的批次。'),
    ('ReviseStoryboardInput', 'instruction'): ('What to change, in words.', '用文字说明要修改的内容。'),
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
    """Expands schemas into rows. A field whose type is a model (COMPONENT_MODELS) links to it instead of repeating it."""

    def __init__(self):
        self.problems = []
        self.used = set()  # English strings translated through reference_zh.json
        self.notes_used = set()

    def type_html(self, node, defs):
        schema, nullable, name = unwrap(node, defs)
        text = self.base_type(schema, name, defs)
        return text + (' | null' if nullable else '')

    def base_type(self, schema, name, defs):
        if 'anyOf' in schema:
            return ' | '.join(self.type_html(branch, defs) for branch in schema['anyOf'])
        if 'const' in schema:
            return escape(json.dumps(schema['const']))
        if 'enum' in schema:
            return ' | '.join(escape(json.dumps(value)) for value in schema['enum'])
        kind = schema.get('type')
        if kind == 'array':
            item = self.type_html(schema.get('items', {}), defs)
            return (f'({item})' if ' | ' in item else item) + '[]'
        if is_object(schema):
            if name is None:
                return 'object'
            return type_link(COMPONENT_MODELS[name]) if name in COMPONENT_MODELS else escape(name)
        values = map_values(schema)
        if kind == 'object' or values is not None or 'additionalProperties' in schema:
            if values is not None and unwrap(values, defs)[0] != {}:
                return '{[key]: ' + self.type_html(values, defs) + '}'
            return 'JSON object'
        if kind == 'string':
            fmt = schema.get('format')
            if fmt == 'uuid' or schema.get('pattern') == ID_PATTERN:
                return 'string (id)'
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

    def fields(self, schema, defs, rows, prefix='', omit=(), only=None, partial=False, source='', notes=None):
        schema, _, _ = unwrap(schema, defs)
        required = set(schema.get('required', ()))
        for key, prop in schema.get('properties', {}).items():
            if key in omit or (only is not None and key not in only):
                continue
            path = f'{prefix}.{key}' if prefix else key
            self.field(prop, defs, rows, path, key in required and not partial, f'{source}.{key}', notes)

    def field(self, prop, defs, rows, path, required, source, notes=None, desc=None):
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
        row = {'path': path, 'type': self.type_html(prop, defs), 'required': required, 'default': prop.get('default', schema.get('default')),
               'limits': limits(schema, defs), 'desc': [desc] if desc else [], 'source': source}
        if source in FIELD_NOTES:
            row['desc'].append(T(*FIELD_NOTES[source], source=source))
            self.notes_used.add('field:' + source)
        if not row['desc']:
            self.problems.append(f'{source}: no description (field {path}).')
        rows.append(row)
        # Expand what it holds, unless it is a model: an object, the objects of an array, or the values of a map.
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
        if target is None or target_name in COMPONENT_MODELS:
            return
        self.fields(target, defs, rows, child, source=source, notes=notes)


def type_link(name, text=None):
    """A link to a type's definition, resolved per page and language when rendered (`@type:Name`)."""
    return f'<a href="@type:{name}">{escape(text or name)}</a>'


def link_types(text):
    """Escape a TypeScript type and link every model or Introduction type it names."""
    known = set(MODELS) | set(INTRO_TYPES)
    return re.sub(r'\b[A-Z][A-Za-z]+\b', lambda m: type_link(m.group()) if m.group() in known else m.group(), escape(text))


# ── The model of the pages ───────────────────────────────────────────────

def components():
    return openapi()['components']['schemas']


def ts_members(name):
    members = contract()['clients'].get(name)
    if members is None:
        raise KeyError(f'reference_contract.mjs does not report {name}.')
    return members


def ts_rows(walker, spec):
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
        rows.append({'path': path, 'type': link_types(type_), 'required': not member.get('optional', False), 'default': default, 'limits': [],
                     'desc': [desc] if desc else [], 'source': key, 'raw_default': True})
    return rows


SDK_QUERY = {'cursor': ('A page\'s `nextCursor`, for the page after it.', '某页的 <code>nextCursor</code>，用于获取其下一页。')}


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
        if name in SDK_QUERY:
            # The REST contract names the backend's field; the SDK's page has its own name.
            desc = T(*SDK_QUERY[name], source=f'{path}?{name}')
        elif text:
            desc = T(text, source=f'{path}?{name}')
        elif name in QUERY_NOTES:
            desc = T(*QUERY_NOTES[name], source=f'{path}?{name}')
            walker.notes_used.add('query:' + name)
        else:
            desc = None
            walker.problems.append(f'{method} {path}: query parameter {name} has no description and no QUERY_NOTES entry.')
        inner, _, _ = unwrap(schema, {})
        rows.append({'path': name, 'type': walker.type_html(schema, {}), 'required': False, 'default': schema.get('default'),
                     'limits': limits(inner, {}), 'desc': [desc] if desc else [], 'source': f'{path}?{name}'})
    return rows


def spec_rows(walker, specs, owner, route=None):
    """The rows of a list of specs, in order."""
    if not isinstance(specs, list):
        specs = [specs]
    rows = []
    for spec in specs:
        if isinstance(spec, Zod):
            schema = contract()['zod'].get(spec.name)
            if schema is None:
                walker.problems.append(f'reference_contract.mjs does not report the zod schema {spec.name}.')
                continue
            notes = {path: note for (name, path), note in ZOD_NOTES.items() if name == spec.name}
            notes['__name__'] = spec.name
            local = []
            walker.fields(schema, schema.get('$defs', {}), local, '', spec.omit, spec.only, spec.partial, f'zod:{spec.name}', notes)
            # A prefix moves the rows under it; the notes keep their unprefixed paths.
            for row in local:
                if spec.prefix:
                    row['path'] = spec.prefix + '.' + row['path']
            rows += local
        elif isinstance(spec, Api):
            schema = components().get(spec.name)
            if schema is None:
                walker.problems.append(f'backend.openapi.json has no schema {spec.name}.')
                continue
            walker.fields(schema, components(), rows, spec.prefix, spec.omit, spec.only, spec.partial, spec.name)
        elif isinstance(spec, Ts):
            rows += ts_rows(walker, spec)
        elif isinstance(spec, Query):
            rows += query_rows(walker, spec, spec.route or route)
        elif isinstance(spec, Field):
            schema = components().get(spec.schema)
            prop = (schema or {}).get('properties', {}).get(spec.name)
            if prop is None:
                walker.problems.append(f'backend.openapi.json has no field {spec.schema}.{spec.name}.')
                continue
            required = spec.required if spec.required is not None else spec.name in schema.get('required', ())
            walker.field(prop, components(), rows, spec.path, required, f'{spec.schema}.{spec.name}', desc=spec.note)
        elif isinstance(spec, Row):
            rows.append({'path': spec.path, 'type': link_types(spec.type), 'required': spec.required, 'default': spec.default or None, 'limits': [],
                         'desc': [spec.desc], 'source': f'{owner}:{spec.path}', 'raw_default': True})
    return rows


ERROR_ROWS = [Api('Error'), Field('ErrorResponse', 'request_id', 'requestId', required=False),
              Row('method', 'string', False, 'The SDK method that failed, e.g. `products.update`.', '失败的 SDK 方法，例如 <code>products.update</code>。')]
PAGE_ROWS = [Row('items', 'T[]', True, 'The page\'s items.', '本页的条目。'), NEXT_CURSOR]


def build_model():
    walker = Walker()
    built = {'walker': walker, 'methods': {}, 'models': {}, 'intro': {}}
    for name in ('NuvaClientOptions', 'AccessToken', 'StoreCommandOptions', 'CommandOptions'):
        built['intro'][name] = spec_rows(walker, Ts(name), name)
    built['intro']['AdsError'] = spec_rows(walker, ERROR_ROWS, 'AdsError')
    built['intro']['Page'] = spec_rows(walker, PAGE_ROWS, 'Page')
    for name, specs in MODELS.items():
        built['models'][name] = spec_rows(walker, specs, name)
    for page in PAGES:
        for method in page.methods:
            params = []
            for param in method.params:
                rows = spec_rows(walker, param.spec, method.path, method.route) if param.spec is not None else []
                params.append((param, rows))
            output = spec_rows(walker, method.output, method.path) if method.output else []
            built['methods'][method.path] = {'method': method, 'params': params, 'output': output}
    built['agent'] = agent_model(walker)
    return built


def agent_model(walker):
    entries = []
    store = set(contract()['clients']['StoreClients'])
    for interface, prefix in (('NuvaClient', 'client'), ('SessionsClient', 'client.sessions'), ('AgentHandle', 'agent'), ('SessionFilesClient', 'agent.files')):
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

def all_methods():
    return [method for page in PAGES for method in page.methods]


def check_methods(walker):
    store = contract()['clients']['StoreClients']
    mapped = {method.path: method for method in all_methods()}
    for client, members in store.items():
        for member in members:
            path = f'{client}.{member["name"]}'
            method = mapped.pop(path, None)
            if method is None:
                walker.problems.append(f'{path}: a public method of StoreClients missing from PAGES.')
                continue
            declared = [(p['name'], p['optional']) for p in member['parameters']]
            listed = [param.name for param in method.params]
            if [name for name, _ in declared] != listed:
                walker.problems.append(f'{path}: PAGES lists parameters {listed}; stores.ts declares {[name for name, _ in declared]}.')
            method.optional = {name for name, optional in declared if optional}
    for path in mapped:
        walker.problems.append(f'{path}: in PAGES but not a method of StoreClients.')
    job = {member['name'] for member in ts_members('Job')}
    documented = {row.path.split('(')[0] for row in JOB_METHODS}
    if job != documented:
        walker.problems.append(f'Job methods are {sorted(job)}; JOB_METHODS documents {sorted(documented)}.')
    for key in AGENT_METHODS:
        if 'agent:' + key not in walker.notes_used:
            walker.problems.append(f'AGENT_METHODS[{key!r}]: no such public member.')
    titles = {key: (en, zh) for key, en, zh in DOCUMENTS}
    if [INTRO, *PAGE_KEYS] != list(REFERENCE):
        walker.problems.append(f'customer_layout.DOCUMENTS lists the reference pages {list(REFERENCE)}; PAGES has {[INTRO, *PAGE_KEYS]}.')
    for page in PAGES:
        if titles.get(page.key) != page.title:
            walker.problems.append(f'{page.key}: titled {page.title} in PAGES, {titles.get(page.key)} in customer_layout.DOCUMENTS.')
    for name in MODELS:
        if name not in MODEL_PAGE:
            walker.problems.append(f'MODELS[{name!r}]: on no page.')
    known = set(MODELS) | set(INTRO_TYPES)
    for method in all_methods():
        named = set(re.findall(r'\b[A-Z][A-Za-z]+\b', method.returns)) - {'Promise'}
        if not named & known and method.output is None and method.returns not in ('Promise<void>', '() => void'):
            walker.problems.append(f'{method.path}: returns {method.returns}, which names no model.')


def check_routes(walker):
    """Each mapped schema matches its backend route: request body and success response."""
    paths = openapi()['paths']
    for method in all_methods():
        verb, path = method.route
        if path in GENERATION_ROUTES:
            continue
        operation = paths.get(path, {}).get(verb.lower())
        if operation is None:
            walker.problems.append(f'{method.path}: {verb} {path} is not in backend.openapi.json.')
            continue
        body = operation.get('requestBody', {}).get('content', {}).get('application/json', {}).get('schema', {}).get('$ref', '').rsplit('/', 1)[-1] or None
        if body != method.body:
            walker.problems.append(f'{method.path}: {verb} {path} takes {body}; PAGES says {method.body}.')
        success = [response for status, response in operation['responses'].items() if status.startswith('2')]
        returned = {response.get('content', {}).get('application/json', {}).get('schema', {}).get('$ref', '').rsplit('/', 1)[-1] for response in success}
        if returned != {method.response or ''}:
            walker.problems.append(f'{method.path}: {verb} {path} returns {sorted(returned)}; PAGES says {method.response or "nothing"}.')


def check_examples(walker):
    """Every method has an example that ran cleanly and ended with the method's route."""
    results = dict(runs())
    for method in all_methods():
        run = results.pop(method.path, None)
        if run is None:
            walker.problems.append(f'{method.path}: no example in examples/reference.ts.')
            continue
        for problem in run['problems']:
            walker.problems.append(f'{method.path} example: {problem}')
        last = run['requests'][-1] if run['requests'] else None
        if last is None or (last['method'], last['path']) != tuple(method.route):
            walker.problems.append(f'{method.path} example: ends with {last and (last["method"], last["path"])}, not {method.route}.')
        if method.returns not in ('Promise<void>',) and run['result'] is None:
            walker.problems.append(f'{method.path} example: returns nothing to show.')
    for name in results:
        walker.problems.append(f'examples/reference.ts: {name} is not a method in PAGES.')


def check_text(walker, rows_iter):
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


def all_rows(built):
    for item in built['methods'].values():
        for _, rows in item['params']:
            yield from rows
        yield from item['output']
    for rows in built['models'].values():
        yield from rows
    for rows in built['intro'].values():
        yield from rows


@lru_cache(maxsize=None)
def model():
    built = build_model()
    walker = built['walker']
    check_methods(walker)
    check_routes(walker)
    check_examples(walker)
    check_text(walker, all_rows(built))
    for method in all_methods():
        for param in method.params:
            if param.spec is None and param.desc is None and param.type not in ('StoreCommandOptions', 'CommandOptions'):
                walker.problems.append(f'{method.path}: parameter {param.name} has no description.')
    return built


def problems():
    return list(model()['walker'].problems)


def validate():
    found = problems()
    if found:
        raise SystemExit('The API reference has gaps:\n- ' + '\n- '.join(found))


def stats():
    built = model()
    return len(built['methods']), len(built['agent']), sum(1 for _ in all_rows(built))


# ── Rendering ────────────────────────────────────────────────────────────

def resolve(html, page_key, locale):
    """Point `@type:Name` and `@guide:page#anchor` links at their page in this language."""
    def type_href(match):
        name = match.group(1)
        target = INTRO if name in INTRO_TYPES else MODEL_PAGE[name]
        return 'href="' + ('' if target == page_key else filename(target, locale)) + '#' + name + '"'

    def guide_href(match):
        target, _, anchor = match.group(1).partition('#')
        return 'href="' + filename(target, locale) + ('#' + anchor if anchor else '') + '"'
    html = re.sub(r'href="@type:([A-Za-z]+)"', type_href, html)
    return re.sub(r'href="@guide:([a-z0-9-]+(?:#[a-z0-9-]+)?)"', guide_href, html)


def parent_path(path):
    """The row a field belongs to: `data.facts[].claim` → `data.facts`, `cast.<role>.look` → `cast`."""
    if '.' not in path or '(' in path:
        return None
    parent = path.rsplit('.', 1)[0]
    if parent.endswith('[]'):
        parent = parent[:-2]
    keyed = re.match(r'(.*)\.<[^>]+>$', parent)
    return keyed.group(1) if keyed else parent


def tree(rows):
    """Nest rows under the rows whose path they extend."""
    nodes, roots = {}, []
    for row in rows:
        entry = {'row': row, 'children': []}
        parent = nodes.get(parent_path(row['path']))
        (parent['children'] if parent else roots).append(entry)
        nodes[row['path']] = entry
    return roots


def field_name(path):
    return path if parent_path(path) is None else path.rsplit('.', 1)[1]


def meta_html(row, locale):
    zh = locale == 'zh'
    parts = []
    default = row['default']
    if isinstance(default, tuple):
        parts.append(('默认 ' if zh else 'Default ') + escape(default[1] if zh else default[0]))
    elif default is not None and default != [] and default != {}:
        value = str(default) if row.get('raw_default') else json.dumps(default, ensure_ascii=False)
        parts.append(('默认 ' if zh else 'Default ') + f'<code>{escape(value)}</code>')
    limits_text = render_limits(row['limits'], locale)
    if limits_text:
        parts.append(limits_text)
    return f'<p class="field-meta">{" · ".join(parts)}</p>' if parts else ''


def fields_html(nodes, locale, depth=0):
    """A field list: `name?: type`, its description, then its own fields (collapsed below the second level)."""
    zh = locale == 'zh'
    items = []
    for entry in nodes:
        row = entry['row']
        name = field_name(row['path']) + ('' if row['required'] else '?')
        description = ('' if zh else ' ').join(desc.html(locale) for desc in row['desc'])
        body = (f'<p class="field-head"><code class="field-name">{escape(name)}</code><code class="field-type">{row["type"]}</code></p>'
                f'<p class="field-description">{description}</p>' + meta_html(row, locale))
        if entry['children']:
            inner = fields_html(entry['children'], locale, depth + 1)
            if depth >= 1:
                count = len(entry['children'])
                label = f'{count} 个字段' if zh else f'{count} field{"s" if count != 1 else ""}'
                inner = f'<details><summary>{label}</summary>{inner}</details>'
            body += inner
        items.append(f'<li>{body}</li>')
    return '<ul class="fields">' + ''.join(items) + '</ul>'


def compact(name, rows, locale):
    """`Product { id, version, data, 4 more }`, linking to the model."""
    top = [field_name(row['path']) for row in rows if parent_path(row['path']) is None]
    more = len(top) - 4
    shown = ', '.join(top[:4]) + ((f' 等 {len(top)} 个字段' if locale == 'zh' else f', {more} more') if more > 0 else '')
    return f'<code class="compact">{type_link(name)} {{ {escape(shown)} }}</code>'


def http_html(route):
    verb, path = route
    return f'<p class="http"><span class="http-verb http-{verb.lower()}">{verb}</span> <code>{escape(path)}</code></p>'


def signature_html(method):
    client, name = method.path.split('.')
    params = ', '.join(f'{escape(param.name)}{"?" if param.name in method.optional else ""}: {link_types(param.type)}' for param in method.params)
    return f'<div class="signature"><code>client.{client}.<strong>{name}</strong>({params}): {link_types(method.returns)}</code></div>'


def short_signature(method):
    params = ', '.join(param.name + ('?' if param.name in method.optional else '') for param in method.params)
    return f'client.{method.path}({params})'


def display(value, path=()):
    """The returned value as shown: the stored encoding of a Script or Storyboard (`data.text`) is cut short."""
    if isinstance(value, dict):
        return {key: display(item, path + (key,)) for key, item in value.items()}
    if isinstance(value, list):
        return [display(item, path) for item in value]
    if path[-2:] == ('data', 'text') and isinstance(value, str) and len(value) > 48:
        return value[:44] + '…'
    return value


def pretty(value, level=0, column=0):
    """JSON with 2-space indents; an array or object that fits in 80 columns where it starts stays on one line."""
    flat = json.dumps(value, ensure_ascii=False, separators=(', ', ': '))
    if not isinstance(value, (dict, list)) or not value or (level > 0 and column + len(flat) <= 80):
        return flat
    pad = '  ' * (level + 1)
    if isinstance(value, list):
        inner = [pad + pretty(item, level + 1, len(pad)) for item in value]
        return '[\n' + ',\n'.join(inner) + '\n' + '  ' * level + ']'
    inner = []
    for key, item in value.items():
        name = json.dumps(key, ensure_ascii=False) + ': '
        inner.append(pad + name + pretty(item, level + 1, len(pad) + len(name)))
    return '{\n' + ',\n'.join(inner) + '\n' + '  ' * level + '}'


def response_html(method, locale):
    run = runs()[method.path]
    if run['result'] is None:
        return ''
    label = '返回值' if locale == 'zh' else 'Response'
    return code(pretty(display(run['result'])), 'json', locale, filename=label)


def method_section(method, built, page_key, locale):
    zh = locale == 'zh'
    t = lambda en, zh_: zh_ if zh else en
    item = built['methods'][method.path]
    body = signature_html(method) + http_html(method.route) + f'<p>{method.purpose.html(locale)}</p>'
    body += ''.join(f'<p>{note.html(locale)}</p>' for note in method.notes)
    params = []
    for param, rows in item['params']:
        optional = '?' if param.name in method.optional else ''
        head = f'<p class="field-head"><code class="field-name">{escape(param.name)}{optional}</code><code class="field-type">{link_types(param.type)}</code></p>'
        if param.type in ('StoreCommandOptions', 'CommandOptions'):
            text = t('<code>idempotencyKey</code> and <code>requestId</code>.' if param.type == 'StoreCommandOptions' else '<code>requestId</code>.',
                     '<code>idempotencyKey</code> 和 <code>requestId</code>。' if param.type == 'StoreCommandOptions' else '<code>requestId</code>。')
            params.append(f'<li>{head}<p class="field-description">{text}</p></li>')
        elif rows:
            params.append(f'<li>{head}' + (f'<p class="field-description">{param.desc.html(locale)}</p>' if param.desc else '') + fields_html(tree(rows), locale, 0) + '</li>')
        else:
            params.append(f'<li>{head}<p class="field-description">{param.desc.html(locale)}</p></li>')
    if params:
        body += f'<h3>{t("Parameters", "参数")}</h3><ul class="fields params">' + ''.join(params) + '</ul>'
    body += f'<h3>{t("Returns", "返回")}</h3>'
    if item['output']:
        body += f'<p><code>{link_types(method.returns)}</code></p>' + fields_html(tree(item['output']), locale)
    else:
        named = [name for name in re.findall(r'\b[A-Z][A-Za-z]+\b', method.returns) if name in MODELS]
        if named:
            name = named[-1]
            body += f'<p>{compact(name, built["models"][name], locale)}</p>'
            if 'Page<' in method.returns:
                body += f'<p>{t("A page of them:", "按页返回：")} <code>{link_types("Page")} {{ items, nextCursor }}</code></p>'
        else:
            body += f'<p><code>{link_types(method.returns)}</code>{t(": nothing.", "：无返回内容。") if method.returns == "Promise<void>" else ""}</p>'
    body += f'<h3>{t("Example", "示例")}</h3>' + code(region(method.path), 'ts', locale) + response_html(method, locale)
    return (method.anchor, method.title.html(locale), resolve(body, page_key, locale))


def model_html(name, rows, locale, note=None):
    zh = locale == 'zh'
    heading = f'<h3 id="{name}"><code>{escape(name)}</code></h3>'
    text = f'<p>{T(*note).html(locale)}</p>' if note else ''
    if name == 'Job':
        text += f'<p><code>Job = {type_link("JobState")} &amp; {{ subscribe, result }}</code></p>'
    return heading + text + fields_html(tree(rows), locale)


def page_sections(key, locale='zh'):
    """The sections of one resource page."""
    built = model()
    zh = locale == 'zh'
    t = lambda en, zh_: zh_ if zh else en
    page = next(page for page in PAGES if page.key == key)
    overview = ''.join(f'<p>{summary.html(locale)}</p>' for summary in page.summary)
    if page.methods:
        overview += '<ul class="method-list">' + ''.join(
            f'<li><a href="#{method.anchor}"><code>{escape(short_signature(method))}</code></a>'
            f'<span class="http-inline"><span class="http-verb http-{method.route[0].lower()}">{method.route[0]}</span> <code>{escape(method.route[1])}</code></span></li>'
            for method in page.methods) + '</ul>'
    sections = [('overview', t('Overview', '概览'), resolve(overview, key, locale))]
    if key == 'reference-sessions':
        agent = ''.join(f'<li><p class="field-head"><code class="field-name">{escape(signature)}</code></p><p class="field-description">{desc.html(locale)}</p></li>' for signature, desc in built['agent'])
        body = code(region('sessions'), 'ts', locale) + f'<ul class="fields">{agent}</ul>'
        sections.append(('members', t('Members', '成员'), resolve(body, key, locale)))
    for method in page.methods:
        sections.append(method_section(method, built, key, locale))
    models = ''.join(model_html(name, built['models'][name], locale, MODEL_NOTES.get(name)) for name in page.models)
    sections.append(('models', t('Models', '数据模型'), resolve(models, key, locale)))
    return sections


def intro_sections(locale='zh'):
    """The Introduction: the client, the API version, errors, idempotency, lists and versions."""
    built = model()
    zh = locale == 'zh'
    t = lambda en, zh_: zh_ if zh else en
    p = lambda en, zh_: '<p>' + t(en, zh_) + '</p>'
    intro = built['intro']
    rows = lambda name: fields_html(tree(intro[name]), locale)
    heading = lambda name, suffix='': f'<h3 id="{name}"><code>{name}</code>{suffix}</h3>'
    pages = ''.join(f'<li><a href="{filename(page.key, locale)}">{escape(page.title[1] if zh else page.title[0])}</a>: {page.blurb.html(locale)}</li>' for page in PAGES)
    sections = [
        ('overview', t('Overview', '概览'),
         p(f'Every method of the TypeScript SDK, for API version <code>{API_VERSION}</code>, one page per resource. How the methods fit together is in the guides: <a href="@guide:agent">Agent conversations</a>, <a href="@guide:store">Products and media</a>, <a href="@guide:generation">Content generation</a>.',
           f'TypeScript SDK 的全部方法，适用于 API 版本 <code>{API_VERSION}</code>，每种资源一页。方法如何配合使用参见指南：<a href="@guide:agent">Agent 对话</a>、<a href="@guide:store">产品与媒体</a>、<a href="@guide:generation">内容生成</a>。')
         + f'<ul class="page-list">{pages}</ul>'
         + p('In a record, <code>data</code> is what you write and the writers read; the fields around it are the record the service keeps or computes (<code>assets</code> expands the IDs in <code>data</code> with download URLs); <code>ref</code> and <code>label</code> are SDK helpers.',
             '记录中的 <code>data</code> 是你写入、编写服务读取的内容；其外的字段是服务保存或计算出的记录信息（<code>assets</code> 将 <code>data</code> 中的 ID 展开为带下载地址的条目）；<code>ref</code> 和 <code>label</code> 是 SDK 提供的辅助字段。')),
        ('client', t('Create the client', '创建客户端'),
         '<div class="signature"><code><strong>createNuva</strong>(options: ' + type_link('NuvaClientOptions') + '): NuvaClient</code></div>'
         + p('Create one client per signed-in user, and call <code>close()</code> on logout or account change.', '为每个已登录用户创建一个客户端；退出登录或切换账号时调用 <code>close()</code>。')
         + code(region('create-client'), 'ts', locale)
         + heading('NuvaClientOptions') + rows('NuvaClientOptions')
         + heading('AccessToken', t(': what <code>getAccessToken</code> returns', '：<code>getAccessToken</code> 的返回值')) + rows('AccessToken')),
        ('api-version', t('API version', 'API 版本'),
         p(f'The SDK sends <code>Nuva-Api-Version: {API_VERSION}</code> with every request, and this reference describes that version. You don\'t set it; a new SDK release that moves to a newer version says so in its upgrade guide.',
           f'SDK 在每个请求中发送 <code>Nuva-Api-Version: {API_VERSION}</code>，本参考描述的就是该版本。无需自行设置；升级到新 API 版本的 SDK 版本会在升级指南中说明。')),
        ('errors', t('Errors', '错误'),
         p('Every failure is an <code>AdsError</code>. Branch on <code>code</code>; show <code>message</code>; when you report a problem to us, send <code>requestId</code> and <code>method</code>. Every error from a request the SDK sent has a <code>requestId</code>; one refused before sending (bad input) has none, since nothing reached the service.',
           '所有失败都是 <code>AdsError</code>。按 <code>code</code> 分支处理，展示 <code>message</code>；向我们反馈问题时，请附上 <code>requestId</code> 和 <code>method</code>。SDK 已发出的请求所产生的错误都带有 <code>requestId</code>；发送前即被拒绝的错误（输入有误）没有，因为请求未到达服务。')
         + source_example('errors', locale, "import { AdsError, type NuvaClient } from '@nuva/sdk';")
         + heading('AdsError') + rows('AdsError')
         + p('When <code>retryable</code> is true, send the call again; for a write, with the same <code>idempotencyKey</code>. That is always safe: a write that already happened returns what it made. The SDK already sends a request again by itself after a dropped connection or <code>SERVICE_BUSY</code> (twice at most, with the same key), but not after a timeout.',
             '<code>retryable</code> 为 true 时可以再次调用；写入请使用相同的 <code>idempotencyKey</code>。这样做始终安全：已完成的写入会返回其结果。连接中断或 <code>SERVICE_BUSY</code> 时，SDK 已会自行重发请求（最多两次，使用相同 key），超时则不会。')
         + table([t('Code', '错误码'), t('Handling', '处理方式')], [
             ['<code>UNAUTHENTICATED / FORBIDDEN</code>', t('Check login and resource access.', '检查登录状态和资源权限。')],
             ['<code>NOT_FOUND</code>', t('The item does not exist or is not shared with the user.', '内容不存在，或未共享给该用户。')],
             ['<code>REVISION_CONFLICT</code>', t('Someone saved a newer version: read it again and reapply the change.', '已有人保存了更新的版本：重新读取后再应用修改。')],
             ['<code>IDEMPOTENCY_CONFLICT</code>', t('The key belongs to different input. Use the original input to recover, or a new key for new work.', '该 key 已绑定不同输入。恢复时使用原输入；新任务使用新 key。')],
             ['<code>INVALID_INPUT</code>', t('The input is malformed or uses a removed form; nothing was done. The message says what to change.', '输入格式错误或使用了已移除的写法，未执行任何操作。错误信息说明需要修改的内容。')],
             ['<code>REJECTED</code>', t('The service refused the input, for example a Storyboard that fails its checks. The message lists the problems.', '服务拒绝了输入，例如分镜未通过检查。错误信息列出具体问题。')],
             ['<code>ASSET_EXISTS</code>', t('You added this file before with a different label or description. The message names the Asset; change its text with <code>assets.update</code>.', '你之前添加过该文件，但标签或描述不同。错误信息给出该 Asset；请用 <code>assets.update</code> 修改其文字。')],
             ['<code>JOB_FINISHED</code>', t('The Job already ended; it cannot be cancelled.', '任务已结束，不能取消。')],
             ['<code>CALL_ALREADY_RESOLVED / CALL_OBSOLETE</code>', t('Read the current interaction state.', '读取当前交互状态。')],
         ])),
        ('idempotency', t('Idempotency keys and request IDs', '幂等 key 与请求 ID'),
         p('<code>idempotencyKey</code> makes a write safe to retry: the same key with the same input returns what the first call made, and the same key with other input fails with <code>IDEMPOTENCY_CONFLICT</code>. The SDK makes a key for every write that takes one, and uses it for its own retries. If you retry a write yourself, pass your own key, the same one each time; use a new one for a new write, even with the same input. Writes that take no key (<code>jobs.cancel</code>, <code>products.delete</code>, <code>shares.set</code>, <code>shares.remove</code>, <code>assets.update</code>, and the Agent\'s <code>send</code>, <code>stop</code>, <code>respond</code> and <code>fail</code>, which use their <code>requestId</code>) end the same however often they are sent. <code>requestId</code> otherwise only correlates a request in errors.',
           '<code>idempotencyKey</code> 让写入可安全重试：相同 key 和相同输入返回第一次调用的结果；相同 key 但输入不同时返回 <code>IDEMPOTENCY_CONFLICT</code>。SDK 会为每个支持 key 的写入生成一个 key，并在自行重试时使用。如果你自己重试写入，请传入自己的 key，每次都相同；新的写入即使输入相同也使用新 key。不支持 key 的写入（<code>jobs.cancel</code>、<code>products.delete</code>、<code>shares.set</code>、<code>shares.remove</code>、<code>assets.update</code>，以及 Agent 的 <code>send</code>、<code>stop</code>、<code>respond</code>、<code>fail</code>，它们使用各自的 <code>requestId</code>）无论发送多少次结果都相同。除此之外，<code>requestId</code> 只用于在错误中关联请求。')
         + code(region('idempotency'), 'ts', locale)
         + heading('StoreCommandOptions', t(': the options of a write that takes a key', '：支持幂等 key 的写入方法的选项')) + rows('StoreCommandOptions')
         + heading('CommandOptions', t(': the options of a write that takes none', '：不支持幂等 key 的写入方法的选项')) + rows('CommandOptions')),
        ('lists', t('Lists', '列表'),
         p('A <code>list</code> method returns one page. Pass <code>nextCursor</code> as <code>cursor</code> to read the next, until it is null.',
           '<code>list</code> 方法每次返回一页。将 <code>nextCursor</code> 作为 <code>cursor</code> 传入读取下一页，直到它为 null。')
         + heading('Page') + rows('Page')),
        ('versions', t('Versions', '版本'),
         table([t('Value', '值'), t('Meaning', '含义')], [
             ['<code>0.1.0-preview.5</code>', t('SDK package version.', 'SDK 包版本。')],
             [f'<code>Nuva-Api-Version: {API_VERSION}</code>', t('The API version the SDK sends with every request.', 'SDK 在每个请求中发送的 API 版本。')],
             ['<code>/v1/…</code>', t('Public HTTP API version.', '公开 HTTP API 版本。')],
             ['<code>version: 1</code>', t('Agent message-envelope protocol revision; omission also means v1.', 'Agent 消息封装协议版本；省略时同样按 v1 处理。')],
             ['<code>schema_version: 1</code>', t('Current backend Artifact schema.', '当前后端产物 schema。')],
             ['<code>product.schema_version: 2</code>', t('Product data with <code>image_asset_ids</code> and <code>video_asset_ids</code>.', '包含 <code>image_asset_ids</code> 和 <code>video_asset_ids</code> 的产品数据。')],
             ['<code>script.format: 3</code>', t('Script content in <code>script.content</code> (stored as nuva.script version 3).', '通过 <code>script.content</code> 返回的脚本内容（存储为 nuva.script 版本 3）。')],
             ['<code>script.format: 2</code>', t('A read-only ScriptPackage saved before Storyboards, in <code>script.legacy</code>.', '分镜功能推出前保存的只读 ScriptPackage，位于 <code>script.legacy</code>。')],
             ['<code>nuva.storyboard version 1</code>', t('Storyboard content in <code>storyboard.content</code>.', '通过 <code>storyboard.content</code> 返回的分镜内容。')],
         ])),
    ]
    return [(key, name, resolve(body, INTRO, locale)) for key, name, body in sections]


def reference_pages(locale='zh'):
    """Every reference page's sections, by page key."""
    return {INTRO: intro_sections(locale), **{page.key: page_sections(page.key, locale) for page in PAGES}}
