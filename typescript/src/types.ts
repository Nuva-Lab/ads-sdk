import type { MessageDraft } from './message.js';
import type { StoreClients } from './stores.js';
import type { TraceEntry } from './protocol.js';
import type {
	CommandOptions,
	SendReceipt,
	StopReceipt,
	ResponseReceipt,
	HostFailureReceipt,
	DynamicToolUIPart,
	JsonValue,
	HostFailure,
	AgentReadState,
	Unsubscribe,
	NotificationHostCall,
	PaginationQuery,
	Page,
	MessageView,
	MessageRef,
	Session,
} from '@nuva/protocol';
export type * from '@nuva/protocol';
export interface AgentOptions {
	readonly sessionId: string;
}

export interface AgentHandle {
	readonly sessionId: string;
	send(message: MessageDraft, options?: CommandOptions): Promise<SendReceipt>;
	/** Request stopping this Work Session's current loop without automatically cancelling Jobs. Requires backend support; Main Sessions are unsupported. */
	stop(options?: CommandOptions): Promise<StopReceipt>;
	/**
	 * Resolve after the backend validates and persists the response and the SDK
	 * applies the returned call record. Output follows the registered outputSchema.
	 * A still-valid pending call can be answered from older or cross-posted messages.
	 * Later Agent output arrives through the normal subscription.
	 */
	respond(
		call: Extract<DynamicToolUIPart, { state: 'input-available' }>,
		output: JsonValue,
		options?: CommandOptions,
	): Promise<ResponseReceipt>;
	/** Report inability to obtain a result, not a user's business rejection. */
	fail(
		call: Extract<DynamicToolUIPart, { state: 'input-available' }>,
		failure: HostFailure,
		options?: CommandOptions,
	): Promise<HostFailureReceipt>;
	/** Receives the current flat read state immediately, then subsequent states. */
	subscribe(listener: (state: AgentReadState) => void): Unsubscribe;
	/** Receives dynamic-tool events and state updates. Respond to input-available calls. */
	onClientTool(listener: (part: DynamicToolUIPart) => void): Unsubscribe;
	/** Receives data-host-call events; these do not require a tool response. */
	onHostCall(listener: (part: NotificationHostCall) => void): Unsubscribe;
	/** Refetch state; never resend commands or restart production. */
	refresh(): Promise<void>;
	loadEarlierMessages(): Promise<void>;
	listPendingCalls(query?: PaginationQuery): Promise<Page<Extract<DynamicToolUIPart, { state: 'input-available' }>>>;
	getHostCall(toolCallId: string): Promise<DynamicToolUIPart | NotificationHostCall>;
	/** This Session's files: images and voice samples the Agent generated, shown as `session_file` resource cards. */
	readonly files: SessionFilesClient;
}
/**
 * A file in a Session's own workspace, such as an image or voice sample the Agent generated. It is not a backend
 * Asset: it belongs to this Session, and the Agent registers it as an Asset when a Character, Storyboard or video uses
 * it. Message parts reference it as a resource `{ ref: { kind: 'session_file', id }, label }`.
 */
export interface SessionFile {
	/** Opaque ID; the same as the resource reference's `id`. */
	id: string;
	/** The file's media type, such as `image/png` or `audio/mpeg`. */
	mime: string;
	label: string;
	/** A signed URL for the file's bytes, usable directly in `<img>` or `<audio>`. */
	download_url: string;
	/** `download_url` is valid until this time (at least 12 hours); call `files.get` again after that. */
	download_url_expires_at: string;
}
export interface SessionFilesClient {
	/** A Session file's metadata and a signed URL to its bytes. */
	get(id: string): Promise<SessionFile>;
}

/**
 * React combines current flat state with the same bound methods.
 * Methods remain stable for a client/session; the result changes with data.
 */
export type AgentResult = AgentHandle & AgentReadState;

export interface SessionsClient {
	create(input: { title: string }): Promise<Session>;
	get(sessionId: string): Promise<Session>;
	list(query?: PaginationQuery): Promise<Page<Session>>;
	getMessage(ref: MessageRef): Promise<MessageView>;
	/** Read saved history without opening a live Agent handle. */
	history(sessionId: string, query?: PaginationQuery): Promise<Page<MessageView>>;
}

export interface AccessToken {
	readonly token: string;
	/** ISO datetime or Unix epoch milliseconds, supplied by the customer backend. */
	readonly expiresAt: string | number;
	/** Optional stable identity metadata. The gateway verifies token identity independently. */
	readonly principal?: { readonly customerId: string; readonly userId: string };
}
export type NuvaEnvironment = 'sandbox' | 'production';

export interface NuvaClientOptions {
	/** Paired Agent and API services. Defaults to sandbox (staging); use credentials issued by that environment. */
	readonly environment?: NuvaEnvironment;
	/** Optional Agent endpoint override for local development/testing. Release builds supply the official origin. */
	readonly baseUrl?: string;
	/** Optional Store endpoint override for local development/testing. */
	readonly storeBaseUrl?: string;
	/** Optional generation endpoint override; an explicit local Agent override may host generation too. */
	readonly generationBaseUrl?: string;
	readonly onTrace?: (trace: TraceEntry) => void;
	/** Observe raw transport bodies. Opt-in; observer failures cannot interrupt requests. */
	readonly onWireTrace?: (trace: import('./protocol.js').WireTraceEntry) => void | Promise<void>;
	/** Override request deadlines. Defaults: 8s for control/reads; 180s for writers, Asset registration and uploads. */
	readonly requestTimeoutMs?: number;
	readonly jobPollIntervalMs?: number;
	/** Legacy strings have no proactive expiry guarantee. */
	getAccessToken(): Promise<string | AccessToken>;
	readonly tokenRefreshSkewMs?: number;
}

/** Agent communication and prototype business stores. */
export interface NuvaClient extends StoreClients {
	readonly sessions: SessionsClient;
	agent(options: AgentOptions): AgentHandle;
	/** Close local connections and clear scoped client state, not server work. */
	close(): void;
}
