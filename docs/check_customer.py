"""Check generated guide navigation, bilingual parity, visible code samples, the API reference's coverage and its Markdown twins."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, unquote
from zipfile import ZipFile

import api_reference
from build_customer import CUSTOMER_FILES, DEST, generated
from customer_layout import DOCUMENTS, REFERENCE, filename, md_filename


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


def check_field_reference(docs):
    """The reference documents the whole public surface, from the public contract only, each method on its page."""
    found = api_reference.problems()
    assert not found, 'The API reference has gaps:\n- ' + '\n- '.join(found)
    public = set(api_reference.components())
    # The backend's internal contract, when the SDK is checked out inside WhatIf (agents/ads-agent/sdk).
    internal_file = api_reference.SDK.parents[2] / 'ads_backend' / 'openapi.internal.json'
    sdk_types = set(api_reference.contract()['clients'])  # SDK interfaces such as EntityRef, documented from stores.ts
    internal = set(json.loads(internal_file.read_text())['components']['schemas']) - public - sdk_types if internal_file.exists() else set()
    expected = {api_reference.INTRO: set(api_reference.INTRO_TYPES)}
    for page in api_reference.PAGES:
        expected[page.key] = {method.anchor for method in page.methods} | set(page.models)
    store = api_reference.contract()['clients']['StoreClients']
    methods = {f'{client}.{member["name"]}' for client, members in store.items() for member in members}
    assert methods == {method.path for method in api_reference.all_methods()}, 'StoreClients methods and reference pages differ'
    for key in REFERENCE:
        for locale in ('zh', 'en'):
            for name in (filename(key, locale), md_filename(key, locale)):
                text = (DEST / name).read_text()
                ids = docs[name].ids if name in docs else markdown_anchors(text)
                missing = sorted(expected[key] - ids)
                assert not missing, f'{name}: no section for {missing}'
                # No type named on a page comes from the internal contract.
                leaked = sorted(word for word in internal if re.search(rf'(?<![A-Za-z_]){re.escape(word)}(?![A-Za-z_])', text))
                assert not leaked, f'{name}: internal schemas named: {leaked}'
    return api_reference.stats()


MARKDOWN_LINK = re.compile(r'\]\(([^)\s]+)\)')


def markdown_anchors(text):
    return set(re.findall(r'<a id="([^"]+)"></a>', text))


def check_markdown(docs):
    """The Markdown twins and llms.txt are what the build writes now, and every link in them resolves."""
    for name, text in generated().items():
        assert (DEST / name).read_text() == text, f'Stale {name}: run the build'
    texts = {name: (DEST / name).read_text() for name in CUSTOMER_FILES if name.endswith('.md') or name == 'llms.txt'}
    for name, text in texts.items():
        for target in MARKDOWN_LINK.findall(text):
            url = urlsplit(target)
            if url.scheme or url.netloc:
                continue
            path = unquote(url.path) or name
            assert (DEST / path).is_file(), f'{name}: missing {path}'
            if url.fragment:
                anchors = markdown_anchors(texts[path]) if path in texts else docs[path].ids if path in docs else set()
                assert unquote(url.fragment) in anchors, f'{name}: missing anchor {target}'
    return len(texts)


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
    methods, agent, fields = check_field_reference(docs)
    markdown = check_markdown(docs)
    print(f'Checked {len(docs)} pages: links, language parity, expanded samples and exact archive contents.')
    print(f'API reference: {methods} Store methods, each with an example run through the SDK and checked against the public contract, '
          f'and {agent} Agent members; {fields} fields, each described in both languages.')
    print(f'Checked {markdown} Markdown files (the reference twins and llms.txt): current, and every link resolves.')


if __name__ == '__main__':
    main()
