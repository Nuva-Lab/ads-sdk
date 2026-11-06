import { createNuva, ScriptSchema, PerformanceSnapshotSchema, Message, type ScriptPackage } from '@nuva/sdk';
import type { StopReceipt } from '@nuva/sdk';
const client = createNuva({ baseUrl: 'http://127.0.0.1:8940/api', getAccessToken: async () => 'mock-user:alex' });
const scripts = client.artifacts.forSchema(ScriptSchema);
const snapshots = client.artifacts.forSchema(PerformanceSnapshotSchema);
declare const script: ScriptPackage;
void scripts.get({ kind: 'script', id: 'a' }).then((read) => read.data.text);
void snapshots.get({ kind: 'performance_snapshot', id: 'b' });
// @ts-expect-error The generic Artifact client only reads; Scripts, Storyboards and Prompts are written through their own clients.
scripts.update({ kind: 'script', id: 'a' }, { data: { text: 'plain text' } });
// @ts-expect-error The generic Artifact client cannot create an Artifact.
void client.artifacts.create({ kind: 'storyboard', schema_version: 1, data: { text: '' } });
// @ts-expect-error A typed reference cannot silently select another kind.
void scripts.get({ kind: 'prompt', id: 'a' });
// @ts-expect-error Full kind/id references are required.
void client.artifacts.get('a');
// Saved Prompt IDs remain a valid backend video request.
void client.videos.generate({ prompt: '00000000-0000-4000-8000-000000000001' });
void Message.create().mention({ ref: { kind: 'script', id: 'a' }, label: 'Script' });
const stopResult: Promise<StopReceipt> = client.agent({ sessionId: 'work-session' }).stop({ requestId: 'stop-request' });
void stopResult;
void client.agent({ sessionId: 'work-session' }).stop();
// @ts-expect-error Stop is bound to the Work Session; no command target or internal cutoff is public.
void client.agent({ sessionId: 'work-session' }).stop({ cutoff: 10 });
client.close();

import { PartialCreationError } from '@nuva/sdk';
declare const creationFailure: unknown;
if (creationFailure instanceof PartialCreationError) {
	const code: 'PARTIAL_CREATION' = creationFailure.code;
	// @ts-expect-error A Prompt receipt has no Plan.
	creationFailure.saved.plan;
	const savedPromptIds: string[] = creationFailure.saved.prompts.map((prompt) => prompt.id);
	void [code, savedPromptIds];
}

// @ts-expect-error A Storyboard is not compiled when it is written; the ratio belongs to its Prompts.
void client.storyboards.generate({ script: '00000000-0000-4000-8000-000000000001', ratio: '9:16' });
// @ts-expect-error Prompts are compiled from a Storyboard, not a Script.
void client.prompts.generate({ script: '00000000-0000-4000-8000-000000000001' });
// @ts-expect-error The generation service accepts omission, not an explicit null ratio.
void client.prompts.generate({ storyboard: '00000000-0000-4000-8000-000000000001', ratio: null });
// @ts-expect-error A revision is storyboards.revise(ref, { instruction }).
void client.storyboards.generate({ base: '00000000-0000-4000-8000-000000000001', instruction: 'Shorter' });
// @ts-expect-error There is no Storyboard from scratch: an edit is storyboards.update(ref, { content }).
void client.storyboards.generate({ content: {} as import('@nuva/sdk/schemas').StoryboardContent });
// @ts-expect-error A revision is scripts.revise(ref, { instruction }).
void client.scripts.generate({ product: '00000000-0000-4000-8000-000000000001', base: '00000000-0000-4000-8000-000000000002', acceptable_duration_ms: { min: 5000, max: 9000 } });
void client.scripts.revise({ kind: 'script', id: '00000000-0000-4000-8000-000000000002' }, { instruction: 'Warmer', acceptable_duration_ms: { min: 8000, max: 12000 } });
declare const editedBoard: import('@nuva/sdk/schemas').StoryboardContent;
void client.storyboards.update({ kind: 'storyboard', id: '00000000-0000-4000-8000-000000000001' }, { content: editedBoard });
const storyboard: Promise<import('@nuva/sdk').Storyboard> = client.storyboards.revise({ kind: 'storyboard', id: '00000000-0000-4000-8000-000000000001' }, { instruction: 'Shorter' });
void storyboard.then(async (board) => {
	const shots: string[] = board.content.clips[0]!.shots;
	const { prompts } = await client.prompts.generate({ storyboard: board.id, clip: 'C01', ratio: '9:16' });
	void client.videos.generate({ prompt: prompts[0]!.id });
	// @ts-expect-error Video generation takes a saved Prompt ID or raw input, not a Storyboard clip.
	void client.videos.generate({ storyboard: { id: board.id, clip: 'C01' } });
	void shots;
});
declare const upload: File;
void client.assets.upload(upload, { kind: 'image', label: 'Box front', description: 'The front of the gift box' });

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

// @ts-expect-error Job cancellation is an internal Agent capability, not a customer SDK operation.
client.jobs.cancel('00000000-0000-4000-8000-000000000001');

// Raw video input uses Prompt v1 data and Asset IDs, with an exclusive source.
import type { GenerateVideoInput, RawPromptInput, Job, Asset, Prompt } from '@nuva/sdk';
const rawVideoPrompt: RawPromptInput = {
	schema_version: 1,
	data: { prompt: '<Picture 1> stays still.', image_asset_ids: ['id'], video_asset_ids: [], audio_asset_ids: [], characters: ['revision'], seconds: 5, ratio: '9:16' },
};
const rawVideoRequest: GenerateVideoInput = { input: rawVideoPrompt, prompt: null, resolution: '768P', seed: 7 };
const rawVideoJob: Promise<Job<Asset>> = client.videos.generate(rawVideoRequest, { idempotencyKey: 'stable-key' });
void client.videos.generate({ prompt: 'saved-id', input: null });
void rawVideoJob.then(async (job) => {
	const promptId: string = job.prompt;
	const saved: Prompt = await client.prompts.get({ kind: 'prompt', id: promptId });
	const sourceKind: string | undefined = saved.relationships[0]?.target.kind;
	const characters: string[] | undefined = saved.data.characters;
	void [sourceKind, characters];
});
// @ts-expect-error Exactly one non-null source is required.
void client.videos.generate({});
// @ts-expect-error Null does not select a source.
void client.videos.generate({ prompt: null, input: null });
// @ts-expect-error Saved ID and raw input cannot both be supplied.
void client.videos.generate({ prompt: 'saved-id', input: rawVideoPrompt });
// @ts-expect-error Raw content requires the versioned data envelope.
void client.videos.generate({ input: { prompt: 'raw text' } });
// @ts-expect-error Only Prompt v1 is supported.
void client.videos.generate({ input: { schema_version: 2, data: { prompt: 'raw text' } } });
// @ts-expect-error Raw video references are Asset IDs, not direct service URLs.
void client.videos.generate({ input: { schema_version: 1, data: { prompt: 'raw text', image_urls: ['https://example.com/a.png'] } } });
// @ts-expect-error Run options belong to the Job envelope.
void client.videos.generate({ input: { schema_version: 1, data: { prompt: 'raw text', seed: 7 } } });

// PR target Ad reads require a metadata version and preserve unknown composition/membership.
import type { Ad, Batch } from '@nuva/sdk';
import type { BackendSchemas } from '@nuva/sdk/schemas';
declare const targetAd: Ad;
const adVersion: number = targetAd.version;
const adBatch: string | null = targetAd.batch_id;
const adComposition: BackendSchemas['CompositionV1'] | null = targetAd.composition;
// @ts-expect-error Unknown composition requires an explicit null check.
const definiteComposition: BackendSchemas['CompositionV1'] = targetAd.composition;
// @ts-expect-error Raw Ads may have no Batch membership.
const definiteBatch: string = targetAd.batch_id;
declare const legacyBatchRead: Batch;
// @ts-expect-error Public Batch logs are not part of the customer DTO.
legacyBatchRead.log;
const minimalAd: BackendSchemas['AdCreate'] = { schema_version: 1, asset_id: 'id' };
const nullableAd: BackendSchemas['AdCreate'] = { ...minimalAd, batch_id: null, composition: null };
const privateLogBatch: BackendSchemas['BatchCreate'] = { intent: 'Create', log_uri: 'r2://agent-logs/batches/log.jsonl' };
void [adVersion, adBatch, adComposition, nullableAd, privateLogBatch];

const artifactSources: BackendSchemas['ArtifactRelationship'][] = [{ type: 'based_on', target: { kind: 'product', id: 'revision' } }];
// @ts-expect-error Prompts are compiled from a Storyboard or saved by raw videos.generate({ input }); there is no prompts.create.
void client.prompts.create({ data: { prompt: 'Clip', image_asset_ids: ['asset'] } });
// @ts-expect-error Relationship writes belong to the Agent.
void client.prompts.update({ kind: 'prompt', id: 'a' }, { data: { prompt: '<Picture 1>', image_asset_ids: ['asset'] }, relationships: artifactSources });
// @ts-expect-error Script data no longer carries source identities.
const oldScriptData: BackendSchemas['ScriptDataV1'] = { text: 'Draft', product: 'revision' };
// @ts-expect-error Plan v1 now requires text content.
const oldPlanData: BackendSchemas['DirectingPlanDataV1'] = { script: 'id', specs: [] };
// @ts-expect-error Scripts are written by the writer (scripts.generate); there is no scripts.create.
void client.scripts.create({ content: {} as import('@nuva/sdk/schemas').ScriptContent });
// @ts-expect-error v2 ScriptPackages are read-only; Scripts are written as v3.
void client.scripts.update({ kind: 'script', id: 'a' }, { content: script });
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
