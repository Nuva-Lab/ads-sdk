// Focused React examples. Function parameters provide each snippet's application context.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
	createNuva,
	Message,
	type AccessToken,
	type AgentHandle,
	type AgentState,
	type Artifact,
	type Batch,
	type DynamicToolUIPart,
	type JsonObject,
	type MessageView,
	type NuvaClient,
	type Product,
} from '@nuva/sdk';

export function useClientExample(getAccessToken: () => Promise<AccessToken>) {
	// #region client
	const [nuva, setNuva] = useState<NuvaClient | null>(null);
	useEffect(() => {
		const client = createNuva({ getAccessToken });
		setNuva(client);
		return () => client.close();
	}, [getAccessToken]);
	// #endregion client
	return nuva;
}

export async function openSessionExample(nuva: NuvaClient, sessionId: string) {
	// #region open-session
	const session = await nuva.sessions.get(sessionId);
	const agent = nuva.agent({ sessionId: session.id });
	// #endregion open-session
	return agent;
}

export function useSessionExample(nuva: NuvaClient, sessionId: string) {
	// #region subscription
	const agent = useMemo(() => nuva.agent({ sessionId }), [nuva, sessionId]);
	const [state, setState] = useState<AgentState>({ status: 'loading' });

	useEffect(() => agent.subscribe(setState), [agent]);
	// #endregion subscription
	return { agent, state };
}

export function useMessageInputExample(agent: AgentHandle) {
	// #region conversation
	const [text, setText] = useState('');

	async function send() {
		await agent.send(Message.text(text));
		setText((current) => (current === text ? '' : current));
	}
	// #endregion conversation
	return { text, setText, send };
}

export function MessageListExample({ state, renderMessage }: { state: AgentState; renderMessage: (message: MessageView) => ReactNode }) {
	// #region messages
	if (state.status === 'loading') return <p>Loading…</p>;
	if (state.status === 'error') return <p>{state.error.message}</p>;

	return state.messages.items.map((message) => (
		<Fragment key={`${message.ref.sessionId}:${message.ref.messageId}`}>{renderMessage(message)}</Fragment>
	));
	// #endregion messages
}

export function useReviewExample(agent: AgentHandle, part: Extract<DynamicToolUIPart, { state: 'input-available' }>) {
	// #region review
	const [feedback, setFeedback] = useState('');

	async function review(decision: 'approve' | 'reject') {
		await agent.respond(part, { decision, text: feedback });
	}
	// #endregion review
	return { feedback, setFeedback, review };
}

export function useClientToolExample(
	agent: AgentHandle,
	onRequest: (part: Extract<DynamicToolUIPart, { state: 'input-available' }>) => void,
) {
	// #region client-tool
	useEffect(
		() =>
			agent.onClientTool((part) => {
				if (part.state === 'input-available') onRequest(part);
			}),
		[agent, onRequest],
	);
	// #endregion client-tool
}

export function useHostCallExample(agent: AgentHandle, onHostAction: (name: string, input: JsonObject) => void) {
	// #region host
	useEffect(
		() =>
			agent.onHostCall((part) => {
				onHostAction(part.data.toolName, part.data.input);
			}),
		[agent, onHostAction],
	);
	// #endregion host
}

export function creationExample(agent: AgentHandle, product: Product) {
	// #region create-scripts
	async function createScripts() {
		await agent.send(Message.create().quote(product).text('Draft three Scripts for my review.'));
	}
	// #endregion create-scripts
	return createScripts;
}

export function messageActionsExample(agent: AgentHandle, script: Artifact, message: MessageView) {
	// #region message-actions
	async function reviseScript() {
		await agent.send(Message.create().quote(script).text('Make the opening feel more natural.'));
	}

	async function reply() {
		await agent.send(Message.create().replyTo(message).text('Keep this version.'));
	}
	// #endregion message-actions
	return { reviseScript, reply };
}

export function continueBatchExample(agent: AgentHandle, batch: Batch) {
	// #region continue-batch
	async function continueBatch() {
		await agent.send(Message.create().quote(batch).text('Use a different performer for the second concept; keep the other Ads unchanged.'));
	}
	// #endregion continue-batch
	return continueBatch;
}

export async function fetchNuvaToken(): Promise<AccessToken> {
	// #region token-provider
	// This is your backend route; verify the signed-in application user first.
	const response = await fetch('/api/nuva-token', {
		method: 'POST',
		credentials: 'same-origin',
	});
	if (!response.ok) throw new Error('Unable to refresh Nuva credentials.');
	// { token, expiresAt: ISO string or epoch milliseconds, principal? }
	return response.json();
	// #endregion token-provider
}
