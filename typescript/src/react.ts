import { createContext, createElement, useContext, useMemo, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { readAgentState } from './client.js';
import type { AgentOptions, AgentResult, NuvaClient } from './types.js';
const Context = createContext<NuvaClient | null>(null);
export function NuvaProvider({ client, children }: { client: NuvaClient; children?: ReactNode }): ReactElement {
	return createElement(Context.Provider, { value: client }, children);
}
export function useAgent(options: AgentOptions): AgentResult {
	const client = useContext(Context);
	if (!client) throw new Error('NuvaProvider is required.');
	const agent = useMemo(() => client.agent(options), [client, options.sessionId]);
	const subscribe = useMemo(() => (notify: () => void) => agent.subscribe(() => notify()), [agent]);
	const state = useSyncExternalStore(
		subscribe,
		() => readAgentState(agent),
		() => readAgentState(agent),
	);
	return useMemo(
		() => ({
			sessionId: agent.sessionId,
			send: agent.send,
			stop: agent.stop,
			respond: agent.respond,
			fail: agent.fail,
			subscribe: agent.subscribe,
			onClientTool: agent.onClientTool,
			onHostCall: agent.onHostCall,
			refresh: agent.refresh,
			loadEarlierMessages: agent.loadEarlierMessages,
			listPendingCalls: agent.listPendingCalls,
			getHostCall: agent.getHostCall,
			...state,
		}),
		[agent, state],
	);
}
