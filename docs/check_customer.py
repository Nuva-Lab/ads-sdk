"""Check generated guide navigation, bilingual parity, and visible code samples."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
from zipfile import ZipFile

from build_customer import CUSTOMER_FILES, DEST
from customer_layout import DOCUMENTS, filename


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.sections = []
        self.samples = []
        self.details = 0
        self.pre = False
        self.in_code = False
        self.lang = None
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f'Duplicate ID: {attrs["id"]}'
            self.ids.add(attrs['id'])
        if tag == 'html':
            self.lang = attrs.get('lang')
        if tag == 'section':
            self.sections.append(attrs['id'])
        if tag == 'details':
            self.details += 1
        if tag == 'pre':
            assert not self.details, 'Code sample is hidden in a disclosure'
            self.pre = True
        if tag == 'code' and self.pre:
            self.in_code = True
            self.samples.append('')
        for attribute in ('href', 'src'):
            if attribute in attrs:
                self.links.append(attrs[attribute])

    def handle_endtag(self, tag):
        if tag == 'details':
            self.details -= 1
        if tag == 'pre':
            self.pre = False
        if tag == 'code':
            self.in_code = False

    def handle_data(self, value):
        if self.in_code:
            self.samples[-1] += value


def main():
    docs = {name: Document((DEST / name).read_text()) for name in CUSTOMER_FILES if name.endswith('.html')}
    for name, doc in docs.items():
        for target in doc.links:
            url = urlsplit(target)
            if url.scheme or url.netloc:
                continue
            path = unquote(url.path) or name
            assert (DEST / path).is_file(), f'{name}: missing {path}'
            if url.fragment and path in docs:
                assert unquote(url.fragment) in docs[path].ids, f'{name}: missing anchor {target}'
    for page_id, _, _ in DOCUMENTS:
        zh, en = docs[filename(page_id, 'zh')], docs[filename(page_id, 'en')]
        assert zh.lang == 'zh-CN' and en.lang == 'en'
        assert zh.sections == en.sections, f'{page_id}: translated sections differ'
        assert zh.samples == en.samples, f'{page_id}: code differs by language'
        assert zh.samples, f'{page_id}: no code samples'
    assert docs['frontend.html'].sections[0] == 'install'
    assert docs['frontend.html'].samples[0].startswith('pnpm add ')
    with ZipFile(DEST.parent / 'customer-sdk-docs.zip') as archive:
        assert set(archive.namelist()) == set(CUSTOMER_FILES)
        for name in CUSTOMER_FILES:
            assert archive.read(name) == (DEST / name).read_bytes(), f'Stale archived file: {name}'
    print(f'Checked {len(docs)} pages: links, language parity, expanded samples and exact archive contents.')


if __name__ == '__main__':
    main()
