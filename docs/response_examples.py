"""Selected SDK response fields for rendering examples, not complete DTOs."""
import json
from customer_layout import code

SCRIPT_ID = '11111111-1111-4111-8111-111111111111'
PROMPT_ID = '22222222-2222-4222-8222-222222222222'
JOB_ID = '33333333-3333-4333-8333-333333333333'
ASSET_ID = '44444444-4444-4444-8444-444444444444'
STORYBOARD_ID = '66666666-6666-4666-8666-666666666666'
CHARACTER_ID = '77777777-7777-4777-8777-777777777777'
CHARACTER2_ID = '77777777-7777-4777-8777-777777777778'
PRODUCT_ID = '55555555-5555-4555-8555-555555555555'
SKILL_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
COMPILER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
PROMPT2_ID = '22222222-2222-4222-8222-222222222223'
HOST_IMAGE_ID = '88888888-8888-4888-8888-888888888888'
FRIEND_IMAGE_ID = '88888888-8888-4888-8888-888888888889'
PRODUCT_IMAGE_ID = '99999999-9999-4999-8999-999999999999'
PRODUCT_VIDEO_ID = '99999999-9999-4999-8999-99999999999a'
HOST_VOICE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

RESPONSES = {
    'script': ('scripts.generate()', {
        'id': SCRIPT_ID,
        'ref': {'kind': 'script', 'id': SCRIPT_ID},
        'format': 3,
        'product': {'id': PRODUCT_ID, 'version': 2},
        'skill': {'id': SKILL_ID, 'name': 'script-writing', 'version': 3},
        'content': {
            'schema_version': 3,
            'concept': {'name': 'Still hot at ten'},
            'duration_ms': 15000,
            'roles': [
                {'id': 'host', 'name': 'Commuter', 'description': 'Office worker in her late twenties', 'speaks': True},
                {'id': 'friend', 'name': 'Colleague', 'description': 'Teasing colleague who doubts the coffee is still hot', 'speaks': True},
                {'id': 'barista', 'name': 'Barista', 'description': 'Hands over the coffee; never speaks', 'speaks': False},
            ],
            'panels': [
                {'id': 'P01', 'beat_id': 'B01', 'on_screen': ['barista', 'host', 'product'],
                 'action': 'The barista hands her a coffee; she pours it into the cup at the door.',
                 'lines': [{'id': 'L01', 'speaker': 'host', 'mode': 'on_camera', 'text': 'Filled at seven.'}], 'notes': ''},
                {'id': 'P02', 'beat_id': 'B02', 'on_screen': ['host', 'friend', 'product'],
                 'action': 'At her desk, he leans over; she opens the lid and steam rises.',
                 'lines': [
                     {'id': 'L02', 'speaker': 'friend', 'mode': 'dialogue', 'text': 'Ten o’clock and it’s still hot?'},
                     {'id': 'L03', 'speaker': 'host', 'mode': 'dialogue', 'text': 'Twelve hours, feel it.'},
                 ], 'notes': 'On-screen text: 12 hours hot'},
                {'id': 'P03', 'beat_id': 'B03', 'on_screen': ['product'],
                 'action': 'The open cup on the desk, steam rising.',
                 'lines': [{'id': 'L04', 'speaker': 'narrator', 'mode': 'voiceover', 'text': 'Warmhill travel cup. Still hot at work.'}], 'notes': ''},
            ],
        },
    }),
    'storyboard': ('storyboards.generate()', {
        'id': STORYBOARD_ID,
        'ref': {'kind': 'storyboard', 'id': STORYBOARD_ID},
        'script': {'id': SCRIPT_ID},
        'product': {'id': PRODUCT_ID, 'version': 2},
        'characters': [{'id': CHARACTER_ID, 'version': 1}, {'id': CHARACTER2_ID, 'version': 1}],
        'content': {
            'script': SCRIPT_ID,
            'cast': {
                'host': {'character': CHARACTER_ID, 'own_voice': True},
                'friend': {'character': CHARACTER2_ID, 'voice': 'Man around thirty, quick and teasing'},
                'barista': {'look': 'Young barista in a black apron, short hair'},
                'narrator': {'voice': 'Warm, even female voice-over'},
            },
            'direction': 'Phone selfie look, bright morning light, natural sound, no music.',
            'clips': [
                {'id': 'C01', 'duration_ms': 8000, 'shots': [
                    'Close-up: {{barista}} hands a hot coffee to {{host}}.',
                    'Medium shot: {{host}} pours it into {{product}}, twists the lid shut and says {{L01}}',
                ]},
                {'id': 'C02', 'duration_ms': 7000, 'shots': [
                    'Medium shot: at the desk {{friend}} eyes {{product}} and asks {{L02}}; {{host}} lifts it and answers {{L03}}',
                    f'Close-up: {{{{product:{PRODUCT_VIDEO_ID}}}}} the lid opens and steam rises; voice-over {{{{L04}}}}',
                ]},
            ],
        },
    }),
    'prompts': ('prompts.generate()', {
        'prompts': [
            {'id': PROMPT_ID, 'ref': {'kind': 'prompt', 'id': PROMPT_ID},
             'storyboard': {'id': STORYBOARD_ID}, 'skill': {'id': COMPILER_ID, 'name': 'video-prompts', 'version': 2},
             'data': {
                 'prompt': '<Subject 1> is the woman in <Picture 1>, voice from <Audio 1>. [Shot 1] 0–3 s: close-up, the barista hands her a coffee… [Shot 2] 3–8 s: she pours it into the cup in <Picture 2> and says…',
                 'image_asset_ids': [HOST_IMAGE_ID, PRODUCT_IMAGE_ID], 'video_asset_ids': [], 'audio_asset_ids': [HOST_VOICE_ID],
                 'seconds': 8, 'ratio': '9:16', 'clip_id': 'C01'}},
            {'id': PROMPT2_ID, 'ref': {'kind': 'prompt', 'id': PROMPT2_ID},
             'storyboard': {'id': STORYBOARD_ID}, 'skill': {'id': COMPILER_ID, 'name': 'video-prompts', 'version': 2},
             'data': {
                 'prompt': '<Subject 1> is the woman in <Picture 1>, voice from <Audio 1>; <Subject 2> is the man in <Picture 2>. [Shot 1] 0–4 s: he eyes the cup in <Picture 3> and asks… [Shot 2] 4–7 s: close-up of <Video 1>, the lid opens…',
                 'image_asset_ids': [HOST_IMAGE_ID, FRIEND_IMAGE_ID, PRODUCT_IMAGE_ID], 'video_asset_ids': [PRODUCT_VIDEO_ID], 'audio_asset_ids': [HOST_VOICE_ID],
                 'seconds': 7, 'ratio': '9:16', 'clip_id': 'C02'}},
        ],
    }),
    'job': ('videos.generate()', {
        'id': JOB_ID,
        'status': 'queued',
        'prompt': PROMPT_ID,
        'seed': 2804117,
        'resolution': None,
        'asset': None,
        'error': None,
        'error_code': None,
    }),
    'job-failed': ('jobs.get()', {
        'id': JOB_ID,
        'status': 'failed',
        'prompt': PROMPT_ID,
        'seed': 2804117,
        'resolution': '768P',
        'asset': None,
        'error': 'The video could not be generated. Try again, or change the prompt or its files.',
        'error_code': 'GENERATION_FAILED',
    }),
    'asset': ('job.result()', {
        'id': ASSET_ID,
        'kind': 'video',
        'mime': 'video/mp4',
        'source': 'generated',
        'metadata': {'duration_ms': 8000, 'width': 720, 'height': 1280},
        'label': None,
        'download_url': 'https://media.example.com/clip.mp4',
    }),
}


def response_example(name, locale):
    method, value = RESPONSES[name]
    label = '返回结果（部分字段）' if locale == 'zh' else 'Response (selected fields)'
    return code(json.dumps(value, ensure_ascii=False, indent=2), 'json', locale,
                filename=f'{method} · {label}')
