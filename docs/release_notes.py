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
    next_guide, preview6_guide, preview5_guide = a('next', 'Upgrade to the next release', '升级到下一版本'), a('preview6', 'Upgrade to preview.6', '升级到 preview.6'), a('overview', 'Upgrade to preview.5', '升级到 preview.5')
    return [
        Release(
            'Unreleased', None,
            ('Delete users, let the Agent read PDFs, and archive Skills and Sessions.',
             '删除用户、让 Agent 阅读 PDF，以及归档 Skill 和 Session。'),
            ('The services live now: user deletion and PDF Assets since 2026-11-20, Skill archiving since 2026-11-13. Session archiving needs the Agent release with it. The API version stays <code>2026-11-07</code>.',
             '现已上线的服务即可：用户删除和 PDF Asset 自 2026-11-20 起可用，Skill 归档自 2026-11-13 起可用。Session 归档需要随其发布的 Agent 版本。API 版本仍为 <code>2026-11-07</code>。'),
            (f'Most integrations need no change. Check the four points in {next_guide[0]}.',
             f'大多数集成无需修改。请检查{next_guide[1]}中的四点。'),
            {
                'added': [
                    ('<strong>Delete a user</strong> (Go Admin SDK). <code>DeleteUser(ctx, externalUserID)</code> stops someone who left: the API refuses their tokens at once, and a new token or memberships for the ID return <code>409 USER_DELETED</code>. Nothing they made is deleted; it stays theirs, with its shares, for their admins and colleagues.',
                     '<strong>删除用户</strong>（Go Admin SDK）。<code>DeleteUser(ctx, externalUserID)</code> 可停用已离开的人：API 立即拒绝其令牌，再为该 ID 申请令牌或设置成员关系会返回 <code>409 USER_DELETED</code>。其创建的内容不会删除，仍归其所有、共享照旧，管理员和同事可继续使用。'),
                    ('<strong>PDFs for the Agent to read.</strong> <code>assets.upload(file, {kind: \'document\'})</code> uploads a PDF of up to 50 MB; attach it to a message and the Agent reads its text and pages. A document is never a generation input.',
                     '<strong>供 Agent 阅读的 PDF。</strong><code>assets.upload(file, {kind: \'document\'})</code> 可上传最大 50 MB 的 PDF；附在消息中，Agent 会阅读其文字和页面。文档不会用作生成素材。'),
                    ('<strong>Archive Skills.</strong> <code>ArchiveSkill</code> takes a Skill out of lists and the Agent\'s new Sessions without deleting anything; <code>UnarchiveSkill</code> brings it back.',
                     '<strong>归档 Skill。</strong><code>ArchiveSkill</code> 让 Skill 不再出现在列表和 Agent 新建的 Session 中，不删除任何内容；<code>UnarchiveSkill</code> 可将其恢复。'),
                    ('<strong>Archive Sessions</strong> (<a href="https://github.com/Nuva-Lab/ads-sdk/issues/35">#35</a>). <code>sessions.archive(id)</code> takes a test conversation out of <code>sessions.list</code>; its messages and work stay, and it can still be opened.',
                     '<strong>归档 Session</strong>（<a href="https://github.com/Nuva-Lab/ads-sdk/issues/35">#35</a>）。<code>sessions.archive(id)</code> 可让测试对话不再出现在 <code>sessions.list</code> 中；消息和内容都会保留，仍可打开。'),
                ],
                'changed': [
                    ('<strong>Script fact IDs</strong> are the ones the service supplies: <code>fact_product_tags</code> and <code>fact_product_video_requirements</code> are gone. A Script that cites a fact it doesn\'t have is refused with the bad ID.',
                     '<strong>脚本的事实 ID</strong> 只保留服务提供的那些：<code>fact_product_tags</code> 和 <code>fact_product_video_requirements</code> 已移除。引用不存在的事实的脚本会被拒绝，并指出错误的 ID。'),
                ],
                'fixed': [
                    ('<strong>Skills you register are used in Agent conversations</strong> (<a href="https://github.com/Nuva-Lab/ads-sdk/issues/36">#36</a>). A Skill with a main version reaches the Agent\'s new Sessions without asking Nuva. A service change, live since 2026-11-13.',
                     '<strong>你注册的 Skill 会用于 Agent 对话</strong>（<a href="https://github.com/Nuva-Lab/ads-sdk/issues/36">#36</a>）。有主版本的 Skill 会进入 Agent 新建的 Session，无需请 Nuva 开启。这是服务端变化，自 2026-11-13 起生效。'),
                ],
                'playground': [
                    ('A Prompt opens to its text again, and a clip opens its Prompt.', '提示词重新显示其文字，片段可打开其提示词。'),
                    ('A playing video keeps playing when new work arrives.', '新内容到来时，正在播放的视频不会中断。'),
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
