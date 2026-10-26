"""Customer catalogue for the implemented SDK preview."""
from html import escape


def business_sections(table):
    rows = [
        ('products / brands / characters', '#products', 'Create and edit shared business entities with optimistic versions.', 'create / get / list / update'),
        ('artifacts', '#artifacts', 'Read and version Script, Directing Plan and Prompt content.', 'create / get / update'),
        ('scripts / prompts', '#generation', 'Run standalone writers with defined inputs and saved results.', 'generate / get'),
        ('assets / videos / jobs', '#media', 'Upload media, generate from saved Prompts, track Jobs and assemble clips.', 'upload / get / generate / assemble'),
        ('ads', '#ads', 'Read Agent-registered final Ads and their composition.', 'get / list'),
        ('batches', '#workspaces', 'Read Batch metadata, Ads and Job counts; mutations require Agent authority.', 'get / list'),
        ('skills', 'backend-go.html#skills', 'Read authorized Skill definitions and versions; publication uses Admin authority.', 'get / list / version'),
    ]
    return [('stores', 'Client modules', table(['Module', 'Purpose', 'Methods'], [
        [f'<a href="{anchor}"><code>{escape(name)}</code></a>', description, f'<code>{methods}</code>']
        for name, anchor, description, methods in rows
    ]))]
