import { parseStateEvent, parseSession, parseSessions, parseMessages, parseMessage } from './wire-schema.js';
import { Transport } from './transport.js';
import { frozen, stableJSON } from './protocol.js';
import { draftValue } from './message.js';
import { NuvaError } from './errors.js';
import type { StateEvent } from './protocol.js';
import type {
	AgentHandle,
	AgentReadState,
	NuvaClient,
	NuvaClientOptions,
	AgentOptions,
	CommandOptions,
	DynamicToolUIPart,
	HostFailure,
	HostFailureReceipt,
	JsonValue,
	NotificationHostCall,
	NuvaErrorInfo,
	Page,
	PaginationQuery,
	ResponseReceipt,
	SendReceipt,
	MessageView,
} from './types.js';
import type { MessageDraft } from './message.js';
import { createStores } from './store-client.js';
import { stopReceiptSchema, clientResponseReceiptSchema, clientFailureReceiptSchema } from '@nuva/protocol';

const controllers = new WeakMap<AgentHandle, AgentController>();
class AgentController implements AgentHandle {
	readonly api: AgentHandle;
	state: AgentReadState = frozen({ status: 'loading' });
	private listeners = new Set<(state: AgentReadState) => void>();
	private clientTools = new Set<(part: DynamicToolUIPart) => void>();
	private hosts = new Set<(part: NotificationHostCall) => void>();
	private delivered = new Map<string, string>();
	private unwatch: (() => void) | undefined;
	private closed = false;
	constructor(
		readonly sessionId: string,
		private transport: Transport,
	) {
		this.api = Object.freeze({
			sessionId,
			send: this.send,
			stop: this.stop,
			respond: this.respond,
			fail: this.fail,
			subscribe: this.subscribe,
			onClientTool: this.onClientTool,
			onHostCall: this.onHostCall,
			refresh: this.refresh,
			loadEarlierMessages: this.loadEarlierMessages,
			listPendingCalls: this.listPendingCalls,
			getHostCall: this.getHostCall,
		});
		controllers.set(this, this);
		controllers.set(this.api, this);
	}
	private start() {
		if (this.closed) throw new NuvaError({ code: 'CONNECTION_ERROR', message: 'Client is closed.', retryable: false });
		if (!this.unwatch)
			this.unwatch = this.transport.watch(
				this.sessionId,
				(event) => this.apply(event),
				(error) => this.syncError(error),
			);
	}
	private emit() {
		for (const listener of this.listeners) {
			try {
				listener(this.state);
			} catch (error) {
				console.error('Nuva subscriber failed', error);
			}
		}
	}
	private apply(event: StateEvent) {
		if (this.closed) return;
		event = parseStateEvent(event);
		let next = structuredClone(event.state);
		if (next.status !== 'loading' && next.status !== 'error' && this.state.status !== 'loading' && this.state.status !== 'error') {
			const ids = new Set(next.messages.items.map((m) => m.ref.sessionId + ':' + m.ref.messageId));
			const first = next.messages.items[0];
			const boundary = first
				? this.state.messages.items.findIndex((m) => m.ref.sessionId === first.ref.sessionId && m.ref.messageId === first.ref.messageId)
				: -1;
			const older =
				boundary >= 0 ? this.state.messages.items.slice(0, boundary).filter((m) => !ids.has(m.ref.sessionId + ':' + m.ref.messageId)) : [];
			if (older.length)
				next = { ...next, messages: { items: [...older, ...next.messages.items], nextCursor: this.state.messages.nextCursor } };
		}
		this.state = frozen(next);
		this.emit();
		for (const part of event.hostCalls) {
			const id = part.type + ':' + (part.type === 'dynamic-tool' ? part.toolCallId : part.id);
			const signature = stableJSON(part);
			if (this.delivered.get(id) === signature) continue;
			this.delivered.set(id, signature);
			if (part.type === 'dynamic-tool') {
				for (const listener of this.clientTools) {
					try {
						listener(part);
					} catch (error) {
						console.error('Nuva client tool listener failed', error);
					}
				}
			} else {
				for (const listener of this.hosts) {
					try {
						listener(part);
					} catch (error) {
						console.error('Nuva host listener failed', error);
					}
				}
			}
		}
	}
	private syncError(error: NuvaErrorInfo) {
		this.state =
			this.state.status === 'loading' || this.state.status === 'error'
				? frozen({ status: 'error', error })
				: frozen({ ...this.state, error });
		this.emit();
	}
	private applyCall(call: DynamicToolUIPart) {
		if (this.state.status === 'loading' || this.state.status === 'error') return;
		const items = this.state.messages.items.map((message) => ({
			...message,
			content: message.content.map((part) => (part.type === 'dynamic-tool' && part.toolCallId === call.toolCallId ? call : part)),
		}));
		this.state = frozen({ ...this.state, messages: { ...this.state.messages, items } });
		this.emit();
	}
	send = async (message: MessageDraft, options?: CommandOptions): Promise<SendReceipt> => {
		this.start();
		return this.transport.socket('agent.send', { sessionId: this.sessionId, message: draftValue(message) }, options?.requestId);
	};
	stop = async (options?: CommandOptions) => {
		this.start();
		const requestId = options?.requestId ?? crypto.randomUUID();
		const value = await this.transport.socket('agent.stop', { sessionId: this.sessionId }, requestId);
		const parsed = stopReceiptSchema.safeParse(value);
		if (!parsed.success || parsed.data.sessionId !== this.sessionId || parsed.data.requestId !== requestId)
			throw new NuvaError({
				code: 'SERVICE_ERROR',
				message: 'Malformed Stop receipt.',
				retryable: false,
				requestId,
				acceptance: 'unknown',
			});
		return parsed.data;
	};
	respond = async (
		call: Extract<DynamicToolUIPart, { state: 'input-available' }>,
		output: JsonValue,
		options?: CommandOptions,
	): Promise<ResponseReceipt> => {
		this.start();
		const requestId = options?.requestId ?? crypto.randomUUID();
		const value = await this.transport.socket<unknown>(
			'agent.respond',
			{ sessionId: this.sessionId, toolCallId: call.toolCallId, output },
			requestId,
		);
		const parsed = clientResponseReceiptSchema.safeParse(value);
		if (
			!parsed.success ||
			parsed.data.requestId !== requestId ||
			parsed.data.call.toolCallId !== call.toolCallId ||
			parsed.data.call.toolName !== call.toolName ||
			stableJSON(parsed.data.call.input) !== stableJSON(call.input)
		)
			throw new NuvaError({
				code: 'SERVICE_ERROR',
				message: 'Invalid client-response receipt.',
				retryable: false,
				requestId,
				acceptance: 'unknown',
			});
		const receipt = parsed.data as ResponseReceipt;
		this.applyCall(receipt.call);
		return receipt;
	};
	fail = async (
		call: Extract<DynamicToolUIPart, { state: 'input-available' }>,
		failure: HostFailure,
		options?: CommandOptions,
	): Promise<HostFailureReceipt> => {
		this.start();
		const requestId = options?.requestId ?? crypto.randomUUID();
		const value = await this.transport.socket<unknown>(
			'agent.fail',
			{ sessionId: this.sessionId, toolCallId: call.toolCallId, failure },
			requestId,
		);
		const parsed = clientFailureReceiptSchema.safeParse(value);
		if (
			!parsed.success ||
			parsed.data.requestId !== requestId ||
			parsed.data.call.toolCallId !== call.toolCallId ||
			parsed.data.call.toolName !== call.toolName ||
			stableJSON(parsed.data.call.input) !== stableJSON(call.input)
		)
			throw new NuvaError({
				code: 'SERVICE_ERROR',
				message: 'Invalid client-failure receipt.',
				retryable: false,
				requestId,
				acceptance: 'unknown',
			});
		const receipt = parsed.data as HostFailureReceipt;
		this.applyCall(receipt.call);
		return receipt;
	};
	subscribe = (listener: (state: AgentReadState) => void) => {
		this.listeners.add(listener);
		listener(this.state);
		this.start();
		return () => {
			this.listeners.delete(listener);
		};
	};
	onClientTool = (listener: (part: DynamicToolUIPart) => void) => {
		this.clientTools.add(listener);
		this.start();
		return () => {
			this.clientTools.delete(listener);
		};
	};
	onHostCall = (listener: (part: NotificationHostCall) => void) => {
		this.hosts.add(listener);
		this.start();
		return () => {
			this.hosts.delete(listener);
		};
	};
	refresh = async () => {
		this.start();
		const event = await this.transport.socket<StateEvent>('agent.snapshot', { sessionId: this.sessionId });
		this.apply(event);
	};
	loadEarlierMessages = async () => {
		this.start();
		if (this.state.status === 'loading' || this.state.status === 'error') {
			await this.refresh();
			return;
		}
		const cursor = this.state.messages.nextCursor;
		if (cursor === null) return;
		const page = await this.transport.http<Page<MessageView>>('sessions.history', { sessionId: this.sessionId, cursor, limit: 15 });
		const latest = readAgentState(this);
		if (latest.status === 'loading' || latest.status === 'error') return;
		const keys = new Set(latest.messages.items.map((m) => m.ref.sessionId + ':' + m.ref.messageId));
		this.state = frozen({
			...latest,
			messages: {
				items: [...page.items.filter((m) => !keys.has(m.ref.sessionId + ':' + m.ref.messageId)), ...latest.messages.items],
				nextCursor: page.nextCursor,
			},
		});
		this.emit();
	};
	listPendingCalls = (query: PaginationQuery = {}) =>
		this.transport.http<Page<Extract<DynamicToolUIPart, { state: 'input-available' }>>>('agent.listPendingCalls', {
			sessionId: this.sessionId,
			...query,
		});
	getHostCall = (id: string) =>
		this.transport.http<DynamicToolUIPart | NotificationHostCall>('agent.getHostCall', { sessionId: this.sessionId, id });
	close() {
		this.closed = true;
		this.unwatch?.();
		this.state = frozen({ status: 'loading' });
		this.emit();
		this.listeners.clear();
		this.clientTools.clear();
		this.hosts.clear();
		this.delivered.clear();
	}
}

export function readAgentState(handle: AgentHandle): AgentReadState {
	const controller = controllers.get(handle);
	if (!controller) throw new TypeError('Expected an Agent handle created by this SDK.');
	return controller.state;
}
export function createNuva(options: NuvaClientOptions): NuvaClient {
	const transport = new Transport(options);
	const agents = new Map<string, AgentController>();
	const stores = createStores(transport, options);
	const client: NuvaClient = {
		...stores.api,
		sessions: {
			create: async (input) => parseSession(await transport.data('sessions.create', input)),
			get: async (sessionId) => parseSession(await transport.data('sessions.get', { sessionId })),
			list: async (query = {}) => parseSessions(await transport.data('sessions.list', query)),
			history: (sessionId, query = {}) => transport.http('sessions.history', { sessionId, ...query }),
			getMessage: (ref) => transport.http('sessions.getMessage', { ref }),
		},
		agent: ({ sessionId }: AgentOptions) => {
			let agent = agents.get(sessionId);
			if (!agent) {
				agent = new AgentController(sessionId, transport);
				agents.set(sessionId, agent);
			}
			return agent.api;
		},
		close: () => {
			stores.close();
			transport.close();
			for (const agent of agents.values()) agent.close();
			agents.clear();
		},
	};
	return client;
}
