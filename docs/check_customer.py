"""Check generated guide navigation, bilingual parity, visible code samples, and the field reference's coverage."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, unquote
from zipfile import ZipFile

import api_reference
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


def check_field_reference(docs):
    """The field reference documents the whole public surface, from the public contract only."""
    found = api_reference.problems()
    assert not found, 'The API reference has gaps:\n- ' + '\n- '.join(found)
    store = api_reference.contract()['clients']['StoreClients']
    methods = {f'{client}-{member["name"]}' for client, members in store.items() for member in members}
    public = set(api_reference.components())
    internal_file = api_reference.OPENAPI.with_name('backend-internal.openapi.json')
    sdk_types = set(api_reference.contract()['clients'])  # SDK interfaces such as EntityRef, documented from stores.ts
    internal = set(json.loads(internal_file.read_text())['components']['schemas']) - public - sdk_types if internal_file.exists() else set()
    for locale in ('zh', 'en'):
        name = filename(api_reference.PAGE, locale)
        doc = docs[name]
        missing = sorted(methods - doc.ids)
        assert not missing, f'{name}: no section for {missing}'
        text = (DEST / name).read_text()
        # Every type named in a table is a public schema or an SDK type; none comes from the internal contract.
        leaked = sorted(word for word in internal if re.search(rf'[>\s(]{re.escape(word)}[<\s\[|)]', text))
        assert not leaked, f'{name}: internal schemas named: {leaked}'
        anchors = {value for value in re.findall(r'id="((?:in|out)-[A-Za-z0-9]+)"', text)}
        for schema in (anchor.split('-', 1)[1] for anchor in anchors):
            assert schema in public or schema in sdk_types or schema in api_reference.contract()['zod'], f'{name}: unknown type {schema}'
    methods_count, agent_count, fields = api_reference.stats()
    return methods_count, agent_count, fields


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
    print(f'Checked {len(docs)} pages: links, language parity, expanded samples and exact archive contents.')
    print(f'Field reference: {methods} Store methods and {agent} Agent members, {fields} fields, each described in both languages.')


if __name__ == '__main__':
    main()
