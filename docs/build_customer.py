"""Build the local customer reference and its allowlisted source bundle."""
import json
import shutil
import zipfile

from build import ROOT, table
from customer_layout import code, page
from go_reference import go_sections
from client_reference import agent_sections, store_sections, message_example

DEST = ROOT / 'customer'
CUSTOMER_FILES = (
    'frontend.html', 'store.html', 'backend-go.html', 'style.css', 'docs.js', 'README.txt',
    'examples/messages.json', 'examples/backend_client.go',
    'examples/react-usage.tsx', 'examples/store-usage.ts', 'examples/creation-chain.ts',
)


def build_customer():
    (DEST / 'examples').mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / 'customer-theme.css', DEST / 'style.css')
    shutil.copyfile(ROOT / 'customer-docs.js', DEST / 'docs.js')
    for name in ('backend_client.go', 'react-usage.tsx', 'store-usage.ts', 'creation-chain.ts'):
        shutil.copyfile(ROOT / 'examples' / name, DEST / 'examples' / name)
    (DEST / 'examples/messages.json').write_text(json.dumps(message_example(), ensure_ascii=False, indent=2) + '\n')
    (DEST / 'frontend.html').write_text(page('frontend.html', agent_sections()))
    (DEST / 'store.html').write_text(page('store.html', store_sections()))
    (DEST / 'backend-go.html').write_text(page('backend-go.html', go_sections(code, table)))
    (DEST / 'README.txt').write_text(
        'Ads SDK 0.1.0-preview.3 — API/wire v1\nLocal preview reference. Packages and hosted Agent services are not yet published/deployed.\n\n'
        'frontend.html: Client Agent SDK reference with React / TypeScript examples\n'
        'store.html: Client Store SDK reference with plain TypeScript examples\n'
        'backend-go.html: Go Admin SDK reference\n'
        'examples/: Agent React examples, Store TypeScript examples, a message example, a complete creation example, and the Go Admin integration\n'
    )
    with zipfile.ZipFile(ROOT / 'customer-sdk-docs.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in CUSTOMER_FILES:
            archive.write(DEST / name, name)
    print(f'Built customer references: {len(CUSTOMER_FILES)} files. No deployment performed.')


if __name__ == '__main__':
    build_customer()
