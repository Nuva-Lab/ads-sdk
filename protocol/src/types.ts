export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };
export type Timestamp = string; // ISO 8601, UTC.
export type Cursor = string; // Opaque; never construct or parse it.
export type Unsubscribe = () => void;

export interface Page<T> {
	readonly items: readonly T[];
	/** null means the end of this list, not "not loaded". */
	readonly nextCursor: Cursor | null;
}

export interface PaginationQuery {
	readonly cursor?: Cursor;
	readonly limit?: number;
}

export type ResourceRef<K extends string = string> = {
	readonly kind: K;
	readonly id: string;
};

/** A record/link already returned by Nuva; labels do not resolve identity. */
export interface ResourceLink<K extends string = string> {
	readonly ref: ResourceRef<K>;
	readonly label: string;
}

export interface MessageRef {
	/** Canonical public source Session, even when shown in another view. */
	readonly sessionId: string;
	readonly messageId: string;
}

export interface UserIdentity {
	/** Customer-scoped user identity. */
	readonly userId: string;
	/** Optional presentation metadata; identity and authorization always use userId. */
	readonly displayName?: string | undefined;
}

export interface Session {
	readonly id: string;
	readonly kind: 'main' | 'work';
	readonly title: string;
	readonly owner: UserIdentity;
	readonly createdAt: Timestamp;
}

interface PartBase {
	/** Stable within its message, including while text streams. */
	readonly id: string;
}

export type MessagePart =
	| (PartBase & {
			readonly type: 'text';
			readonly format: 'plain' | 'markdown';
			readonly text: string;
	  })
	| (PartBase & { readonly type: 'resource'; readonly record: ResourceLink })
	| (PartBase & {
			readonly type: 'quote';
			readonly target: ResourceLink | MessageRef;
			readonly text?: string;
	  })
	| DynamicToolUIPart
	| NotificationHostCall;

interface MessageBase {
	readonly ref: MessageRef;
	readonly createdAt: Timestamp;
	readonly content: readonly MessagePart[];
	/** Message-level attachments; inline quotes remain in content. */
	readonly attachments: readonly ResourceLink[];
	readonly replyTo?: MessageRef;
}

export type MessageView = MessageBase &
	(
		| {
				readonly role: 'user';
				/** Reuse the authenticated author identity; the caller does not set it. */
				readonly metadata: { readonly user: UserIdentity };
		  }
		| {
				/** The source Session in ref identifies the Agent. */
				readonly role: 'assistant';
		  }
	) &
	({ readonly state: 'streaming' | 'complete' | 'interrupted' } | { readonly state: 'failed'; readonly error: NuvaErrorInfo });

/**
 * Minimal JSON-compatible subset of AI SDK's dynamic-tool part protocol.
 * Kept independent of runtime package types so this design draft has no provider dependency.
 * Client tools are published with complete, validated input. Accepted output is never preliminary.
 */
export type DynamicToolUIPart = {
	readonly type: 'dynamic-tool';
	readonly toolName: string;
	readonly toolCallId: string;
	readonly input: JsonObject;
} & (
	| { readonly state: 'input-available' }
	| { readonly state: 'output-available'; readonly output: JsonValue }
	| { readonly state: 'output-error'; readonly errorText: string }
);

/** Response-free host notifications use AI SDK's data-* part convention. */
export interface NotificationHostCall {
	readonly type: 'data-host-call';
	readonly id: string;
	readonly data: {
		readonly toolName: string;
		readonly input: JsonObject;
	};
}

export interface HostFailure {
	/** Customer-defined diagnostic code, retained in the backend record. */
	readonly code: string;
	readonly message: string;
}

export type ReviewDecisionValue = {
	decision: 'approve' | 'reject';
	text: string;
};

/** Available after the initial conversation load succeeds. */
export interface AgentData {
	readonly session: Session;
	/** Render items in the supplied order. The cursor loads older history. */
	readonly messages: Page<MessageView>;
}

export type AgentReadState =
	| { readonly status: 'loading' }
	| { readonly status: 'error'; readonly error: NuvaErrorInfo }
	| (AgentData & {
			/** Synchronization error; retain loaded data and the last known execution status. */
			readonly error?: NuvaErrorInfo;
	  } & ({ readonly status: 'idle' | 'running' } | { readonly status: 'waiting_for_response'; readonly callIds: readonly string[] }));

/** Initial loading/error, then the addressed Agent's execution status. */
export type AgentStatus = AgentReadState['status'];

export type NuvaErrorCode =
	| 'UNAUTHENTICATED'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'INVALID_INPUT'
	| 'UNSUPPORTED_SCHEMA'
	| 'UNSUPPORTED_OPERATION'
	| 'JOB_CANCELLED'
	| 'FINAL_VIDEO_CONFLICT'
	| 'REVISION_CONFLICT'
	| 'CALL_ALREADY_RESOLVED'
	| 'CALL_OBSOLETE'
	| 'REQUEST_ID_CONFLICT'
	| 'AGENT_BUSY'
	| 'RATE_LIMITED'
	| 'UNSUPPORTED_CONTENT'
	| 'CONNECTION_ERROR'
	| 'SERVICE_ERROR'
	// Backend error codes are an open string vocabulary, matching the wire schema.
	| (string & {});

export interface NuvaErrorInfo {
	readonly code: NuvaErrorCode;
	readonly message: string;
	readonly retryable: boolean;
	readonly requestId?: string;
	/** Applies to a command error. Missing means this was not a command. */
	readonly acceptance?: 'not_accepted' | 'unknown';
}

export interface CommandOptions {
	/** Transport correlation. Backend writes may define idempotency; chat send/Stop do not promise receipt replay. */
	readonly requestId?: string;
}

export interface SendReceipt {
	readonly requestId: string;
	/** Saved user message; not the Agent's final answer. */
	readonly message: MessageRef;
}

export interface StopReceipt {
	readonly requestId: string;
	/** Addressed Work Session. The target operation stops its current loop; this receipt does not confirm Job cancellation. */
	readonly sessionId: string;
}

export interface ResponseReceipt {
	readonly requestId: string;
	/** Persisted response accepted by the backend; not completion of later Agent work. */
	readonly call: Extract<DynamicToolUIPart, { state: 'output-available' }>;
}

export interface HostFailureReceipt {
	readonly requestId: string;
	readonly call: Extract<DynamicToolUIPart, { state: 'output-error' }>;
}

export type DataHostCall = NotificationHostCall;
export type AgentState = AgentReadState;

export interface ClientMessageInput {
	readonly content: readonly Extract<MessagePart, { type: 'text' | 'quote' }>[];
	readonly attachments: readonly ResourceLink[];
	readonly replyTo?: MessageRef;
}

export interface RequestFrame {
	/** Omission preserves the original implicit v1 contract. Other explicit versions are rejected. */
	version?: 1;
	id: string;
	method: string;
	params: unknown;
}
export type ReplyFrame = ({ type: 'result'; id: string; result: unknown } | { type: 'error'; id: string; error: NuvaErrorInfo }) & {
	version?: 1;
};
export interface StateEvent {
	version?: 1;
	type: 'state';
	sessionId: string;
	sequence: number;
	state: AgentReadState;
	hostCalls: (DynamicToolUIPart | NotificationHostCall)[];
}
export type ServerFrame = ReplyFrame | StateEvent | { type: 'ready'; version?: 1 } | { type: 'reauthenticated'; id: string; version?: 1 };

export type ClientFrame =
	| { type: 'auth'; token: string; version?: 1 }
	| { type: 'reauth'; id: string; token: string; version?: 1 }
	| RequestFrame;
