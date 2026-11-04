"""Selected SDK response fields for rendering examples, not complete DTOs."""
import json
from customer_layout import code

SCRIPT_ID = '11111111-1111-4111-8111-111111111111'
PROMPT_ID = '22222222-2222-4222-8222-222222222222'
JOB_ID = '33333333-3333-4333-8333-333333333333'
ASSET_ID = '44444444-4444-4444-8444-444444444444'
STORYBOARD_ID = '66666666-6666-4666-8666-666666666666'
CHARACTER_ID = '77777777-7777-4777-8777-777777777777'

RESPONSES = {
    'script': ('scripts.generate()', {
        'id': SCRIPT_ID,
        'ref': {'kind': 'script', 'id': SCRIPT_ID},
        'format': 3,
        'content': {
            'schema_version': 3,
            'concept': {'name': 'Morning commute'},
            'duration_ms': 15000,
            'roles': [{'id': 'host', 'name': 'Commuter', 'description': 'Office worker in her late twenties', 'speaks': True}],
            'panels': [{
                'id': 'P01', 'beat_id': 'B01', 'on_screen': ['host', 'product'],
                'action': 'She pours hot coffee into the cup at the door.',
                'lines': [{'id': 'L01', 'speaker': 'host', 'mode': 'on_camera', 'text': 'Still hot when I get to work.'}],
                'notes': '',
            }],
        },
    }),
    'storyboard': ('storyboards.generate()', {
        'id': STORYBOARD_ID,
        'ref': {'kind': 'storyboard', 'id': STORYBOARD_ID},
        'content': {
            'script': SCRIPT_ID,
            'cast': {'host': {'character': CHARACTER_ID, 'voice': 'character'}},
            'direction': 'Phone selfie look, bright kitchen, natural sound, no music.',
            'clips': [{
                'id': 'C01', 'duration_ms': 8000,
                'shots': [
                    'Close-up: {{host}} fills {{product}} at the kitchen counter.',
                    'Medium shot: {{host}} lifts the cup to the camera and says {{L01}}',
                ],
            }],
        },
    }),
    'prompts': ('prompts.generate()', {
        'prompts': [{
            'id': PROMPT_ID,
            'ref': {'kind': 'prompt', 'id': PROMPT_ID},
            'data': {
                'prompt': '[Shot 1] 0–3 s: close-up, <Picture 1> fills <Picture 2> at the kitchen counter. …',
                'image_asset_ids': ['88888888-8888-4888-8888-888888888888', '99999999-9999-4999-8999-999999999999'],
                'audio_asset_ids': ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
                'seconds': 8,
                'ratio': '9:16',
                'clip_id': 'C01',
            },
            'relationships': [{'type': 'based_on', 'target': {'kind': 'storyboard', 'id': STORYBOARD_ID}}],
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
