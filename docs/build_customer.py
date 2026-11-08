"""Build English and Chinese customer guides, the API reference with its Markdown twins and llms.txt, and the offline archive."""
import json
import re
import shutil
import zipfile
from build import ROOT
from customer_layout import DOCUMENTS, REFERENCE, filename, md_filename, page
from go_reference import go_sections
from client_reference import guide_pages, message_example
from migration_guide import migration_sections
from api_reference import INTRO, PAGES, reference_pages, validate as validate_reference
from reference_markdown import llms_txt, markdown_page

DEST = ROOT / 'customer'
EXAMPLES = ('guide.tsx', 'guide_backend.go', 'creation-chain.ts', 'backend_client.go', 'react-usage.tsx', 'store-usage.ts')
CUSTOMER_FILES = (
    'index.html',
    *(filename(key, locale) for key, _, _ in DOCUMENTS for locale in ('zh', 'en')),
    *(md_filename(key, locale) for key in REFERENCE for locale in ('zh', 'en')),
    'llms.txt', 'style.css', 'docs.js', 'README.txt', 'examples/messages.json',
    *(f'examples/{name}' for name in EXAMPLES),
)
TITLES = {key: {'en': en, 'zh': zh} for key, en, zh in DOCUMENTS}
# One line per guide in llms.txt.
GUIDES = {
    'frontend': 'Install the SDK, provide user tokens and create the client.',
    'agent': 'Open a Session with the Ads Agent, send messages, show its replies and have it assemble an Ad.',
    'store': 'Create Brands, Products and Characters, add their images and videos, read Ads and Batches.',
    'generation': 'Write a Script, shoot it as a Storyboard, compile Prompts and render clips, step by step; edit content yourself.',
    'backend-go': 'Issue user tokens, organize users and share, and register Skills from your backend with the Go Admin SDK.',
    'migration': 'What changes when you upgrade to preview.5.',
}


def generated():
    """Every generated text file, by name: the HTML pages, the reference's Markdown twins and llms.txt."""
    files = {}
    blurbs = {INTRO: {'en': 'Create the client; the API version; errors; idempotency keys and request IDs; lists; versions.',
                      'zh': '创建客户端；API 版本；错误；幂等 key 与请求 ID；列表；版本。'}}
    for reference in PAGES:
        blurbs[reference.key] = {'en': reference.blurb.html('en'), 'zh': reference.blurb.html('zh')}
    for locale in ('zh', 'en'):
        guides = guide_pages(locale)
        guides['backend-go'] = go_sections(locale)
        guides['migration'] = migration_sections(locale)
        guides.update(reference_pages(locale))
        for key, _, _ in DOCUMENTS:
            files[filename(key, locale)] = page(key, guides[key], locale)
        for key in REFERENCE:
            files[md_filename(key, locale)] = markdown_page(key, TITLES[key][locale], guides[key], locale)
    intro = {'en': 'Introduction', 'zh': '简介'}
    files['llms.txt'] = llms_txt(lambda locale: [(key, intro[locale] if key == INTRO else TITLES[key][locale]) for key in REFERENCE], plain(blurbs),
                                 [(key, TITLES[key]['en'], text) for key, text in GUIDES.items()])
    return files


def plain(blurbs):
    """Blurbs as Markdown: `<code>x</code>` becomes `x` in backticks."""
    return {key: {locale: re.sub(r'<code>(.*?)</code>', r'`\1`', text) for locale, text in value.items()} for key, value in blurbs.items()}


def build_customer():
    # The reference is generated from the contract; any undocumented public field or method, or a failing example, stops the build.
    validate_reference()
    (DEST / 'examples').mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / 'customer-theme.css', DEST / 'style.css')
    shutil.copyfile(ROOT / 'customer-docs.js', DEST / 'docs.js')
    for name in EXAMPLES:
        shutil.copyfile(ROOT / 'examples' / name, DEST / 'examples' / name)
    (DEST / 'examples/messages.json').write_text(json.dumps(message_example(), ensure_ascii=False, indent=2) + '\n')
    for name, text in generated().items():
        (DEST / name).write_text(text)
    shutil.copyfile(DEST / 'frontend.html', DEST / 'index.html')
    (DEST / 'README.txt').write_text(
        'Ads SDK 0.1.0-preview.5\n\n'
        'Open index.html or frontend.html to start. Use the header language selector for English.\n'
        '从 index.html 或 frontend.html 开始，使用页首语言选项切换中文和英文。\n\n'
        'Getting started; Agent conversations; products and media; content generation; backend setup; API reference, one page per resource; upgrading to preview.5.\n'
        '开始使用；Agent 对话；产品与媒体；内容生成；后端接入；接口参考（每种资源一页）；升级到 preview.5。\n'
        'Each API reference page has a Markdown twin (.md, .en.md); llms.txt lists them.\n'
        '每个接口参考页面都有 Markdown 版本（.md、.en.md），llms.txt 列出全部页面。\n'
        'examples/ contains the complete source used in the guides.\n'
    )
    with zipfile.ZipFile(ROOT / 'customer-sdk-docs.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in CUSTOMER_FILES:
            archive.write(DEST / name, name)
    print(f'Built {len(DOCUMENTS)} pages in Chinese and English, {len(REFERENCE) * 2} Markdown twins and llms.txt; {len(CUSTOMER_FILES)} archive files.')


if __name__ == '__main__':
    build_customer()
