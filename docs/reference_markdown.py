"""The Markdown twin of a reference page and llms.txt, written from the same sections as the HTML page.

The converter knows only the markup the reference pages use (paragraphs, field lists, signatures, code blocks, tables,
headings, disclosures); an element it does not know stops the build. Links to reference pages point at their Markdown
twins, and each heading keeps its HTML id as `<a id="…"></a>`, so `#anchors` work in both.
"""
from html.parser import HTMLParser
import re

from customer_layout import DOCUMENTS, REFERENCE, filename, md_filename

LABELS = {'TypeScript', 'JSON', 'Go', 'Shell', 'HTTP'}
VOID = {'br'}


class Node:
    def __init__(self, tag, attrs):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def cls(self):
        return set((self.attrs.get('class') or '').split())

    def text(self):
        return ''.join(child if isinstance(child, str) else child.text() for child in self.children)


class Tree(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node('root', ())
        self.stack = [self.root]
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack[-1].tag != tag:
            self.stack.pop()
        self.stack.pop()

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def link_target(href, locale):
    """A reference page's link points at its Markdown twin; anything else stays as it is."""
    path, _, anchor = href.partition('#')
    for page_id in REFERENCE:
        if path in (filename(page_id, 'zh'), filename(page_id, 'en')):
            path = md_filename(page_id, 'en' if path.endswith('.en.html') else 'zh')
    return path + ('#' + anchor if anchor else '')


def inline(node, locale):
    if isinstance(node, str):
        return re.sub(r'\s+', ' ', node)
    inner = ''.join(inline(child, locale) for child in node.children)
    if node.tag == 'code':
        text = node.text()
        fence = '``' if '`' in text else '`'
        return f'{fence}{text}{fence}'
    if node.tag == 'a':
        href = node.attrs.get('href', '')
        return f'[{inner}]({link_target(href, locale)})' if href and 'heading-link' not in node.cls() else ''
    if node.tag == 'strong':
        return f'**{inner}**'
    if node.tag == 'br':
        return '  \n'
    if node.tag in ('span', 'small', 'summary', 'em'):
        return inner
    raise ValueError(f'Markdown: no inline form for <{node.tag}>')


def content(node, locale):
    """A block's text as Markdown: its children inline."""
    return ''.join(inline(child, locale) for child in node.children).strip()


def items(node):
    return [child for child in node.children if not isinstance(child, str)]


def list_md(node, locale, depth=0):
    lines = []
    for item in items(node):
        assert item.tag == 'li', item.tag
        texts, nested = [], []
        for child in item.children:
            if isinstance(child, str):
                if child.strip():
                    texts.append(inline(child, locale).strip())
            elif child.tag == 'ul':
                nested.append(child)
            elif child.tag == 'details':
                nested += [grand for grand in items(child) if grand.tag == 'ul']
            elif child.tag == 'p' and 'field-head' in child.cls():
                texts.append(' '.join(inline(part, locale).strip() for part in items(child)))
            elif child.tag == 'p' and 'field-meta' in child.cls():
                texts.append('(' + content(child, locale) + ')')
            elif child.tag == 'p':
                texts.append(content(child, locale))
            else:
                texts.append(inline(child, locale).strip())
        line, separator = (texts[0] if texts else ''), ' — '
        for text in texts[1:]:
            if not text:
                continue
            # Text that continues the head (`[Assets](…): Upload files`) joins it directly.
            line += text if text[0] in ':,.：，。' else separator + text
            separator = ' '
        lines.append('  ' * depth + '- ' + line.strip())
        for sub in nested:
            lines += list_md(sub, locale, depth + 1)
    return lines


def table_md(node, locale):
    rows = []
    for row in (element for element in walk(node) if element.tag == 'tr'):
        rows.append([content(cell, locale).replace('|', '\\|') for cell in items(row)])
    rows.insert(1, ['---'] * len(rows[0]))
    return '\n'.join('| ' + ' | '.join(cells) + ' |' for cells in rows)


def walk(node):
    for child in items(node):
        yield child
        yield from walk(child)


def code_md(node):
    toolbar = next(element for element in walk(node) if 'code-toolbar' in element.cls())
    label = items(toolbar)[0].text()
    code = next(element for element in walk(node) if element.tag == 'code')
    language = next(name[9:] for name in code.cls() if name.startswith('language-'))
    fence = f'```{language}\n{code.text()}\n```'
    return (f'{label}:\n\n' if label not in LABELS else '') + fence


def blocks(node, locale):
    out = []
    for child in node.children:
        if isinstance(child, str):
            if child.strip():
                out.append(inline(child, locale).strip())
            continue
        kind = child.cls()
        if child.tag in ('h3', 'h4'):
            anchor = f'<a id="{child.attrs["id"]}"></a>\n' if 'id' in child.attrs else ''
            out.append(anchor + '#' * int(child.tag[1]) + ' ' + content(child, locale))
        elif child.tag == 'p':
            out.append(content(child, locale))
        elif child.tag == 'ul':
            out.append('\n'.join(list_md(child, locale)))
        elif child.tag == 'div' and 'signature' in kind:
            out.append('```ts\n' + child.text().strip() + '\n```')
        elif child.tag == 'div' and 'code-block' in kind:
            out.append(code_md(child))
        elif child.tag == 'div' and 'table' in kind:
            out.append(table_md(child, locale))
        elif child.tag == 'details':
            out += blocks(child, locale)
        else:
            raise ValueError(f'Markdown: no block form for <{child.tag} class="{child.attrs.get("class", "")}">')
    return [block for block in out if block]


def markdown_page(page_id, title, sections, locale):
    parts = [f'# {title}']
    for key, name, html in sections:
        parts.append(f'<a id="{key}"></a>\n## {re.sub(r"<[^>]+>", "", name)}')
        parts += blocks(Tree(html).root, locale)
    return '\n\n'.join(parts) + '\n'


def llms_txt(pages, blurbs, guides):
    """llms.txt: the reference pages' Markdown twins with one line each, in English then Chinese, then the guides."""
    lines = ['# Ads SDK', '',
             '> The Nuva Ads SDK for TypeScript (0.1.0-preview.5), API version 2026-11-07: the Ads Agent, Brands, Products, Characters, Scripts, Storyboards, Prompts, video Jobs, Ads, Skills and shares. One Markdown page per resource.', '']
    for heading, locale in (('API reference', 'en'), ('API reference (中文)', 'zh')):
        lines.append(f'## {heading}')
        lines.append('')
        for page_id, title in pages(locale):
            lines.append(f'- [{title}]({md_filename(page_id, locale)}): {blurbs[page_id][locale]}')
        lines.append('')
    lines += ['## Guides', '']
    for page_id, title, text in guides:
        lines.append(f'- [{title}]({filename(page_id, "en")}): {text}')
    return '\n'.join(lines) + '\n'
