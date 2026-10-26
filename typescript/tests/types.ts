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
// Saved Prompt IDs are the backend video request.
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
