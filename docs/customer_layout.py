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


def code(text, language="ts"):
    label = {"ts": "TypeScript", "tsx": "React / TypeScript", "go": "Go", "json": "JSON", "http": "HTTP"}.get(language, language)
    # Highlight complete tokens first, including multiline comments and strings.
    source = text.strip()
    decorated = highlight(source)
    lines = "\n".join(f'<span aria-hidden="true">{n}</span>' for n in range(1, source.count("\n") + 2))
    return (
        '<div class="code-block">'
        f'<div class="code-toolbar"><span>{escape(label)}</span>'
        f'<button type="button" class="copy-button" data-copy-code aria-label="Copy code">{COPY_ICON}<span>Copy</span></button></div>'
        f'<div class="code-body"><div class="line-numbers" aria-hidden="true">{lines}</div>'
        f'<pre tabindex="0"><code class="language-{escape(language)}">{decorated}</code></pre></div></div>'
    )


DOCUMENTS = (
    ("frontend.html", "Client Agent SDK", "TypeScript"),
    ("store.html", "Client Store SDK", "TypeScript"),
    ("backend-go.html", "Go Admin SDK", "Go"),
)


def page(current_file, sections):
    current_index = next(i for i, doc in enumerate(DOCUMENTS) if doc[0] == current_file)
    _, title, _ = DOCUMENTS[current_index]
    peer, peer_title, _ = DOCUMENTS[(current_index + 1) % len(DOCUMENTS)]
    nav = "".join(
        f'<a class="document-link{" current" if filename == current_file else ""}" href="{filename}"'
        + (' aria-current="page"' if filename == current_file else '')
        + f'>{escape(name)}<small>{escape(stack)}</small></a>'
        for filename, name, stack in DOCUMENTS
    )
    toc = "".join(f'<a href="#{escape(key)}">{escape(name)}</a>' for key, name, _ in sections)
    body = "".join(
        f'<section id="{escape(key)}"><h2>{escape(name)}'
        f'<a class="heading-link" href="#{escape(key)}" aria-label="Link to {escape(name)}">{LINK_ICON}</a></h2>{content}</section>'
        for key, name, content in sections
    )
    return f'''<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{escape(title)} | Ads SDK</title>
<link rel="stylesheet" href="style.css">
<script src="docs.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header">
  <div class="header-inner">
    <button type="button" class="icon-button menu-toggle" aria-label="Open navigation" aria-controls="docs-sidebar" aria-expanded="false">{MENU_ICON}</button>
    <a class="brand" href="frontend.html">Ads SDK</a>
    <div class="header-actions">
      <button type="button" class="search-trigger" data-search-open aria-label="Search this document">{SEARCH_ICON}<span>Search this document</span><kbd>⌘ K</kbd></button>
      <button type="button" class="icon-button" data-theme-toggle aria-label="Switch to dark mode" title="Switch to dark mode">{THEME_ICON}</button>
    </div>
  </div>
</header>
<div class="docs-layout">
  <aside class="docs-sidebar" id="docs-sidebar" aria-label="SDK documentation navigation">
    <div class="nav-group">
      <p class="nav-heading">SDK documentation</p>
      <nav>{nav}</nav>
    </div>
  </aside>
  <main id="main-content" tabindex="-1">
    <div class="page-heading"><h1>{escape(title)}</h1><span class="preview-label">Preview</span></div>
    <p class="development-notice">SDK 0.1.0-preview.4 · Public API / wire v1. Local preview; registry publication and hosted Agent services are pending.</p>
    <div class="mobile-toc"><details><summary>On this page</summary><nav>{toc}</nav></details></div>
    <article>{body}</article>
    <nav class="page-footer" aria-label="Other SDK documentation"><a href="{escape(peer)}">{escape(peer_title)} <span aria-hidden="true">→</span></a></nav>
  </main>
  <aside class="page-toc" aria-label="On this page">
    <p class="nav-heading">On this page</p>
    <nav>{toc}</nav>
    <button type="button" class="page-copy" data-copy-page>{COPY_ICON}<span>Copy page</span></button>
  </aside>
</div>
<dialog class="search-dialog" aria-labelledby="search-title">
  <form method="dialog" class="search-top"><h2 id="search-title">Search this document</h2><button class="dismiss-search" aria-label="Close search">Esc</button></form>
  <input type="search" class="search-input" placeholder="Search methods, fields or sections" aria-label="Search methods, fields or sections" autocomplete="off">
  <p class="search-count" aria-live="polite"></p>
  <nav class="search-results" aria-label="Search results"></nav>
</dialog>
<div class="sr-only" aria-live="polite" data-announcement></div>
</body>
</html>
'''
