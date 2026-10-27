"""Selected SDK response fields for rendering examples, not complete DTOs."""
import json
from customer_layout import code

SCRIPT_ID = '11111111-1111-4111-8111-111111111111'
PROMPT_ID = '22222222-2222-4222-8222-222222222222'
JOB_ID = '33333333-3333-4333-8333-333333333333'
ASSET_ID = '44444444-4444-4444-8444-444444444444'
IMAGE_ID = '55555555-5555-4555-8555-555555555555'

RESPONSES = {
    'script': ('scripts.generate()', {
        'id': SCRIPT_ID,
        'ref': {'kind': 'script', 'id': SCRIPT_ID},
        'content': {
            'concept': {'name': 'Morning commute'},
            'clips': [{'id': 'C01', 'duration_ms': 10000}],
        },
    }),
    'prompts': ('prompts.generate()', {
        'prompts': [{
            'id': PROMPT_ID,
            'data': {
                'prompt': 'Show the cup in <Picture 1> on a morning commute.',
                'image_asset_ids': [IMAGE_ID],
                'seconds': 10,
                'ratio': '9:16',
            },
        }],
    }),
    'job': ('videos.generate()', {
        'id': JOB_ID,
        'status': 'queued',
        'prompt': PROMPT_ID,
        'asset': None,
    }),
    'asset': ('job.result()', {
        'id': ASSET_ID,
        'kind': 'video',
        'mime': 'video/mp4',
        'download_url': 'https://media.example.com/clip.mp4',
    }),
}


def response_example(name, locale):
    method, value = RESPONSES[name]
    label = '返回结果（部分字段）' if locale == 'zh' else 'Response (selected fields)'
    return code(json.dumps(value, ensure_ascii=False, indent=2), 'json', locale,
                filename=f'{method} · {label}')
