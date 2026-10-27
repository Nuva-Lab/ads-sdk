"""Build English and Chinese customer guides and their offline archive."""
import json
import shutil
import zipfile
from build import ROOT
from customer_layout import DOCUMENTS, filename, page
from go_reference import go_sections
from client_reference import guide_pages, message_example

DEST = ROOT / 'customer'
EXAMPLES = ('guide.tsx', 'guide_backend.go', 'creation-chain.ts', 'backend_client.go', 'react-usage.tsx', 'store-usage.ts')
CUSTOMER_FILES = (
    'index.html',
    *(filename(key, locale) for key, _, _ in DOCUMENTS for locale in ('zh', 'en')),
    'style.css', 'docs.js', 'README.txt', 'examples/messages.json',
    *(f'examples/{name}' for name in EXAMPLES),
)


def build_customer():
    (DEST / 'examples').mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / 'customer-theme.css', DEST / 'style.css')
    shutil.copyfile(ROOT / 'customer-docs.js', DEST / 'docs.js')
    for name in EXAMPLES:
        shutil.copyfile(ROOT / 'examples' / name, DEST / 'examples' / name)
    (DEST / 'examples/messages.json').write_text(json.dumps(message_example(), ensure_ascii=False, indent=2) + '\n')
    for locale in ('zh', 'en'):
        guides = guide_pages(locale)
        guides['backend-go'] = go_sections(locale)
        for key, _, _ in DOCUMENTS:
            (DEST / filename(key, locale)).write_text(page(key, guides[key], locale))
    shutil.copyfile(DEST / 'frontend.html', DEST / 'index.html')
    (DEST / 'README.txt').write_text(
        'Ads SDK 0.1.0-preview.2\n\n'
        'Open index.html or frontend.html to start. Use the header language selector for English.\n'
        '从 index.html 或 frontend.html 开始，使用页首语言选项切换中文和英文。\n\n'
        'Getting started; Agent conversations; resources; generation; backend setup; methods and errors.\n'
        '开始使用；Agent 对话；资源；内容生成；后端接入；方法与错误。\n'
        'examples/ contains the complete source used in the guides.\n'
    )
    with zipfile.ZipFile(ROOT / 'customer-sdk-docs.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in CUSTOMER_FILES:
            archive.write(DEST / name, name)
    print(f'Built {len(DOCUMENTS)} guides in Chinese and English; {len(CUSTOMER_FILES)} archive files.')


if __name__ == '__main__':
    build_customer()
