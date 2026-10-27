"""Presentation-only renderer for the customer SDK documentation."""
from html import escape
import re

COPY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>'
SEARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>'
THEME_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/></svg>'
MENU_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
LINK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0)"/></svg>'

TOKENS = re.compile(
    r'(?P<comment>//[^\n]*|/\*[\s\S]*?\*/)'
    r'|(?P<string>"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`)'
    r'|(?P<keyword>\b(?:import|from|export|const|let|var|async|await|return|throw|new|if|else|function|type|interface|readonly|declare|class|extends|typeof|in|nil|func|struct|package|range|defer|switch|case|default|true|false|null|undefined)\b)'
    r'|(?P<number>\b\d+(?:\.\d+)?\b)'
)


def highlight(source):
    """Add display spans while preserving every character of the code."""
    rendered = []
    cursor = 0
    for match in TOKENS.finditer(source):
        rendered.append(escape(source[cursor:match.start()]))
        rendered.append(f'<span class="token-{match.lastgroup}">{escape(match.group())}</span>')
        cursor = match.end()
    rendered.append(escape(source[cursor:]))
    return "".join(rendered)


def code(text, language="ts", locale="en", filename=None):
    label = {"ts": "TypeScript", "tsx": "TypeScript", "go": "Go", "json": "JSON", "http": "HTTP", "sh": "Shell"}.get(language, language)
    # Highlight complete tokens first, including multiline comments and strings.
    source = text.strip()
    label = filename or label
    copy_label = "复制" if locale == "zh" else "Copy"
    copy_aria = "复制代码" if locale == "zh" else "Copy code"
    decorated = highlight(source)
    lines = "\n".join(f'<span aria-hidden="true">{n}</span>' for n in range(1, source.count("\n") + 2))
    return (
        '<div class="code-block">'
        f'<div class="code-toolbar"><span>{escape(label)}</span>'
        f'<button type="button" class="copy-button" data-copy-code aria-label="{copy_aria}">{COPY_ICON}<span>{copy_label}</span></button></div>'
        f'<div class="code-body"><div class="line-numbers" aria-hidden="true">{lines}</div>'
        f'<pre tabindex="0"><code class="language-{escape(language)}">{decorated}</code></pre></div></div>'
    )


DOCUMENTS = (
    ('frontend', 'Get started', '开始使用'),
    ('agent', 'Agent conversations', 'Agent 对话'),
    ('store', 'Manage resources', '管理资源'),
    ('generation', 'Generate content', '生成内容'),
    ('backend-go', 'Backend setup', '后端接入'),
    ('reference', 'Methods and errors', '方法与错误'),
)


def filename(page_id, locale):
    return page_id + ('.en.html' if locale == 'en' else '.html')


def page(page_id, sections, locale='zh'):
    tr = lambda en, zh: zh if locale == 'zh' else en
    position = next(i for i, doc in enumerate(DOCUMENTS) if doc[0] == page_id)
    title = DOCUMENTS[position][2 if locale == 'zh' else 1]
    nav = ''.join(
        f'<a class="document-link{" current" if key == page_id else ""}" href="{filename(key, locale)}"'
        + (' aria-current="page"' if key == page_id else '')
        + f'>{escape(tr(en, zh))}</a>' for key, en, zh in DOCUMENTS
    )
    toc = ''.join(f'<a href="#{escape(key)}">{escape(name)}</a>' for key, name, _ in sections)
    body = ''.join(
        f'<section id="{escape(key)}"><h2>{escape(name)}'
        f'<a class="heading-link" href="#{escape(key)}" aria-label="{tr("Link to", "链接到")} {escape(name)}">{LINK_ICON}</a></h2>{content}</section>'
        for key, name, content in sections
    )
    peers = []
    for index, label in ((position - 1, tr('Previous', '上一页')), (position + 1, tr('Next', '下一页'))):
        if 0 <= index < len(DOCUMENTS):
            key, en, zh = DOCUMENTS[index]
            peers.append(f'<a href="{filename(key, locale)}"><small>{label}</small>{escape(tr(en, zh))}</a>')
    language_options = ''.join(
        f'<option value="{filename(page_id, lang)}"{" selected" if locale == lang else ""}>{label}</option>'
        for lang, label in (('zh', '中文'), ('en', 'English'))
    )
    return f'''<!doctype html>
<html lang="{tr('en', 'zh-CN')}" data-theme="light" data-locale="{locale}" data-page="{page_id}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{escape(title)} | Ads SDK</title>
<link rel="stylesheet" href="style.css">
<link rel="alternate" hreflang="en" href="{filename(page_id, 'en')}">
<link rel="alternate" hreflang="zh-CN" href="{filename(page_id, 'zh')}">
<script src="docs.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main-content">{tr('Skip to content', '跳到正文')}</a>
<header class="site-header"><div class="header-inner">
  <button type="button" class="icon-button menu-toggle" aria-label="{tr('Open navigation', '打开导航')}" aria-controls="docs-sidebar" aria-expanded="false">{MENU_ICON}</button>
  <a class="brand" href="{filename('frontend', locale)}">Ads SDK</a>
  <span class="header-version">0.1.0-preview.1</span>
  <div class="header-actions">
    <button type="button" class="search-trigger" data-search-open aria-label="{tr('Search this page', '搜索当前页')}">{SEARCH_ICON}<span>{tr('Search', '搜索')}</span><kbd>⌘ K</kbd></button>
    <select class="language-toggle" aria-label="{tr('Language', '语言')}" data-language>{language_options}</select>
    <button type="button" class="icon-button" data-theme-toggle aria-label="{tr('Switch to dark mode', '切换深色模式')}" title="{tr('Switch to dark mode', '切换深色模式')}">{THEME_ICON}</button>
  </div>
</div></header>
<div class="docs-layout">
  <aside class="docs-sidebar" id="docs-sidebar" aria-label="{tr('Documentation navigation', '文档导航')}">
    <div class="nav-group"><p class="nav-heading">{tr('Documentation', '文档')}</p><nav>{nav}</nav></div>
  </aside>
  <main id="main-content" tabindex="-1">
    <div class="page-heading"><h1>{escape(title)}</h1></div>
    <div class="mobile-toc"><details><summary>{tr('On this page', '本页内容')}</summary><nav>{toc}</nav></details></div>
    <article>{body}</article>
    <nav class="page-footer" aria-label="{tr('Continue reading', '继续阅读')}">{''.join(peers)}</nav>
  </main>
  <aside class="page-toc" aria-label="{tr('On this page', '本页内容')}">
    <p class="nav-heading">{tr('On this page', '本页内容')}</p><nav>{toc}</nav>
    <button type="button" class="page-copy" data-copy-page>{COPY_ICON}<span>{tr('Copy page', '复制页面')}</span></button>
  </aside>
</div>
<dialog class="search-dialog" aria-labelledby="search-title">
  <form method="dialog" class="search-top"><h2 id="search-title">{tr('Search this page', '搜索当前页')}</h2><button class="dismiss-search" aria-label="{tr('Close search', '关闭搜索')}">Esc</button></form>
  <input type="search" class="search-input" placeholder="{tr('Search methods, fields or sections', '搜索方法、字段或章节')}" aria-label="{tr('Search methods, fields or sections', '搜索方法、字段或章节')}" autocomplete="off">
  <p class="search-count" aria-live="polite"></p><nav class="search-results" aria-label="{tr('Search results', '搜索结果')}"></nav>
</dialog>
<div class="sr-only" aria-live="polite" data-announcement></div>
</body></html>
'''
