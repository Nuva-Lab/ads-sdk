import { createNuva, ScriptSchema, PerformanceSnapshotSchema, Message, type ScriptPackage } from '@nuva/sdk';
import type { StopReceipt } from '@nuva/sdk';
const client = createNuva({ baseUrl: 'http://127.0.0.1:8940/api', getAccessToken: async () => 'mock-user:alex' });
const scripts = client.artifacts.forSchema(ScriptSchema);
const snapshots = client.artifacts.forSchema(PerformanceSnapshotSchema);
declare const script: ScriptPackage;
void scripts.update({ kind: 'script', id: 'a' }, { data: { text: 'plain text' } });
void snapshots.get({ kind: 'performance_snapshot', id: 'b' });
// @ts-expect-error Read-only kinds do not expose update.
snapshots.update({ kind: 'performance_snapshot', id: 'b' }, { data: {} });
// @ts-expect-error A typed Script client requires Script data.
void scripts.update({ kind: 'script', id: 'a' }, { data: { title: 'wrong shape' } });
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
	// @ts-expect-error Independent Prompt generation has no Plan receipt.
	creationFailure.saved.plan;
	const savedPromptIds: string[] = creationFailure.saved.prompts.map((prompt) => prompt.id);
	void [code, savedPromptIds];
}

// @ts-expect-error The generation service accepts omission, not an explicit null ratio.
void client.prompts.generate({ script: '00000000-0000-4000-8000-000000000001', ratio: null });

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
// @ts-expect-error Relationship writes belong to the Agent.
void scripts.create({ data: { text: 'Draft' }, relationships: artifactSources });
// @ts-expect-error Relationship writes belong to the Agent.
void client.prompts.create({ data: { prompt: 'Clip', image_asset_ids: ['asset'] }, relationships: artifactSources });
// @ts-expect-error Script data no longer carries source identities.
const oldScriptData: BackendSchemas['ScriptDataV1'] = { text: 'Draft', product: 'revision' };
// @ts-expect-error Plan v1 now requires text content.
const oldPlanData: BackendSchemas['DirectingPlanDataV1'] = { script: 'id', specs: [] };
// @ts-expect-error The typed Script writer does not accept Product-source metadata.
void client.scripts.create({ content: {} as import('@nuva/sdk').ScriptPackage, product: 'revision' });

// @ts-expect-error Raw video clients cannot write relationship edges.
void client.videos.generate({ input: { schema_version: 1, data: { prompt: 'clip', image_asset_ids: ['id'] }, relationships: artifactSources } });
