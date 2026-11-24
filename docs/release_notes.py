"""The Release notes page, in Chinese and English: one entry per version, newest first.

Each entry says when it shipped, what it needs, how to upgrade (a link into the upgrade guide, migration_guide.py,
when there is something to change), and its changes in groups. It is the customer's summary; CHANGELOG.md keeps the
full notes and feeds the GitHub release. check_customer.py requires one entry per CHANGELOG.md heading, in order.

At a release, rename the `Unreleased` entry to the version, with its date, as CHANGELOG.md does.
"""
from dataclasses import dataclass, field
from pathlib import Path
import re

from customer_layout import code, filename

CHANGELOG = Path(__file__).resolve().parents[1] / 'CHANGELOG.md'
FULL_CHANGELOG = 'https://github.com/Nuva-Lab/ads-sdk/blob/main/CHANGELOG.md'
# The order groups appear in, and their headings.
GROUPS = {
    'breaking': ('Breaking changes', '不兼容变更'),
    'added': ('Added', '新增'),
    'changed': ('Changed', '变更'),
    'fixed': ('Fixed', '修复'),
    'docs': ('Docs', '文档'),
    'playground': ('Playground', 'Playground'),
}


@dataclass
class Release:
    version: str  # as its CHANGELOG.md heading: `Unreleased` or `0.1.0-preview.N`
    date: str | None  # None until it ships
    summary: tuple[str, str]  # (English, Chinese)
    needs: tuple[str, str]  # what it needs from the services
    upgrade: tuple[str, str]  # how to upgrade; HTML, may link into the upgrade guide
    changes: dict[str, list[tuple[str, str]]] = field(default_factory=dict)  # group → [(English, Chinese)]

    @property
    def key(self):
        return 'unreleased' if self.version == 'Unreleased' else self.version.removeprefix('0.1.0-').replace('.', '-')


def releases(locale):
    """The entries; links resolve for `locale`."""
    guide = lambda anchor: filename('migration', locale) + '#' + anchor
    a = lambda anchor, en, zh: (f'<a href="{guide(anchor)}">{en}</a>', f'<a href="{guide(anchor)}">{zh}</a>')
    preview7_guide, preview6_guide, preview5_guide = a('preview7', 'Upgrade to preview.7', '升级到 preview.7'), a('preview6', 'Upgrade to preview.6', '升级到 preview.6'), a('overview', 'Upgrade to preview.5', '升级到 preview.5')
    return [
        Release(
            'Unreleased', None,
            ('A newer backend no longer breaks the SDK: fields and values it doesn\'t know come through.',
             '更新的后端不会再让 SDK 出错：不认识的字段和取值会原样返回。'),
            ('Works with the services already live. API version <code>2026-11-07</code>, unchanged.',
             '可用于已上线的服务。API 版本 <code>2026-11-07</code>，未变。'),
            ('Code that keeps an Asset\'s <code>kind</code>, a Job\'s <code>status</code> or a similar field in a narrower type, or switches over every known value, needs a case for the others.',
             '若代码把 Asset 的 <code>kind</code>、Job 的 <code>status</code> 等字段存入更窄的类型，或对所有已知取值做穷举判断，需要为其他取值增加分支。'),
            {
                'changed': [
                    ('<strong>Fields and values a newer backend adds come through.</strong> A new field is kept; a new value in a field with a set of values (an Asset\'s <code>kind</code> and <code>source</code>, a Job\'s <code>status</code>, a callback\'s <code>status</code>, a Prompt\'s <code>ratio</code>, a share\'s <code>access</code>) is the string the backend sent. Earlier SDKs refuse the whole response. What the SDK sends is checked as before.',
                     '<strong>更新的后端新增的字段和取值会原样返回。</strong>新字段会保留；取值固定的字段（Asset 的 <code>kind</code> 和 <code>source</code>、Job 的 <code>status</code>、回调的 <code>status</code>、Prompt 的 <code>ratio</code>、共享的 <code>access</code>）若出现新值，返回后端给出的字符串。旧版 SDK 会拒绝整个响应。SDK 发送的内容仍按原规则校验。'),
                    ('The types are the known values or any other string (<code>\'image\' | \'video\' | … | (string &amp; {})</code>). A Job in a status the SDK doesn\'t know is still under way: <code>subscribe</code> and <code>result</code> wait until it is <code>completed</code>, <code>failed</code> or <code>cancelled</code>.',
                     '类型为已知取值或任意其他字符串（<code>\'image\' | \'video\' | … | (string &amp; {})</code>）。状态未知的 Job 视为仍在进行：<code>subscribe</code> 和 <code>result</code> 会等待其变为 <code>completed</code>、<code>failed</code> 或 <code>cancelled</code>。'),
                ],
            },
        ),
        Release(
            '0.1.0-preview.7', '2026-11-24',
            ('Documents the Agent reads, auto-share rules per scope, user deletion, and archiving for Sessions and Skills.',
             'Agent 可阅读的文档、按范围的自动共享规则、用户删除，以及 Session 和 Skill 的归档。'),
            ('Works with the services already live. API version <code>2026-11-07</code>, unchanged.',
             '可用于已上线的服务。API 版本 <code>2026-11-07</code>，未变。'),
            (f'Most integrations need no change: see {preview7_guide[0]}.',
             f'大多数集成无需修改，见{preview7_guide[1]}。'),
            {
                'added': [
                    ('<strong>Documents the Agent reads:</strong> PDF (up to 50 MB), Word and Excel (<code>.docx</code> / <code>.xlsx</code>, up to 30 MB). An Asset\'s <code>kind</code> can be <code>document</code>. Older SDKs can\'t read a document Asset, so upgrade everyone in your organization before your users upload documents.',
                     '<strong>Agent 可阅读的文档：</strong>PDF（最大 50 MB）、Word 和 Excel（<code>.docx</code> / <code>.xlsx</code>，最大 30 MB）。Asset 的 <code>kind</code> 可能为 <code>document</code>。旧版 SDK 无法读取文档 Asset，请在用户上传文档前让组织内所有人升级。'),
                    ('<strong>Auto-share rules per scope</strong> (<a href="https://github.com/Nuva-Lab/ads-sdk/issues/48">#48</a>): <code>shares.setAutoShare</code> and Go <code>SetAutoShare</code>. The old organization-wide setting is now a <code>read</code> rule on <code>customer</code>, so nothing changes.',
                     '<strong>按范围的自动共享规则</strong>（<a href="https://github.com/Nuva-Lab/ads-sdk/issues/48">#48</a>）：<code>shares.setAutoShare</code> 和 Go 的 <code>SetAutoShare</code>。原有的组织级设置已转为 <code>customer</code> 上的 <code>read</code> 规则，行为不变。'),
                    ('<strong>Delete a user</strong> (Go): <code>DeleteUser</code>. Afterwards, a token or memberships for that ID return <code>409 USER_DELETED</code>; what they made stays.',
                     '<strong>删除用户</strong>（Go）：<code>DeleteUser</code>。之后为该 ID 申请令牌或设置成员关系会返回 <code>409 USER_DELETED</code>；其创建的内容会保留。'),
                    ('<strong>Archive Sessions</strong> (<a href="https://github.com/Nuva-Lab/ads-sdk/issues/35">#35</a>): <code>sessions.archive</code> / <code>sessions.unarchive</code>, and <code>sessions.list({ archived: true })</code>.',
                     '<strong>归档 Session</strong>（<a href="https://github.com/Nuva-Lab/ads-sdk/issues/35">#35</a>）：<code>sessions.archive</code> / <code>sessions.unarchive</code>，以及 <code>sessions.list({ archived: true })</code>。'),
                    ('<strong>Archive Skills:</strong> <code>ArchiveSkill</code> / <code>UnarchiveSkill</code>, and <code>skills.list({ archived: true })</code>.',
                     '<strong>归档 Skill：</strong><code>ArchiveSkill</code> / <code>UnarchiveSkill</code>，以及 <code>skills.list({ archived: true })</code>。'),
                ],
                'changed': [
                    ('<code>fact_product_tags</code> and <code>fact_product_video_requirements</code> are gone from the Script types.',
                     '脚本类型中移除了 <code>fact_product_tags</code> 和 <code>fact_product_video_requirements</code>。'),
                ],
                'fixed': [
                    ('A Session\'s first message no longer fails with “No acknowledgement received” (<a href="https://github.com/Nuva-Lab/ads-sdk/issues/44">#44</a>): Agent requests wait 30 s for their answer.',
                     'Session 首条消息不再报“No acknowledgement received”（<a href="https://github.com/Nuva-Lab/ads-sdk/issues/44">#44</a>）：Agent 请求的等待时间改为 30 秒。'),
                    ('Skills you register are used in Agent conversations (<a href="https://github.com/Nuva-Lab/ads-sdk/issues/36">#36</a>).',
                     '你注册的 Skill 会用于 Agent 对话（<a href="https://github.com/Nuva-Lab/ads-sdk/issues/36">#36</a>）。'),
                    ('The Agent no longer gives links or file paths that don\'t work; it writes the text in full in its reply (<a href="https://github.com/Nuva-Lab/ads-sdk/issues/51">#51</a>).',
                     'Agent 不再给出无法使用的链接或文件路径，而是在回复中直接给出全文（<a href="https://github.com/Nuva-Lab/ads-sdk/issues/51">#51</a>）。'),
                    ('Image uploads go up to 30 MB, from 10 MB (<a href="https://github.com/Nuva-Lab/ads-sdk/issues/47">#47</a>). An image over 2048 px or 5 MB is stored as a WebP copy at that size.',
                     '图片上传上限由 10 MB 提高到 30 MB（<a href="https://github.com/Nuva-Lab/ads-sdk/issues/47">#47</a>）。超过 2048 像素或 5 MB 的图片会以该尺寸的 WebP 副本保存。'),
                ],
            }),
        Release(
            '0.1.0-preview.6', '2026-11-11',
            ('A failed token refresh no longer drops the Agent connection; the playground uploads reference files.',
             '令牌刷新失败不再断开 Agent 连接；Playground 可上传参考文件。'),
            ('Works with the services already live. API version <code>2026-11-07</code>, unchanged.',
             '可用于已上线的服务。API 版本 <code>2026-11-07</code>，未变。'),
            (f'No code change from preview.5, unless you threw from <code>getAccessToken</code> to sign users out: see {preview6_guide[0]}.',
             f'从 preview.5 升级无需修改代码；如果你通过在 <code>getAccessToken</code> 中抛出错误来让用户退出登录，见{preview6_guide[1]}。'),
            {
                'fixed': [
                    ('<strong>A failed token refresh no longer stops the Agent connection for good</strong> (<a href="https://github.com/Nuva-Lab/ads-sdk/issues/28">#28</a>). While the current token is valid, the SDK keeps using it and tries again; a connection stopped by an expired token comes back once <code>getAccessToken</code> returns a valid one. To sign a user out, call <code>client.close()</code>.',
                     '<strong>令牌刷新失败不再永久断开 Agent 连接</strong>（<a href="https://github.com/Nuva-Lab/ads-sdk/issues/28">#28</a>）。当前令牌仍有效时，SDK 会继续使用并重试；因令牌过期而停止的连接，会在 <code>getAccessToken</code> 返回有效令牌后自动恢复。如需让用户退出登录，请调用 <code>client.close()</code>。'),
                ],
                'playground': [
                    ('<strong>Reference files</strong> (<a href="https://github.com/Nuva-Lab/ads-sdk/issues/29">#29</a>): upload images, videos or audio in chat and in the Storyboard editor.',
                     '<strong>参考文件</strong>（<a href="https://github.com/Nuva-Lab/ads-sdk/issues/29">#29</a>）：可在对话和分镜编辑器中上传图片、视频或音频。'),
                    ('<code>NUVA_PLAYGROUND_BRIDGE_PORT</code> lets a playground on a remote machine work through a forwarded port.',
                     '<code>NUVA_PLAYGROUND_BRIDGE_PORT</code> 可让远程机器上的 Playground 通过转发端口使用。'),
                ],
            }),
        Release(
            '0.1.0-preview.5', '2026-11-08',
            ('Scripts, Storyboards and Prompts come only from the writers and never change; Brands, Products and Characters change in place; ownership and sharing.',
             '脚本、分镜和提示词只由编写服务生成且不可修改；品牌、产品和人物原地修改；新增归属与共享。'),
            ('Needs the services released with it. Sends <code>Nuva-Api-Version: 2026-11-07</code>.',
             '需要随其发布的服务。发送 <code>Nuva-Api-Version: 2026-11-07</code>。'),
            (f'Breaking: follow {preview5_guide[0]}, which has before-and-after code and also covers preview.3.',
             f'包含不兼容变更：请按{preview5_guide[1]}操作，其中有修改前后的代码，也涵盖从 preview.3 升级。'),
            {
                'breaking': [
                    ('Each method returns a new Script, Storyboard or Prompt: <code>generate</code>, <code>generateFrom</code> and <code>createFrom</code>. <code>scripts.create</code>, <code>prompts.create</code> and the <code>artifacts</code> client are removed.',
                     '每个方法都返回新的脚本、分镜或提示词：<code>generate</code>、<code>generateFrom</code> 和 <code>createFrom</code>。<code>scripts.create</code>、<code>prompts.create</code> 和 <code>artifacts</code> 客户端已移除。'),
                    ('<code>update(record, changes)</code> for Brands, Products and Characters, with only the changed fields. Product media are <code>image_asset_ids</code> and <code>video_asset_ids</code>; <code>uploadImage</code> is removed.',
                     '品牌、产品和人物使用 <code>update(record, changes)</code>，只传修改的字段。产品媒体字段改为 <code>image_asset_ids</code> 和 <code>video_asset_ids</code>；<code>uploadImage</code> 已移除。'),
                    ('A Prompt must name every attached file as <code>&lt;Picture N&gt;</code>, <code>&lt;Video N&gt;</code> or <code>&lt;Audio N&gt;</code>; otherwise <code>422 INVALID_PROMPT</code>.',
                     '提示词必须用 <code>&lt;Picture N&gt;</code>、<code>&lt;Video N&gt;</code> 或 <code>&lt;Audio N&gt;</code> 提到每个附带文件，否则返回 <code>422 INVALID_PROMPT</code>。'),
                    ('Errors are <code>AdsError</code> with <code>retryable</code>; the backend codes are <code>UNAUTHENTICATED</code> and <code>INVALID_INPUT</code>. Lists return <code>Page&lt;T&gt;</code>; references are <code>{id, version?}</code>.',
                     '错误改为带 <code>retryable</code> 的 <code>AdsError</code>；后端错误码改为 <code>UNAUTHENTICATED</code> 和 <code>INVALID_INPUT</code>。列表返回 <code>Page&lt;T&gt;</code>；引用为 <code>{id, version?}</code>。'),
                ],
                'added': [
                    ('<strong>Who sees what.</strong> New Brands, Products and Characters belong to their creator; admins share items with <code>shares.set</code> and the Go Admin SDK\'s scope, membership and share methods.',
                     '<strong>归属与共享。</strong>新建的品牌、产品和人物归创建者所有；管理员可用 <code>shares.set</code> 以及 Go Admin SDK 的范围、成员和共享方法共享内容。'),
                    ('Product videos, Brand and Product descriptions, <code>products.delete</code>, <code>jobs.cancel</code>, and file tokens (<code>{{asset:&lt;id&gt;}}</code>) in shots.',
                     '产品视频、品牌和产品描述、<code>products.delete</code>、<code>jobs.cancel</code>，以及镜头中的文件标记（<code>{{asset:&lt;id&gt;}}</code>）。'),
                    ('Steering: <code>agent.send</code> no longer gets <code>AGENT_BUSY</code> while the Agent works.',
                     '插话：Agent 工作时 <code>agent.send</code> 不再返回 <code>AGENT_BUSY</code>。'),
                ],
            }),
        Release(
            '0.1.0-preview.4', '2026-11-03',
            ('Storyboards: generation is Script → Storyboard → Prompts → video.', '新增分镜：生成流程为脚本 → 分镜 → 提示词 → 视频。'),
            ('Needs the services released with it.', '需要随其发布的服务。'),
            (f'From preview.3, follow the preview.3 part of {preview5_guide[0]}, then upgrade to the latest.',
             f'从 preview.3 升级，请按{preview5_guide[1]}中从 preview.3 升级的部分操作，再升级到最新版本。'),
            {
                'breaking': [
                    ('<code>prompts.generate</code> takes a Storyboard, not a Script; Scripts are version 3 (read by <code>format</code>).',
                     '<code>prompts.generate</code> 接收分镜而不是脚本；脚本升级到第 3 版（按 <code>format</code> 读取）。'),
                ],
                'added': [
                    ('<code>storyboards.generate</code> casts Characters and writes 5–15 s clips; a cast Character stays the same across clips.',
                     '<code>storyboards.generate</code> 为角色选择人物并写出 5–15 秒的片段；被选角的人物在各片段中保持一致。'),
                    ('Asset <code>label</code> and <code>description</code>; Session <code>waiting</code> while renders run.',
                     'Asset 的 <code>label</code> 和 <code>description</code>；渲染期间 Session 带有 <code>waiting</code>。'),
                ],
            }),
    ]


def changelog_versions():
    """CHANGELOG.md's version headings, in order."""
    return re.findall(r'^## (\S+)\s*$', CHANGELOG.read_text(), re.M)


def release_sections(locale='zh'):
    t = lambda pair: pair[1] if locale == 'zh' else pair[0]
    tr = lambda en, zh: zh if locale == 'zh' else en
    entries = releases(locale)
    latest = next(release for release in entries if release.date)
    lead = (
        '<p>' + tr('What changed in each version of the Client SDK and the Go Admin SDK, newest first. Each entry says what it needs and how to upgrade, with a link to the <a href="' + filename('migration', locale) + '">upgrade guide</a> when there is something to change. The full notes are in the <a href="' + FULL_CHANGELOG + '">CHANGELOG</a>.',
                   '按版本列出 Client SDK 和 Go Admin SDK 的变化，最新的在前。每个版本都说明所需条件和升级方法；需要修改代码时会链接到<a href="' + filename('migration', locale) + '">升级指南</a>。完整说明见 <a href="' + FULL_CHANGELOG + '">CHANGELOG</a>。') + '</p>'
        + '<p>' + tr(f'Latest release: <code>{latest.version}</code>.', f'最新版本：<code>{latest.version}</code>。') + '</p>'
        + code(f'pnpm add /path/to/nuva-sdk-{latest.version}.tgz\ngo get github.com/Nuva-Lab/ads-sdk/go@v{latest.version}', 'sh', locale)
    )
    sections = [('', '', lead)]
    for release in entries:
        title = tr('Next release (unreleased)', '下一版本（未发布）') if release.date is None else f'{release.version} · {release.date}'
        facts = ''.join(f'<dt>{label}</dt><dd>{value}</dd>' for label, value in (
            (tr('Needs', '要求'), t(release.needs)),
            (tr('Upgrade', '升级'), t(release.upgrade)),
        ))
        body = '<p>' + t(release.summary) + '</p><dl class="release-facts">' + facts + '</dl>'
        for group, heading in GROUPS.items():
            items = release.changes.get(group)
            if items:
                body += '<h3>' + t(heading) + '</h3><ul>' + ''.join('<li>' + t(item) + '</li>' for item in items) + '</ul>'
        sections.append((release.key, title, body))
    return sections
