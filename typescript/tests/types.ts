import { createNuva, Message, type ScriptPackage } from '@nuva/sdk';
import { withServices } from '@nuva/sdk/internal';
import type { StopReceipt } from '@nuva/sdk';
const client = createNuva(withServices({ getAccessToken: async () => 'mock-user:alex' }, { baseUrl: 'http://127.0.0.1:8940/api' }));
declare const script: ScriptPackage;
// @ts-expect-error There is no generic Artifact client: Scripts, Storyboards and Prompts have their own.
void client.artifacts;
// Saved Prompt IDs remain a valid backend video request.
void client.videos.generate({ prompt: { id: '00000000-0000-4000-8000-000000000001' } });
void Message.create().mention({ ref: { kind: 'script', id: 'a' }, label: 'Script' });
const stopResult: Promise<StopReceipt> = client.agent({ sessionId: 'work-session' }).stop({ requestId: 'stop-request' });
void stopResult;
void client.agent({ sessionId: 'work-session' }).stop();
// @ts-expect-error Stop is bound to the Work Session; no command target or internal cutoff is public.
void client.agent({ sessionId: 'work-session' }).stop({ cutoff: 10 });
client.close();

// @ts-expect-error A Storyboard is not compiled when it is written; the ratio belongs to its Prompts.
void client.storyboards.generate({ script: { id: '00000000-0000-4000-8000-000000000001' }, ratio: '9:16' });
// @ts-expect-error Prompts are compiled from a Storyboard, not a Script.
void client.prompts.generate({ script: '00000000-0000-4000-8000-000000000001' });
// @ts-expect-error The generation service accepts omission, not an explicit null ratio.
void client.prompts.generate({ storyboard: { id: '00000000-0000-4000-8000-000000000001' }, ratio: null });
// @ts-expect-error Starting from a Storyboard is storyboards.generateFrom(base, { instruction }).
void client.storyboards.generate({ base: '00000000-0000-4000-8000-000000000001', instruction: 'Shorter' });
// @ts-expect-error There is no Storyboard from scratch: your changes are storyboards.createFrom(base, changes).
void client.storyboards.generate({ content: {} as import('@nuva/sdk/schemas').StoryboardContent });
// @ts-expect-error Starting from a Script is scripts.generateFrom(base, { instruction }).
void client.scripts.generate({ product: '00000000-0000-4000-8000-000000000001', base: '00000000-0000-4000-8000-000000000002', acceptable_duration_ms: { min: 5000, max: 9000 } });
void client.scripts.generateFrom({ kind: 'script', id: '00000000-0000-4000-8000-000000000002' }, { instruction: 'Warmer', acceptable_duration_ms: { min: 8000, max: 12000 } });
void client.scripts.createFrom({ kind: 'script', id: '00000000-0000-4000-8000-000000000002' }, { roles: [] });
declare const editedBoard: import('@nuva/sdk/schemas').StoryboardContent;
void client.storyboards.createFrom({ kind: 'storyboard', id: '00000000-0000-4000-8000-000000000001' }, { direction: editedBoard.direction });
// @ts-expect-error Scripts, Storyboards and Prompts never change in place: there is no update.
void client.storyboards.update;
const storyboard: Promise<import('@nuva/sdk').Storyboard> = client.storyboards.generateFrom({ kind: 'storyboard', id: '00000000-0000-4000-8000-000000000001' }, { instruction: 'Shorter' });
void storyboard.then(async (board) => {
	const shots: string[] = board.content.clips[0]!.shots;
	const { prompts } = await client.prompts.generate({ storyboard: { id: board.id }, clip: 'C01', ratio: '9:16' });
	void client.videos.generate({ prompt: { id: prompts[0]!.id } });
	// @ts-expect-error Video generation takes a saved Prompt ID or raw input, not a Storyboard clip.
	void client.videos.generate({ storyboard: { id: board.id, clip: 'C01' } });
	void shots;
});
declare const upload: File;
void client.assets.upload(upload, { kind: 'image', label: 'Box front', description: 'The front of the gift box' });
void client.assets.upload({ url: 'https://example.com/box.png' }, { kind: 'image', idempotencyKey: 'box-front' });
// @ts-expect-error One way to add a file: upload (a File or a URL).
void client.assets.register;
// Entities change in place: update sends only the changed fields, with the version you read.
declare const product: import('@nuva/sdk').Product;
void client.products.update(product, { data: { selling_points: ['Keeps tea hot'] } }, { idempotencyKey: 'tea' });
void client.characters.update({ id: 'c', version: 3 }, { data: { voice_asset_id: null } });
// @ts-expect-error The version you read is required.
void client.products.update({ id: 'p' }, { data: { name: 'Cup' } });
// @ts-expect-error Product pictures are image_asset_ids, like every list of files.
void client.products.create({ brand_id: 'b', data: { name: 'Cup', images: [] } });
// @ts-expect-error Upload the image, then update the Product's image_asset_ids.
void client.products.uploadImage;
// @ts-expect-error A version's own id is the Agent's: references are { id, version? }.
void product.revision;

// @ts-expect-error Batch creation is Agent-only.
client.batches.create({ intent: 'forbidden' });
// @ts-expect-error Public Batch logs are written by Agent bookkeeping.
client.batches.appendLog('id', { text: 'forbidden' });
// @ts-expect-error Final Ad registration is Agent-only.
client.ads.create({});

// @ts-expect-error Customers register Skills; no public workflow catalogue exists.
client.workflows;
// @ts-expect-error Direct generation returns Script, Prompts or Job, not workflow runs.
client.workflowRuns;

void createNuva({ getAccessToken: async () => 'customer-token' });

const cancelled: Promise<import('@nuva/sdk').JobState> = client.jobs.cancel('00000000-0000-4000-8000-000000000001');
void cancelled;
const archived: Promise<import('@nuva/sdk').Session> = client.sessions.archive('session-id');
const archivedAt: Promise<string | undefined> = client.sessions.list({ archived: true }).then((page) => page.items[0]?.archivedAt);
void archived, archivedAt, client.sessions.unarchive('session-id');
const skillArchivedAt: Promise<string | null | undefined> = client.skills.list({ archived: true }).then((page) => page.items[0]?.archived_at);
void skillArchivedAt;

// Raw video input uses Prompt v1 data and Asset IDs, with an exclusive source.
import type { GenerateVideoInput, RawPromptInput, Job, Asset, Prompt } from '@nuva/sdk';
const rawVideoPrompt: RawPromptInput = {
	schema_version: 1,
	data: { prompt: '<Picture 1> stays still.', image_asset_ids: ['id'], video_asset_ids: [], audio_asset_ids: [], seconds: 5, ratio: '9:16' },
};
// @ts-expect-error A raw render names no Characters: attach their pictures and name them <Picture N>.
const withCharacters: RawPromptInput = { schema_version: 1, data: { prompt: '<Picture 1>', image_asset_ids: ['id'], characters: ['c'] } };
const rawVideoRequest: GenerateVideoInput = { input: rawVideoPrompt, prompt: null, resolution: '768P', seed: 7 };
const rawVideoJob: Promise<Job<Asset>> = client.videos.generate(rawVideoRequest, { idempotencyKey: 'stable-key' });
void client.videos.generate({ prompt: { id: 'saved-id' }, input: null });
void rawVideoJob.then(async (job) => {
	const promptId: string = job.prompt;
	const saved: Prompt = await client.prompts.get({ id: promptId });
	// What it was made from reads as named fields.
	const fromStoryboard: string | undefined = saved.storyboard?.id;
	const writtenWith: string | undefined = saved.skill?.name;
	// @ts-expect-error The raw relationships are the Agent's.
	void saved.relationships;
	const clip: string | null | undefined = saved.data.clip_id;
	// @ts-expect-error Which Character versions a Prompt shows is the Agent's record.
	void saved.data.characters;
	void [fromStoryboard, writtenWith, clip];
});
// @ts-expect-error Exactly one non-null source is required.
void client.videos.generate({});
// @ts-expect-error Null does not select a source.
void client.videos.generate({ prompt: null, input: null });
// @ts-expect-error Saved ID and raw input cannot both be supplied.
void client.videos.generate({ prompt: { id: 'saved-id' }, input: rawVideoPrompt });
// @ts-expect-error Raw content requires the versioned data envelope.
void client.videos.generate({ input: { prompt: 'raw text' } });
// @ts-expect-error Only Prompt v1 is supported.
void client.videos.generate({ input: { schema_version: 2, data: { prompt: 'raw text' } } });
// @ts-expect-error Raw video references are Asset IDs, not direct service URLs.
void client.videos.generate({ input: { schema_version: 1, data: { prompt: 'raw text', image_urls: ['https://example.com/a.png'] } } });
// @ts-expect-error Run options belong to the Job envelope.
void client.videos.generate({ input: { schema_version: 1, data: { prompt: 'raw text', seed: 7 } } });

// Ad reads: membership and composition may be missing; the metadata version and editor data are the Agent's.
import type { Ad, Batch } from '@nuva/sdk';
import type { BackendSchemas } from '@nuva/sdk/schemas';
declare const targetAd: Ad;
// @ts-expect-error An Ad's metadata version is the Agent's.
void targetAd.version;
const adBatch: string | null = targetAd.batch_id;
const adComposition: BackendSchemas['CompositionReadV1'] | null = targetAd.composition;
// @ts-expect-error Unknown composition requires an explicit null check.
const definiteComposition: BackendSchemas['CompositionReadV1'] = targetAd.composition;
// @ts-expect-error Raw Ads may have no Batch membership.
const definiteBatch: string = targetAd.batch_id;
declare const legacyBatchRead: Batch;
// @ts-expect-error Public Batch logs are not part of the customer DTO.
legacyBatchRead.log;
// @ts-expect-error Ads and Batches are written by the Agent: their write bodies aren't in the public contract.
type NoAdCreate = BackendSchemas['AdCreate'];
void [adBatch, adComposition];

const artifactSources = [{ type: 'based_on', target: { kind: 'product', id: 'revision' } }] as const;
// @ts-expect-error Prompts are compiled from a Storyboard or saved by raw videos.generate({ input }); there is no prompts.create.
void client.prompts.create({ data: { prompt: 'Clip', image_asset_ids: ['asset'] } });
void client.prompts.createFrom({ kind: 'prompt', id: 'a' }, { prompt: '<Picture 1> turns.' });
// @ts-expect-error createFrom changes render fields only.
void client.prompts.createFrom({ kind: 'prompt', id: 'a' }, { clip_id: 'C02' });
// @ts-expect-error Script data no longer carries source identities.
const oldScriptData: BackendSchemas['ScriptDataV1'] = { text: 'Draft', product: 'revision' };
// @ts-expect-error Plan v1 now requires text content.
const oldPlanData: BackendSchemas['DirectingPlanDataV1'] = { script: 'id', specs: [] };
// @ts-expect-error Scripts are written by the writer (scripts.generate); there is no scripts.create.
void client.scripts.create({ content: {} as import('@nuva/sdk/schemas').ScriptContent });
// @ts-expect-error v2 ScriptPackages are read-only; Scripts are written as v3.
void client.scripts.createFrom({ kind: 'script', id: 'a' }, script);
declare const readScript: import('@nuva/sdk').Script;
if (readScript.format === 3) void readScript.content.panels;
else void readScript.legacy.clips;

// @ts-expect-error Raw video clients cannot write relationship edges.
void client.videos.generate({ input: { schema_version: 1, data: { prompt: 'clip', image_asset_ids: ['id'] }, relationships: artifactSources } });
// Session files: generated media shown as session_file resource cards.
const sessionFile: Promise<import('../src/index.js').SessionFile> = client.agent({ sessionId: 'work-session' }).files.get('sf_x');
void sessionFile;
// useAgent exposes the same Session files client as agent().
import { useAgent } from '../src/react.js';
export function SessionFileName(): string {
	const files: import('../src/index.js').SessionFilesClient = useAgent({ sessionId: 'work-session' }).files;
	void files.get('sf_x').then((file) => {
		const fields: [string, string, string, string, string] = [file.id, file.mime, file.label, file.download_url, file.download_url_expires_at];
		void fields;
		// @ts-expect-error `kind` is not part of a Session file; use `mime`.
		void file.kind;
		// @ts-expect-error a Session file has no public size.
		void file.size_bytes;
	});
	return 'files';
}

// An Asset is attached and quoted as is: its own `label` may be missing or null.
declare const uploaded: Asset;
void Message.create().attach(uploaded).quote(uploaded);

// An AdsError says what failed and where: no acceptance (retry with the same idempotencyKey) and no partial result.
declare const failure: import('@nuva/sdk').AdsError;
const reported: [string, string | undefined, string | undefined, boolean] = [failure.code, failure.requestId, failure.method, failure.retryable];
// @ts-expect-error Whether a write was taken is the SDK's own business.
void failure.acceptance;
void reported;
// @ts-expect-error The trace hooks are not public options.
createNuva({ getAccessToken: async () => 'token', onTrace: () => {} });
// @ts-expect-error The trace hooks are not public options.
createNuva({ getAccessToken: async () => 'token', onWireTrace: () => {} });

// @ts-expect-error Service origins are set with withServices (workspace-only); customers choose an environment.
createNuva({ getAccessToken: async () => 'token', baseUrl: 'http://127.0.0.1:1' });
