import { originsForEnvironment } from './environments.js';
import { Credentials } from './credentials.js';
import { parseFrame } from './wire-schema.js';
import { AdsError, acceptanceOf, errorInfo, initOf, withMethod, type AdsErrorInit } from './errors.js';
import { frozen } from './protocol.js';
import type { ServerFrame, StateEvent, WireTraceEntry } from './protocol.js';
import { wireObserver } from './wire-trace.js';
import { servicesOf } from './dev-services.js';
import type { NuvaClientOptions } from './types.js';
import { dataRequest } from './data-routes.js';
import { backendSchema } from './backend-schema.js';

/** Socket auth codes that refuse the token itself (SDK-CONTRACT › Authentication); any other failure is transient. */
const refusal = (code: string, reauth: boolean) => code === 'UNAUTHENTICATED' || (reauth && code === 'FORBIDDEN');
/** The API version this SDK is written for; every HTTP call sends it (Nuva-Api-Version). */
export const API_VERSION = '2026-11-07';
/** Writes the backend can make safe to retry with an Idempotency-Key. */
const keyed = new Set([
	'scripts.generate',
	'storyboards.generate',
	'prompts.generate',
	'prompts.createFrom',
	'videos.generate',
	'assets.register',
	'products.create',
	'products.update',
	'brands.create',
	'brands.update',
	'characters.create',
	'characters.update',
]);
const writes = new Set([
	'sessions.create',
	'sessions.archive',
	'sessions.unarchive',
	'prompts.createFrom',
	'jobs.cancel',
	'assets.register',
	'assets.uploadIntent',
	'assets.update',
	'ads.create',
	'batches.create',
	'brands.create',
	'brands.update',
	'characters.create',
	'characters.update',
	'ads.update',
	'ads.registerFinalVideo',
	'ads.submitMapping',
	'videos.generate',
	'storyboards.generate',
	'prompts.generate',
	'products.create',
	'products.update',
	'products.delete',
	'shares.set',
	'shares.remove',
	'scripts.generate',
	'scripts.update',
	'agent.send',
	'agent.stop',
	'agent.respond',
	'agent.fail',
]);
/** Writes without an idempotency key that end the same however often they are sent. */
const sameWhenRepeated = new Set(['jobs.cancel', 'sessions.archive', 'sessions.unarchive', 'products.delete', 'shares.set', 'shares.remove', 'assets.update', 'assets.uploadIntent']);
/** How often a request safe to repeat is sent again after a transient failure, and the first wait (tripled each time). */
const RETRIES = 2;
const RETRY_DELAY_MS = 500;
/** Connection errors that were timeouts: not sent again (the request may still be running). */
const timeouts = new WeakSet<AdsError>();
export function isWriteMethod(method: string): boolean {
	return writes.has(method);
}

interface Pending {
	method: string;
	started: number;
	resolve(value: unknown): void;
	reject(error: AdsError): void;
	timer: ReturnType<typeof setTimeout>;
}
interface Watch {
	receive(event: StateEvent): void;
	fail(error: AdsErrorInit): void;
	sequence: number;
	epoch: number;
}

export class Transport {
	private readonly base: URL;
	private readonly origins: ReturnType<typeof originsForEnvironment>;
	private readonly timeout: number;
	private credentials: Credentials;
	private socketToken: string | undefined;
	private renewal:
		| {
				id: string;
				token: string;
				promise: Promise<void>;
				resolve: () => void;
				reject: (error: AdsError) => void;
				timer: ReturnType<typeof setTimeout>;
		  }
		| undefined;
	private closed = false;
	private ws: WebSocket | undefined;
	private ready = false;
	private connecting: Promise<void> | undefined;
	private connectionResolve: (() => void) | undefined;
	private connectionReject: ((error: AdsError) => void) | undefined;
	private connectTimer: ReturnType<typeof setTimeout> | undefined;
	private disconnectCurrent: ((error: AdsErrorInit) => void) | undefined;
	private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
	private retries = 0;
	private epoch = 0;
	/** Set by an authentication failure; a new token lifts it. `refused` is the token the service refused. */
	private authFailure: { refused?: string } | undefined;
	private pending = new Map<string, Pending>();
	private watches = new Map<string, Watch>();
	private httpControllers = new Set<AbortController>();
	constructor(private readonly options: NuvaClientOptions) {
		this.origins = originsForEnvironment(options?.environment);
		const agentOrigin = (options === undefined ? undefined : servicesOf(options).baseUrl) ?? this.origins.agent;
		if (agentOrigin === undefined)
			throw new TypeError(
				'Agent service origin is not configured in this unpublished preview. Supply baseUrl only for an explicitly configured development/test service.',
			);
		if (!agentOrigin) throw new TypeError('baseUrl must be a nonempty service URL.');
		this.base = new URL(agentOrigin.endsWith('/') ? agentOrigin : agentOrigin + '/');
		if (!['http:', 'https:'].includes(this.base.protocol) || this.base.username || this.base.password)
			throw new TypeError('A service HTTP(S) baseUrl without credentials is required.');
		this.timeout = options.requestTimeoutMs ?? 8000;
		if (!Number.isFinite(this.timeout) || this.timeout <= 0) throw new TypeError('requestTimeoutMs must be positive.');
		this.credentials = new Credentials(
			options,
			(credential) => {
				const failure = this.authFailure;
				if (failure) {
					// A new token for the same account (Credentials refuses a different one) lifts the failure.
					if (credential.token === failure.refused) return;
					this.authFailure = undefined;
					// After a refusal only an explicit call reconnects, so traffic cannot loop on a service that keeps refusing.
					if (failure.refused === undefined && this.watches.size && !this.closed) void this.connect().catch(() => {});
					return;
				}
				if (this.ready && this.socketToken !== credential.token) {
					const socket = this.ws,
						epoch = this.epoch;
					void this.reauthenticate(credential.token).catch((error) => {
						if (this.ws === socket && this.epoch === epoch && !this.closed) this.authenticationFailed(error);
					});
				}
			},
			(error) => this.authenticationFailed(error),
		);
	}
	private wire(trace: Omit<WireTraceEntry, 'at'>) {
		const observe = wireObserver(this.options);
		if (observe === undefined) return;
		try {
			const result = observe(frozen(structuredClone({ ...trace, at: Date.now() })));
			void Promise.resolve(result).catch(() => console.error('Nuva wire observer failed.'));
		} catch {
			console.error('Nuva wire observer failed.');
		}
	}
	private assertOpen() {
		if (this.closed)
			throw new AdsError({ code: 'CONNECTION_ERROR', message: 'This client is closed.', retryable: false, acceptance: 'not_accepted' });
	}
	private async token() {
		this.assertOpen();
		return (await this.credentials.get()).token;
	}
	/** `refused`: the token the service refused; it is dropped and never used to reconnect. */
	private authenticationFailed(error: AdsError, refused?: string) {
		const socket = this.ws;
		this.authFailure = refused === undefined ? {} : { refused };
		if (refused !== undefined) this.credentials.reject(refused);
		this.renewal?.reject(error);
		if (this.renewal) clearTimeout(this.renewal.timer);
		this.renewal = undefined;
		this.failConnection(error.toJSON());
		this.disconnectCurrent?.(error.toJSON());
		try {
			socket?.close(4001);
		} catch {
			/* Failure is already reported. */
		}
	}
	private async reauthenticate(token: string): Promise<void> {
		if (this.socketToken === token && this.ready) return;
		if (this.renewal) {
			await this.renewal.promise;
			if (this.socketToken === token) return;
		}
		const ws = this.ws;
		if (!this.ready || !ws || ws.readyState !== WebSocket.OPEN)
			throw new AdsError({
				code: 'UNAUTHENTICATED',
				message: 'Socket authentication unavailable.',
				retryable: false,
				acceptance: 'not_accepted',
			});
		const id = 'reauth-' + crypto.randomUUID();
		let resolve!: () => void, reject!: (e: AdsError) => void;
		const promise = new Promise<void>((yes, no) => {
			resolve = yes;
			reject = no;
		});
		// No acknowledgement is a connection failure, not a refusal: reconnect and authenticate afresh.
		const timer = setTimeout(() => {
			if (this.ws !== ws) return;
			this.disconnectCurrent?.({ code: 'CONNECTION_ERROR', message: 'Socket reauthentication was not acknowledged.', retryable: true });
			try {
				ws.close();
			} catch {
				/* Failure is already reported. */
			}
		}, this.timeout);
		this.renewal = { id, token, promise, resolve, reject, timer };
		this.wire({
			transport: 'websocket',
			direction: 'send',
			event: 'frame',
			data: JSON.stringify({ type: 'reauth', id, token: '[redacted]' }),
			redacted: true,
		});
		ws.send(JSON.stringify({ type: 'reauth', id, token }));
		return promise;
	}

	http<T>(method: string, params: unknown, id: string = crypto.randomUUID()): Promise<T> {
		return this.http_<T>(method, params, id).catch((error: unknown) => Promise.reject(withMethod(error, method)));
	}
	private async http_<T>(method: string, params: unknown, id: string): Promise<T> {
		this.assertOpen();
		const started = Date.now();
		const controller = new AbortController();
		this.httpControllers.add(controller);
		const timer = setTimeout(() => controller.abort(), this.timeout);
		let sent = false;
		try {
			const token = await Promise.race([
				this.token(),
				new Promise<never>((_, reject) =>
					controller.signal.addEventListener('abort', () => reject(new Error(this.closed ? 'Client closed.' : 'Request timed out.')), {
						once: true,
					}),
				),
			]);
			this.assertOpen();
			sent = true;
			const body = JSON.stringify({ id, method, params });
			this.wire({ transport: 'http', direction: 'send', event: 'frame', data: body });
			const response = await fetch(new URL('rpc', this.base), {
				method: 'POST',
				signal: controller.signal,
				headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
				body,
			});
			const responseBody = await response.text();
			this.wire({ transport: 'http', direction: 'receive', event: 'frame', data: responseBody, status: response.status });
			const frame = parseFrame(JSON.parse(responseBody));
			if (frame.type === 'error' && frame.id === id) {
				if (
					['UNAUTHENTICATED', 'UNAUTHORIZED'].includes(frame.error.code) &&
					(!writes.has(method) || frame.error.acceptance === 'not_accepted')
				) {
					this.credentials.reject(token);
					void this.credentials.get().catch(() => {});
				}
				throw new AdsError(frame.error);
			}
			if (!response.ok || frame.type !== 'result' || frame.id !== id)
				throw new AdsError({
					code: 'SERVICE_ERROR',
					message: 'Invalid API response.',
					retryable: false,
					...(writes.has(method) ? { acceptance: 'unknown' as const } : {}),
				});
			this.assertOpen();
			return frozen(frame.result as T);
		} catch (cause) {
			const error =
				cause instanceof AdsError
					? cause
					: new AdsError({
							code: 'CONNECTION_ERROR',
							message: cause instanceof Error ? cause.message : 'Request failed.',
							retryable: true,
							...(writes.has(method) ? { acceptance: sent ? ('unknown' as const) : ('not_accepted' as const) } : {}),
						});
			const reported = new AdsError({
				...initOf(error),
				requestId: id,
				...(writes.has(method) && acceptanceOf(error) === undefined
					? !sent
						? { acceptance: 'not_accepted' as const }
						: error.code === 'SERVICE_ERROR'
							? { acceptance: 'unknown' as const }
							: {}
					: {}),
			});
			throw reported;
		} finally {
			clearTimeout(timer);
			this.httpControllers.delete(controller);
		}
	}
	/**
	 * A Store or generation request. A write that takes an idempotency key always sends one: the caller's, or one made
	 * here. A request that is safe to repeat (a read, a keyed write, or a write that repeats to the same result) is sent
	 * again, with the same key, after a dropped connection or `SERVICE_BUSY`, at most twice; a timed-out one is not.
	 */
	async data<T>(method: string, params: unknown, id: string = crypto.randomUUID(), idempotencyKey?: string): Promise<T> {
		const key = idempotencyKey ?? (keyed.has(method) ? crypto.randomUUID() : undefined);
		const repeatable = !writes.has(method) || key !== undefined || sameWhenRepeated.has(method);
		for (let attempt = 0; ; attempt++) {
			try {
				return await this.dataOnce<T>(method, params, id, key);
			} catch (error) {
				const transient = error instanceof AdsError && !timeouts.has(error) && (error.code === 'CONNECTION_ERROR' || error.code === 'SERVICE_BUSY');
				if (!repeatable || !transient || attempt >= RETRIES || this.closed) throw error;
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * 3 ** attempt));
			}
		}
	}
	private async dataOnce<T>(method: string, params: unknown, id: string, idempotencyKey: string | undefined, authRetried = false): Promise<T> {
		this.assertOpen();
		if (idempotencyKey !== undefined && (!keyed.has(method) || !/^[\x21-\x7e]{1,200}$/.test(idempotencyKey)))
			throw new AdsError({
				code: 'INVALID_INPUT',
				message: keyed.has(method)
					? 'An idempotency key is 1–200 visible ASCII characters.'
					: `${method} takes no idempotency key.`,
				retryable: false,
				acceptance: 'not_accepted',
			});
		const route = dataRequest(method, params);
		const serviceBase = route.agent
			? this.base.origin
			: route.generation
				? (servicesOf(this.options).generationBaseUrl ??
					servicesOf(this.options).storeBaseUrl ??
					this.origins.generation ??
					(servicesOf(this.options).baseUrl === undefined ? undefined : this.base.origin))
				: (servicesOf(this.options).storeBaseUrl ?? this.origins.store);
		if (serviceBase === undefined)
			throw new AdsError({
				code: 'UNSUPPORTED_OPERATION',
				message: 'Generation service origin is not configured in this unpublished preview.',
				retryable: false,
				acceptance: 'not_accepted',
			});
		const base = new URL(serviceBase.endsWith('/') ? serviceBase : serviceBase + '/');
		if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password)
			throw new TypeError('storeBaseUrl must be an HTTP(S) URL without credentials.');
		const url = new URL(route.path.replace(/^\//, ''), base);
		for (const [key, value] of Object.entries(route.query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
		const controller = new AbortController();
		this.httpControllers.add(controller);
		// A Storyboard writes every clip's shots (and, first, its Script's treatments), and Prompts compile every clip, so both are given longer than a Script.
		const timeoutMs =
			this.options.requestTimeoutMs ??
			(method === 'storyboards.generate' || method === 'prompts.generate' ? 300000 : route.generation || method === 'assets.register' ? 180000 : this.timeout);
		let timedOut = false;
		const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
		let sent = false;
		try {
			const token = await Promise.race([
				this.token(),
				new Promise<never>((_, reject) =>
					controller.signal.addEventListener('abort', () => reject(new Error(this.closed ? 'Client closed.' : 'Request timed out.')), {
						once: true,
					}),
				),
			]);
			this.assertOpen();
			const body = route.body === undefined ? undefined : JSON.stringify(route.body);
			this.wire({
				transport: 'http',
				direction: 'send',
				event: 'frame',
				data: { method: route.method, path: url.pathname + url.search, body: route.body },
			});
			sent = true;
			const response = await fetch(url, {
				method: route.method,
				signal: controller.signal,
				headers: {
					Authorization: 'Bearer ' + token,
					'Content-Type': 'application/json',
					'X-Request-ID': id,
					'Nuva-Api-Version': API_VERSION,
					...(idempotencyKey === undefined ? {} : { 'Idempotency-Key': idempotencyKey }),
				},
				...(body === undefined ? {} : { body }),
			});
			const raw = await response.text();
			this.wire({ transport: 'http', direction: 'receive', event: 'frame', data: raw, status: response.status });
			// A delete answers No Content: there is no body to parse.
			if (route.method === 'DELETE' && response.status === 204) {
				this.assertOpen();
				return undefined as T;
			}
			let result: unknown;
			try {
				result = JSON.parse(raw);
			} catch {
				throw new AdsError({
					code: 'SERVICE_ERROR',
					message: 'Backend returned invalid JSON.',
					retryable: false,
					requestId: id,
					...(route.method === 'GET' ? {} : { acceptance: 'unknown' }),
				});
			}
			if (!response.ok) {
				const parsed = backendSchema('ErrorResponse').safeParse(result);
				if (!parsed.success)
					throw new AdsError({
						code: 'SERVICE_ERROR',
						message: 'Backend returned an invalid error response.',
						retryable: false,
						...(route.method === 'GET' ? {} : { acceptance: 'unknown' as const }),
						requestId: id,
					});
				const rawError = (result as { error: Record<string, unknown> }).error;
				const claimedAcceptance = rawError.acceptance;
				const authenticated401 = response.status === 401 && ['UNAUTHORIZED', 'UNAUTHENTICATED'].includes(parsed.data.error.code);
				const rejectedAuth = authenticated401 && claimedAcceptance === 'not_accepted';
				// A downstream authentication failure can arrive after a write. Only
				// an explicit pre-dispatch rejection authorizes replay; invalidating
				// the token alone merely prepares the next explicit caller request.
				if (authenticated401) this.credentials.reject(token);
				// A request safe to repeat (a read, a keyed write, one that repeats to the same result) is sent again once the token is renewed.
				const repeatable = route.method === 'GET' || idempotencyKey !== undefined || sameWhenRepeated.has(method);
				if (authenticated401 && !authRetried && (repeatable || rejectedAuth)) {
					return this.dataOnce<T>(method, params, id, idempotencyKey, true);
				}
				const info = {
					code: parsed.data.error.code,
					message: parsed.data.error.message,
					retryable: parsed.data.error.retryable,
					...(parsed.data.error.details === undefined ? {} : { details: parsed.data.error.details }),
					requestId: parsed.data.request_id,
					// A write's 4xx keeps the server's definite `not_accepted`, so callers know a retry is safe; anything else stays unknown.
					...(route.method !== 'GET' && response.status < 500 && response.status !== 408 && claimedAcceptance === 'not_accepted'
						? { acceptance: 'not_accepted' as const }
						: {}),
					...(route.method !== 'GET' && (response.status >= 500 || response.status === 408) ? { acceptance: 'unknown' as const } : {}),
					...(route.method !== 'GET' && claimedAcceptance !== undefined && claimedAcceptance !== 'not_accepted'
						? { acceptance: 'unknown' as const }
						: {}),
					...(route.method !== 'GET' && authenticated401
						? { acceptance: rejectedAuth ? ('not_accepted' as const) : ('unknown' as const) }
						: {}),
				};
				throw new AdsError(info);
			}
			this.assertOpen();
			return frozen(result as T);
		} catch (error) {
			if (error instanceof AdsError)
				throw new AdsError({ ...initOf(error), ...(route.method !== 'GET' && !sent ? { acceptance: 'not_accepted' as const } : {}) });
			const failed = new AdsError({
				code: 'CONNECTION_ERROR',
				message: timedOut
					? (sent && route.method !== 'GET' ? 'Request timed out; the operation may still complete. Retry with the same idempotencyKey.' : 'Request timed out.')
					: error instanceof Error ? error.message : 'Backend request failed.',
				retryable: true,
				requestId: id,
				...(route.method === 'GET' ? {} : { acceptance: sent ? 'unknown' : 'not_accepted' }),
			});
			if (timedOut) timeouts.add(failed);
			throw failed;
		} finally {
			clearTimeout(timer);
			this.httpControllers.delete(controller);
		}
	}
	async upload(url: string, file: File): Promise<void> {
		this.assertOpen();
		const target = new URL(url);
		if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new TypeError('Invalid upload URL.');
		const controller = new AbortController();
		this.httpControllers.add(controller);
		const timer = setTimeout(() => controller.abort(), this.options.requestTimeoutMs ?? 180000);
		try {
			const response = await fetch(target, {
				method: 'PUT',
				body: file,
				headers: { 'Content-Type': file.type },
				signal: controller.signal,
				redirect: 'error',
				credentials: 'omit',
			});
			if (!response.ok)
				throw new AdsError({ code: 'SERVICE_ERROR', message: 'Direct upload failed.', retryable: false, acceptance: 'unknown' });
		} catch (e) {
			if (e instanceof AdsError) throw e;
			throw new AdsError({
				code: 'CONNECTION_ERROR',
				message: 'Direct upload outcome is uncertain.',
				retryable: true,
				acceptance: 'unknown',
			});
		} finally {
			clearTimeout(timer);
			this.httpControllers.delete(controller);
		}
	}
	watch(sessionId: string, receive: Watch['receive'], fail: Watch['fail']) {
		const prior = this.watches.get(sessionId);
		this.watches.set(sessionId, { receive, fail, sequence: prior?.sequence ?? -1, epoch: prior?.epoch ?? -1 });
		void this.connect()
			.then(() => this.register(sessionId))
			.catch((error) => fail(errorInfo(error)));
		return () => {
			this.watches.delete(sessionId);
		};
	}
	private register(sessionId: string) {
		const watch = this.watches.get(sessionId);
		if (!watch || watch.epoch === this.epoch || !this.ready) return;
		watch.epoch = this.epoch;
		void this.socket('agent.subscribe', { sessionId, ...(watch.sequence < 0 ? {} : { afterSequence: watch.sequence }) }).catch((error) =>
			watch.fail(errorInfo(error)),
		);
	}
	/** Never throws: callers chain on the promise, including timers. */
	private connect(): Promise<void> {
		if (this.closed)
			return Promise.reject(
				new AdsError({ code: 'CONNECTION_ERROR', message: 'This client is closed.', retryable: false, acceptance: 'not_accepted' }),
			);
		if (this.authFailure)
			return Promise.reject(
				new AdsError({
					code: 'UNAUTHENTICATED',
					message: 'Socket authentication failed; the client reconnects once getAccessToken returns a new valid token.',
					retryable: false,
					acceptance: 'not_accepted',
				}),
			);
		if (this.ready && this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
		if (this.connecting) return this.connecting;
		clearTimeout(this.reconnectTimer);
		const url = new URL('agent', this.base);
		url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
		const ws = new WebSocket(url);
		let protocolFailure: AdsErrorInit | undefined;
		this.ws = ws;
		const epoch = ++this.epoch;
		let ended = false;
		const current = () => !ended && !this.closed && this.ws === ws && this.epoch === epoch;
		this.connecting = new Promise((resolve, reject) => {
			this.connectionResolve = resolve;
			this.connectionReject = reject;
		});
		const connected = this.connecting;
		const terminate = (error: AdsErrorInit) => {
			if (!current()) return;
			ended = true;
			this.ws = undefined;
			this.disconnectCurrent = undefined;
			this.ready = false;
			this.socketToken = undefined;
			clearTimeout(this.connectTimer);
			if (this.renewal) {
				clearTimeout(this.renewal.timer);
				this.renewal.reject(new AdsError({ ...error, acceptance: 'not_accepted' }));
				this.renewal = undefined;
			}
			if ((!this.authFailure && !protocolFailure) || this.connecting !== undefined) this.failConnection(error);
			for (const [id, pending] of this.pending) {
				clearTimeout(pending.timer);
				const failure = new AdsError({
					...error,
					requestId: id,
					...(writes.has(pending.method) ? { acceptance: 'unknown' as const } : {}),
				});
				pending.reject(failure);
			}
			this.pending.clear();
			if (!this.closed && !this.authFailure && !protocolFailure && this.watches.size && this.epoch === epoch)
				this.reconnectTimer = setTimeout(
					() => {
						if (!this.closed && this.epoch === epoch && this.ws === undefined) void this.connect().catch(() => {});
					},
					Math.min(250 * 2 ** this.retries++, 2000),
				);
		};
		this.disconnectCurrent = terminate;
		const closeSocket = () => {
			try {
				ws.close();
			} catch {
				/* Settlement never depends on close events. */
			}
		};
		this.connectTimer = setTimeout(() => {
			terminate({ code: 'CONNECTION_ERROR', message: 'Socket connection was not acknowledged before the deadline.', retryable: true });
			closeSocket();
		}, this.timeout);
		ws.onopen = () => {
			if (!current()) return;
			this.wire({ transport: 'websocket', direction: 'connection', event: 'open', data: null });
			void this.token()
				.then((token) => {
					if (current() && ws.readyState === WebSocket.OPEN) {
						this.wire({
							transport: 'websocket',
							direction: 'send',
							event: 'frame',
							data: JSON.stringify({ type: 'auth', token: '[redacted]' }),
							redacted: true,
						});
						this.socketToken = token;
						ws.send(JSON.stringify({ type: 'auth', token }));
					}
				})
				.catch((error) => {
					if (!current()) return;
					this.authenticationFailed(new AdsError(errorInfo(error)));
				});
		};
		ws.onmessage = (event) => {
			if (!current()) return;
			this.wire({ transport: 'websocket', direction: 'receive', event: 'frame', data: String(event.data) });
			if (protocolFailure) return;
			let frame: ServerFrame;
			try {
				frame = parseFrame(JSON.parse(String(event.data)));
			} catch {
				protocolFailure = { code: 'UNSUPPORTED_CONTENT', message: 'Invalid socket message.', retryable: false };
				this.failConnection(protocolFailure);
				terminate(protocolFailure);
				closeSocket();
				return;
			}
			if (frame.type === 'reauthenticated') {
				const renewal = this.renewal;
				if (!renewal || renewal.id !== frame.id) {
					protocolFailure = { code: 'UNSUPPORTED_CONTENT', message: 'Unexpected socket authentication acknowledgement.', retryable: false };
					this.failConnection(protocolFailure);
					terminate(protocolFailure);
					closeSocket();
					return;
				}
				clearTimeout(renewal.timer);
				this.socketToken = renewal.token;
				this.renewal = undefined;
				renewal.resolve();
				return;
			}
			if (frame.type === 'error' && this.renewal?.id === frame.id) {
				if (refusal(frame.error.code, true))
					this.authenticationFailed(new AdsError({ ...frame.error, acceptance: 'not_accepted' }), this.renewal.token);
				else {
					terminate(frame.error);
					closeSocket();
				}
				return;
			}
			if (frame.type === 'ready') {
				this.ready = true;
				this.retries = 0;
				clearTimeout(this.connectTimer);
				this.connectionResolve?.();
				this.connectionResolve = undefined;
				this.connectionReject = undefined;
				this.connecting = undefined;
				for (const id of this.watches.keys()) this.register(id);
				return;
			}
			if (frame.type === 'state') {
				const watch = this.watches.get(frame.sessionId);
				if (!watch || frame.sequence < watch.sequence) return;
				watch.sequence = frame.sequence;
				watch.receive(frozen(frame));
				return;
			}
			if (frame.type === 'error' && frame.id === 'auth') {
				if (refusal(frame.error.code, false)) this.authenticationFailed(new AdsError(frame.error), this.socketToken);
				else {
					// The token could not be checked (`SERVICE_BUSY`) or the gateway failed: reconnect with backoff, same token.
					terminate(frame.error);
					closeSocket();
				}
				return;
			}
			if (frame.type !== 'result' && frame.type !== 'error') {
				protocolFailure = { code: 'UNSUPPORTED_CONTENT', message: 'Unknown socket event.', retryable: false };
				this.failConnection(protocolFailure);
				terminate(protocolFailure);
				closeSocket();
				return;
			}
			const pending = this.pending.get(frame.id);
			if (!pending) return;
			this.pending.delete(frame.id);
			clearTimeout(pending.timer);
			if (frame.type === 'error') {
				if (
					['UNAUTHENTICATED', 'UNAUTHORIZED'].includes(frame.error.code) &&
					(!writes.has(pending.method) || frame.error.acceptance === 'not_accepted') &&
					this.socketToken
				) {
					this.credentials.reject(this.socketToken);
					void this.credentials.get().catch(() => {});
				}
				const error = new AdsError({ ...frame.error, requestId: frame.id });
				pending.reject(error);
			} else {
				pending.resolve(frozen(frame.result));
			}
		};
		ws.onerror = () => {
			if (!current()) return;
			this.wire({ transport: 'websocket', direction: 'connection', event: 'error', data: { message: 'WebSocket transport error.' } });
			terminate({ code: 'CONNECTION_ERROR', message: 'WebSocket connection failed; retaining the last saved state.', retryable: true });
			closeSocket();
		};
		ws.onclose = (event) => {
			if (!current()) return;
			this.wire({
				transport: 'websocket',
				direction: 'connection',
				event: 'close',
				data: { code: event.code, reason: event.reason, wasClean: event.wasClean },
			});
			terminate(
				protocolFailure ?? {
					code: 'CONNECTION_ERROR',
					message: 'Connection interrupted; retaining the last saved state.',
					retryable: true,
				},
			);
		};
		return connected;
	}
	private failConnection(info: AdsErrorInit) {
		this.connectionReject?.(new AdsError(info));
		this.connecting = undefined;
		this.connectionResolve = undefined;
		this.connectionReject = undefined;
		if (!this.closed) for (const watch of this.watches.values()) watch.fail(info);
	}
	socket<T>(method: string, params: unknown, id: string = crypto.randomUUID()): Promise<T> {
		return this.socket_<T>(method, params, id).catch((error: unknown) => Promise.reject(withMethod(error, method)));
	}
	private async socket_<T>(method: string, params: unknown, id: string): Promise<T> {
		this.assertOpen();
		const started = Date.now();
		try {
			// After an auth failure, an explicit call fetches a token; a new one lifts the failure.
			if (this.authFailure) await this.token();
			await this.connect();
			await this.reauthenticate(await this.token());
		} catch (error) {
			throw new AdsError({ ...errorInfo(error), requestId: id, ...(writes.has(method) ? { acceptance: 'not_accepted' as const } : {}) });
		}
		this.assertOpen();
		const ws = this.ws;
		if (!ws || ws.readyState !== WebSocket.OPEN)
			throw new AdsError({
				code: 'CONNECTION_ERROR',
				message: 'Not connected.',
				retryable: true,
				requestId: id,
				acceptance: 'not_accepted',
			});
		if (this.pending.has(id))
			throw new AdsError({ code: 'REQUEST_ID_CONFLICT', message: 'This request is already in flight.', retryable: false, requestId: id });
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				const error = new AdsError({
					code: 'CONNECTION_ERROR',
					message: 'No acknowledgement received. Inspect saved state before explicitly deciding whether to retry.',
					retryable: true,
					requestId: id,
					...(writes.has(method) ? { acceptance: 'unknown' as const } : {}),
				});
				reject(error);
			}, this.timeout);
			this.pending.set(id, { method, started, resolve: (value) => resolve(value as T), reject, timer });
			const body = JSON.stringify({ id, method, params });
			this.wire({ transport: 'websocket', direction: 'send', event: 'frame', data: body });
			ws.send(body);
		});
	}
	close() {
		this.closed = true;
		this.credentials.close();
		this.failConnection({
			code: 'CONNECTION_ERROR',
			message: 'Client closed before connection acknowledgement.',
			retryable: false,
			acceptance: 'not_accepted',
		});
		this.disconnectCurrent = undefined;
		this.ready = false;
		this.socketToken = undefined;
		if (this.renewal) {
			clearTimeout(this.renewal.timer);
			this.renewal.reject(
				new AdsError({ code: 'CONNECTION_ERROR', message: 'Client closed.', retryable: false, acceptance: 'not_accepted' }),
			);
			this.renewal = undefined;
		}
		for (const controller of this.httpControllers) controller.abort();
		this.httpControllers.clear();
		clearTimeout(this.reconnectTimer);
		clearTimeout(this.connectTimer);
		this.watches.clear();
		const socket = this.ws;
		this.ws = undefined;
		try {
			socket?.close();
		} catch {
			/* Pending waits are rejected independently. */
		}
		for (const [id, p] of this.pending) {
			clearTimeout(p.timer);
			p.reject(
				new AdsError({
					code: 'CONNECTION_ERROR',
					message: 'Client closed before acknowledgement.',
					retryable: false,
					requestId: id,
					acceptance: 'unknown',
				}),
			);
		}
		this.pending.clear();
	}
}
