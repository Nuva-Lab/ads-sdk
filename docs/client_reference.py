"""Customer-facing reference generated from checked SDK examples."""
from html import escape
import json
from pathlib import Path
import re
from textwrap import dedent
from build import table
from customer_layout import code
from business_reference import business_sections


def message_example():
    return {
        'ref': {'sessionId': '11111111-1111-4111-8111-111111111111', 'messageId': '22222222-2222-4222-8222-222222222222'},
        'role': 'assistant', 'state': 'complete', 'createdAt': '2026-10-26T12:00:00.000Z',
        'content': [
            {'id': 'text_1', 'type': 'text', 'format': 'markdown', 'text': 'The Script is saved and ready for review.'},
            {'id': 'result_1', 'type': 'resource', 'record': {
                'ref': {'kind': 'script', 'id': '33333333-3333-4333-8333-333333333333'}, 'label': 'Script 1'}},
            {'type': 'dynamic-tool', 'toolName': 'nuva.review', 'toolCallId': 'call_17',
             'state': 'input-available', 'input': {'prompt': 'Approve this Script or describe the changes.',
             'targets': [{'kind': 'script', 'id': '33333333-3333-4333-8333-333333333333'}]}}
        ], 'attachments': [],
    }


def disclosure(label, content):
    return f'<details class="reference-details"><summary>{escape(label)}</summary>{content}</details>'


def source_example(name, filename, language):
    source = (Path(__file__).parent / 'examples' / filename).read_text()
    matches = re.findall(rf'^[\t ]*// #region {re.escape(name)}\n(.*?)^[\t ]*// #endregion {re.escape(name)}$', source, re.M | re.S)
    if len(matches) != 1:
        raise ValueError(f'Expected one example region in {filename}: {name}')
    return code(dedent(matches[0]).strip(), language)


def react_example(name):
    return source_example(name, 'react-usage.tsx', 'tsx')


def store_example(name):
    return source_example(name, 'store-usage.ts', 'ts')


AGENT_SECTIONS = ('start', 'agent', 'session', 'messages', 'client-tools', 'host-calls', 'reference')
STORE_SECTIONS = ('stores', 'products', 'artifacts', 'generation', 'media', 'ads', 'workspaces')
PREVIEW = '<p>Ads SDK 0.1.0-preview.1. Use the client to create ads, manage saved resources, and build an Agent chat interface.</p>'


def _client_sections():
    sections = [
        ('start', 'Start with React', PREVIEW + react_example('client')
         + disclosure('Install with pnpm', code('pnpm add /path/to/nuva-sdk-0.1.0-preview.1.tgz', 'sh'))
         + '<p>Create one client for the authenticated user, and close it on logout or account change. Your backend returns <code>{token, expiresAt, principal?}</code>. The SDK renews expiry-aware tokens, shares concurrent refresh requests and reauthenticates the WebSocket as the same identity. Return an expiry with the token to enable proactive renewal.</p><p>User display names are optional presentation metadata. Verified customer/user IDs determine authority and scope; a UI may show “User” when a name is absent. </p>'
         + react_example('token-provider') + disclosure('Create an Agent Session', react_example('open-session'))
         + '<p>Agent and direct Store calls share the user client. Keep your Admin API key on your backend. The independent <a href="backend-go.html">Go Admin SDK</a> issues user tokens from your authenticated backend.</p>'
         + '<p>Full checked source: <a href="examples/react-usage.tsx">React example</a>. Page layout and rendering are supplied by your application.</p>'),
        *business_sections(table),
        ('products', 'Products, Brands and Characters',
         '<p>Create a Brand before a Product. Entities retain continuing <code>id</code>, numeric <code>version</code> and exact <code>revision</code>. Brand and Character use the same create/get/update pattern.</p>'
         + store_example('brand-create') + store_example('product-create') + store_example('product-read') + store_example('product-update')
         + '<p>Pass the record you read as <code>base</code>. On a version conflict, retain the edit and compare it with a fresh read. The SDK does not retry a conflicting update against a new version.</p>'
         + '<h3>Upload and attach an image</h3>' + store_example('product-upload-image')
         + '<p><code>uploadImage</code> uploads/registers the Asset, then attaches its ID with an optimistic Product update. It returns <code>{productId, assetId, product, asset}</code>. If attachment fails after upload, <code>ProductImageUploadError</code> preserves the uploaded Asset reference; it does not silently retry the Product edit. Use <code>data.attributes</code> for additional Product fields expressed as JSON.</p>'),
        ('artifacts', 'Artifacts and versions',
         '<p>The backend stores <code>script</code>, <code>directing_plan</code> and <code>prompt</code> Artifacts. Script and Prompt generation return independent saved Artifacts.</p>'
         + table(['Method', 'Input', 'Result'], [
             ('<code>get(ref)</code>', '<code>{kind,id}</code>', 'The authorized Artifact.'),
             ('<code>create(input)</code>', '<code>kind, schema_version, data</code>; optional <code>batch_id</code>', 'A new immutable Artifact.'),
             ('<code>update(ref, input)</code>', 'Existing reference and new <code>data</code>', 'A new version ID with the original as <code>base_id</code>.'),
         ]) + store_example('artifact-read') + store_example('artifact-create') + store_example('artifact-update')
         + '<p><code>schema_version: 1</code> is the backend content schema. Script <code>data.text</code> stores the explicitly marked <code>nuva.script-package</code> version-2 JSON envelope; <code>scripts.get()</code> exposes its validated <code>content</code>. Entity references use exact revisions; Skill references use exact Skill-version IDs.</p>'
         + '<p><code>base_id</code> is version ancestry. Fields such as <code>data.script</code> or <code>data.plan</code> identify the source Artifact for the kinds that use them.</p>'),
        ('generation', 'Direct Script and Prompt generation',
         '<p>Generate Scripts and Prompts directly from your application, or ask the Agent to work with them in a conversation. An optional Skill selection controls writing guidance.</p>'
         + '<h3>Write and revise a Script</h3>' + store_example('script-generate') + store_example('script-revise')
         + '<p>Pass the Product ID and an acceptable duration range. The service reads the authorized Product revision and its media; callers do not duplicate facts and image URLs. The optional <code>base</code> is an existing Script ID for revision. The returned Script has a creation Batch.</p>'
         + '<h3>Create independent clip Prompts</h3>' + store_example('prompt-generate')
         + '<p>Prompt generation uses the saved Script, reference images and selected Skill. Each clip needs at least one accessible reference image. Read its generation instructions from <code>prompt.data.prompt</code>.</p>'
         + '<p>The result is <code>{prompts}</code>, with saved Prompts in clip order. <code>PartialCreationError.saved.prompts</code> retains successfully saved records when a later save fails. Inspect those records before retrying.</p>'
         + '<p><a href="examples/creation-chain.ts">Complete creation example</a>: Brand → Product → uploadImage → Script/revision → Prompts → video Jobs → assembly. Running the example creates resources and submits video-generation Jobs.</p>'),
        ('media', 'Assets, video Jobs and assembly',
         table(['Method', 'Behavior'], [
             ('<code>assets.upload(file, {kind})</code>', 'Upload intent → credential-free signed PUT → Asset registration.'),
             ('<code>assets.register({url,kind})</code>', 'Register a supported external media source.'),
             ('<code>assets.get(id)</code>', 'Read metadata and fresh authorized download access.'),
             ('<code>videos.generate({prompt, ...})</code>', 'Submit a saved Prompt ID; return a Job handle.'),
             ('<code>jobs.get / subscribe</code>', 'Read progress or subscribe to status updates; subscription does not regenerate work.'),
             ('<code>videos.assemble(input)</code>', 'Render explicit ordered clips and trims; return <code>{assetId,uri}</code>.'),
         ]) + store_example('asset-upload') + store_example('asset-read') + store_example('video-job')
         + '<p>Pass the saved Prompt ID to <code>videos.generate</code>. An explicit Batch can reuse an authorized Prompt; if omitted, the SDK carries the Prompt’s Batch when available. Seed and resolution belong to the Job.</p>'
         + '<p><code>result()</code> waits for <code>completed</code> and returns the registered Asset. Job states are queued/running/completed/failed/cancelled. Cancelling a subscription or stopping a chat loop does not cancel a Job. To request best-effort cancellation, ask the Agent. Only a confirmed backend status establishes that a Job was cancelled.</p>'
         + '<p>Asset IDs are durable; signed <code>download_url</code> and assembly <code>uri</code> expire. Direct Asset reads are uploader-scoped; an authorized shared Product or Ad can supply permitted Asset sidecars to other users. Keep those access paths distinct.</p>'
         + '<p>Assembly uses explicit <code>start_ms/end_ms</code>, width, height, fps and <code>audio: "preserve" | "mute"</code>. Preserve requires audio in every input clip; mute deliberately removes it.</p>'),
        ('ads', 'Final Ads', '<p>The public SDK exposes <code>ads.get/list</code> only. Assembly registers the final Asset and immutable Ad composition. Different edits create a new Ad; editor drafts remain in your application. A final Asset belongs to one Ad and prohibits assigning the same final Asset to two Ads; input reuse remains allowed.</p>'
         + store_example('ad-read') + '<p>Composition contains ordered clips with Asset IDs and trim bounds, optional audio Asset IDs, and editor data. There is no <code>ads.update</code> or public Ad creation method.</p>'),
        ('workspaces', 'Batches', '<p>Use <code>batches.get/list</code> for intent, Ads and Job counts. Batch creation and mutation are Agent-only.</p>'
         + store_example('workspaces-read')),
        ('agent', 'Start work with the Agent', '<p><code>send()</code> success acknowledges saved input. Subscribe for subsequent text, resources and client interactions. Use <code>quote()</code> and <code>replyTo()</code> to identify the exact resource or message.</p>'
         + react_example('create-scripts') + disclosure('Revise or reply', react_example('message-actions')) + disclosure('Continue a Batch', react_example('continue-batch'))
         + '<p>A busy Session rejects another normal send; there is no message queue/Steer API. Stop targets the current loop. A manually resent chat message is a new input and can repeat work; its request ID is correlation, not permanent backend deduplication.</p>'),
        ('session', 'Session state and subscriptions', '<p>Subscribe inside the component and unsubscribe on unmount. Unsubscribing leaves server work intact. Key the conversation component by Session ID.</p>'
         + react_example('subscription') + react_example('conversation')
         + table(['Field', 'Meaning'], [('<code>status</code>', 'loading, error, idle, running or waiting_for_response'), ('<code>session</code>', 'Identity and metadata after loading.'), ('<code>messages</code>', 'Ordered Page&lt;MessageView&gt; plus history cursor.'), ('<code>callIds</code>', 'Pending client interaction IDs when waiting.'), ('<code>error</code>', 'Initial loading or subsequent synchronization error.')])
         + '<p>Clear the draft only after send succeeds. Reconnect retains saved content; the SDK merges stream updates into the same message. <code>refresh</code> and <code>loadEarlierMessages</code> read history without restarting work. Same-identity token renewal is required; switching accounts requires a new client.</p>'),
        ('messages', 'Render results and reviews', '<p>Render message content in order: text, quotes, resource records and dynamic tools. Read an Artifact using its saved <code>record.ref</code>. Your application owns <code>renderMessage</code>.</p>'
         + react_example('messages') + disclosure('Message example', code(json.dumps(message_example(), indent=2), 'json'))
         + '<h3>Respond to a review</h3>' + react_example('review')
         + '<p>Handle a call only in <code>input-available</code>. Review uses <code>decision: "approve" | "reject"</code> and <code>text</code>. User rejection is a normal response; use <code>agent.fail</code> for processing failure. An accepted response cannot be overwritten. Stop closes unanswered interactions owned by that loop.</p>'),
        ('client-tools', 'Client tools requiring a response', '<p><code>onClientTool</code> receives dynamic-tool input and state changes. Present the input when available, then respond or fail explicitly. Pick one handler per toolCallId so history rendering does not repeat effects.</p>'
         + react_example('client-tool') + '<p>Pending calls are also available in messages and <code>listPendingCalls()</code>. Your application supplies the UI and validates the registered tool input/output contract.</p>'),
        ('host-calls', 'Host actions without a response', '<p><code>onHostCall</code> receives data-host-call records for registered application actions, such as navigation. Subscribe in useEffect with a stable callback.</p>'
         + react_example('host') + '<p>These actions do not require respond(). They are saved in history, so rendering old messages must not replay website actions. Use a client tool when the Agent needs an answer.</p>'),
        ('reference', 'Methods and errors', table(['Method', 'Purpose'], [
            ('<code>sessions.create/get/list</code>', 'Authorized Session directory operations on the Agent service, not Store backend routes.'),
            ('<code>sessions.history/getMessage</code>', 'Read saved messages.'),
            ('<code>agent.refresh/loadEarlierMessages</code>', 'Resynchronize or page history.'),
            ('<code>agent.listPendingCalls/getHostCall</code>', 'Recover saved interaction records.'),
            ('<code>nuva.close()</code>', 'Close local connections and clear the current client state.'),
         ]) + '<p><code>NuvaError</code> carries code, message, retryable, requestId when available, and write acceptance where applicable. UNAUTHENTICATED/FORBIDDEN require identity or permission handling; REVISION_CONFLICT requires comparing edits; CALL_OBSOLETE/CALL_ALREADY_RESOLVED require reading current state. After a transport failure, inspect whether the original operation was accepted before retrying.</p>'
         + '<p>REQUEST_ID_CONFLICT can mean a client request with that ID is already awaiting acknowledgement. It does not establish durable backend idempotency.</p>'),
    ]
    by_id = {item[0]: item for item in sections}
    if set(AGENT_SECTIONS + STORE_SECTIONS) != set(by_id) or len(by_id) != len(sections):
        raise ValueError('Review customer section identities.')
    return by_id


def agent_sections():
    sections = _client_sections()
    return [sections[key] for key in AGENT_SECTIONS]


def store_sections():
    sections = _client_sections()
    return [('start', 'Start with the Store SDK', PREVIEW + store_example('initialize')
             + '<p>Use the service URLs provided for your environment and the same renewable user token for Store and Agent calls. Admin credentials stay on your backend.</p>'),
            *[sections[key] for key in STORE_SECTIONS],
            ('reference', 'Errors and replay', '<p><code>requestId</code> correlates requests. Optional <code>idempotencyKey</code> is a separate write contract available on supported write operations: same customer/user/method/path/key and effective input returns the original resource; changed input conflicts. A new intent uses a new key even when input matches.</p>'
             + '<p>The SDK does not automatically replay unknown writes or resolve optimistic conflicts. It may refresh and retry once after an authentication response explicitly proves the write was not accepted. A lost upload registration response needs its original key and upload snapshot, not a new upload. Preserve saved references in partial failures.</p>'
             + '<div class="downloads"><a href="examples/store-usage.ts">Store examples</a><a href="examples/creation-chain.ts">Complete creation example</a></div>')]
