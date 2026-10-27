import { originsForEnvironment } from './environments.js';
import { Credentials } from './credentials.js';
import { parseFrame } from './wire-schema.js';
import { NuvaError, PartialCreationError, errorInfo } from './errors.js';
import { frozen } from './protocol.js';
import type { ServerFrame, StateEvent, TraceEntry, WireTraceEntry } from './protocol.js';
import type { NuvaClientOptions, NuvaErrorInfo } from './types.js';
import { dataRequest } from './data-routes.js';
import { backendSchema } from './backend-schema.js';

const writes = new Set([
	'artifacts.create',
	'artifacts.update',
	'assets.register',
	'assets.uploadIntent',
	'ads.create',
	'batches.create',
	'batches.appendLog',
	'brands.create',
	'brands.update',
	'characters.create',
	'characters.update',
	'ads.update',
	'ads.registerFinalVideo',
	'ads.submitMapping',
	'videos.generate',
	'prompts.generate',
	'products.create',
	'products.update',
	'scripts.generate',
	'scripts.update',
	'agent.send',
	'agent.stop',
	'agent.respond',
	'agent.fail',
]);
export function isWriteMethod(method: string): boolean {
	return writes.has(method);
}

interface Pending {
	method: string;
	started: number;
	resolve(value: unknown): void;
	reject(error: NuvaError): void;
	timer: ReturnType<typeof setTimeout>;
}
interface Watch {
	receive(event: StateEvent): void;
	fail(error: NuvaErrorInfo): void;
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
				reject: (error: NuvaError) => void;
				timer: ReturnType<typeof setTimeout>;
		  }
		| undefined;
	private closed = false;
	private ws: WebSocket | undefined;
	private ready = false;
	private connecting: Promise<void> | undefined;
	private connectionResolve: (() => void) | undefined;
	private connectionReject: ((error: NuvaError) => void) | undefined;
	private connectTimer: ReturnType<typeof setTimeout> | undefined;
	private disconnectCurrent: ((error: NuvaErrorInfo) => void) | undefined;
	private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
	private retries = 0;
	private epoch = 0;
	private authFailed = false;
	private pending = new Map<string, Pending>();
	private watches = new Map<string, Watch>();
	private httpControllers = new Set<AbortController>();
	constructor(private readonly options: NuvaClientOptions) {
		this.origins = originsForEnvironment(options?.environment);
		const agentOrigin = options?.baseUrl ?? this.origins.agent;
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
	private trace(trace: TraceEntry) {
		try {
			this.options.onTrace?.(frozen(structuredClone(trace)));
		} catch (error) {
			console.error('Nuva trace listener failed', error);
		}
	}
	private wire(trace: Omit<WireTraceEntry, 'at'>) {
		if (this.options.onWireTrace === undefined) return;
		try {
			const result = this.options.onWireTrace(frozen(structuredClone({ ...trace, at: Date.now() })));
			void Promise.resolve(result).catch(() => console.error('Nuva wire observer failed.'));
		} catch {
			console.error('Nuva wire observer failed.');
		}
	}
	private assertOpen() {
		if (this.closed)
			throw new NuvaError({ code: 'CONNECTION_ERROR', message: 'This client is closed.', retryable: false, acceptance: 'not_accepted' });
	}
	private async token() {
		this.assertOpen();
		return (await this.credentials.get()).token;
	}
	private authenticationFailed(error: NuvaError) {
		const socket = this.ws;
		this.authFailed = true;
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
			throw new NuvaError({
				code: 'UNAUTHENTICATED',
				message: 'Socket authentication unavailable.',
				retryable: false,
				acceptance: 'not_accepted',
			});
		const id = 'reauth-' + crypto.randomUUID();
		let resolve!: () => void, reject!: (e: NuvaError) => void;
		const promise = new Promise<void>((yes, no) => {
			resolve = yes;
			reject = no;
		});
		const timer = setTimeout(
			() =>
				this.authenticationFailed(
					new NuvaError({
						code: 'UNAUTHENTICATED',
						message: 'Socket reauthentication was not acknowledged.',
						retryable: false,
						acceptance: 'not_accepted',
					}),
				),
			this.timeout,
		);
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

	async http<T>(method: string, params: unknown, id: string = crypto.randomUUID()): Promise<T> {
		this.assertOpen();
		const started = Date.now();
		this.trace({ id, method, transport: 'http', phase: 'request', at: started, data: params });
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
				throw new NuvaError(frame.error);
			}
			if (!response.ok || frame.type !== 'result' || frame.id !== id)
				throw new NuvaError({
					code: 'SERVICE_ERROR',
					message: 'Invalid API response.',
					retryable: false,
					...(writes.has(method) ? { acceptance: 'unknown' as const } : {}),
				});
			this.assertOpen();
			this.trace({ id, method, transport: 'http', phase: 'result', at: Date.now(), durationMs: Date.now() - started, data: frame.result });
			return frozen(frame.result as T);
		} catch (cause) {
			const error =
				cause instanceof NuvaError
					? cause
					: new NuvaError({
							code: 'CONNECTION_ERROR',
							message: cause instanceof Error ? cause.message : 'Request failed.',
							retryable: true,
							...(writes.has(method) ? { acceptance: sent ? ('unknown' as const) : ('not_accepted' as const) } : {}),
						});
			const reported = new NuvaError({
				...error.toJSON(),
				requestId: id,
				...(writes.has(method) && error.acceptance === undefined
					? !sent
						? { acceptance: 'not_accepted' as const }
						: error.code === 'SERVICE_ERROR'
							? { acceptance: 'unknown' as const }
							: {}
					: {}),
			});
			this.trace({
				id,
				method,
				transport: 'http',
				phase: 'error',
				at: Date.now(),
				durationMs: Date.now() - started,
				data: reported.toJSON(),
			});
			throw reported;
		} finally {
			clearTimeout(timer);
			this.httpControllers.delete(controller);
		}
	}
	async data<T>(
		method: string,
		params: unknown,
		id: string = crypto.randomUUID(),
		idempotencyKey?: string,
		authRetried = false,
	): Promise<T> {
		this.assertOpen();
		if (
			idempotencyKey !== undefined &&
			(!['scripts.generate', 'prompts.generate', 'videos.generate', 'artifacts.create', 'artifacts.update'].includes(
				method,
			) ||
				!/^[\x21-\x7e]{1,200}$/.test(idempotencyKey))
		)
			throw new NuvaError({
				code: 'INVALID_INPUT',
				message: 'An operation key must contain 1–200 visible ASCII characters.',
				retryable: false,
				acceptance: 'not_accepted',
			});
		const route = dataRequest(method, params);
		const serviceBase = route.agent
			? this.base.origin
			: route.generation
				? (this.options.generationBaseUrl ??
					this.options.storeBaseUrl ??
					this.origins.generation ??
					(this.options.baseUrl === undefined ? undefined : this.base.origin))
				: (this.options.storeBaseUrl ?? this.origins.store);
		if (serviceBase === undefined)
			throw new NuvaError({
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
		const timeoutMs = this.options.requestTimeoutMs ?? (route.generation || method === 'assets.register' ? 180000 : this.timeout);
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
					...(idempotencyKey === undefined ? {} : { 'Idempotency-Key': idempotencyKey }),
				},
				...(body === undefined ? {} : { body }),
			});
			const raw = await response.text();
			this.wire({ transport: 'http', direction: 'receive', event: 'frame', data: raw, status: response.status });
			let result: unknown;
			try {
				result = JSON.parse(raw);
			} catch {
				throw new NuvaError({
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
					throw new NuvaError({
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
				if (authenticated401 && !authRetried && (route.method === 'GET' || rejectedAuth)) {
					return this.data<T>(method, params, id, idempotencyKey, true);
				}
				const info = {
					code: parsed.data.error.code,
					message: parsed.data.error.message,
					retryable: parsed.data.error.retryable,
					...(parsed.data.error.details === undefined ? {} : { details: parsed.data.error.details }),
					requestId: parsed.data.request_id,
					...(route.method !== 'GET' && (response.status >= 500 || response.status === 408) ? { acceptance: 'unknown' as const } : {}),
					...(route.method !== 'GET' && claimedAcceptance !== undefined && claimedAcceptance !== 'not_accepted'
						? { acceptance: 'unknown' as const }
						: {}),
					...(route.method !== 'GET' && authenticated401
						? { acceptance: rejectedAuth ? ('not_accepted' as const) : ('unknown' as const) }
						: {}),
				};
				if (method === 'prompts.generate' && info.code === 'PARTIAL_CREATION')
					throw new PartialCreationError(
						info,
						typeof result === 'object' && result !== null && 'saved' in result ? result.saved : undefined,
					);
				throw new NuvaError(info);
			}
			this.assertOpen();
			return frozen(result as T);
		} catch (error) {
			if (error instanceof PartialCreationError) throw error;
			if (error instanceof NuvaError)
				throw new NuvaError({ ...error.toJSON(), ...(route.method !== 'GET' && !sent ? { acceptance: 'not_accepted' as const } : {}) });
			throw new NuvaError({
				code: 'CONNECTION_ERROR',
				message: timedOut
					? (sent && route.method !== 'GET' ? 'Request timed out; the operation may still complete. Inspect its result before retrying.' : 'Request timed out.')
					: error instanceof Error ? error.message : 'Backend request failed.',
				retryable: true,
				requestId: id,
				...(route.method === 'GET' ? {} : { acceptance: sent ? 'unknown' : 'not_accepted' }),
			});
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
				throw new NuvaError({ code: 'SERVICE_ERROR', message: 'Direct upload failed.', retryable: false, acceptance: 'unknown' });
		} catch (e) {
			if (e instanceof NuvaError) throw e;
			throw new NuvaError({
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
	private connect(): Promise<void> {
		this.assertOpen();
		if (this.authFailed)
			throw new NuvaError({
				code: 'UNAUTHENTICATED',
				message: 'Socket authentication failed; create a new client after signing in.',
				retryable: false,
				acceptance: 'not_accepted',
			});
		if (this.ready && this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
		if (this.connecting) return this.connecting;
		clearTimeout(this.reconnectTimer);
		const url = new URL('agent', this.base);
		url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
		const ws = new WebSocket(url);
		let protocolFailure: NuvaErrorInfo | undefined;
		this.ws = ws;
		this.authFailed = false;
		const epoch = ++this.epoch;
		let ended = false;
		const current = () => !ended && !this.closed && this.ws === ws && this.epoch === epoch;
		this.connecting = new Promise((resolve, reject) => {
			this.connectionResolve = resolve;
			this.connectionReject = reject;
		});
		const connected = this.connecting;
		const terminate = (error: NuvaErrorInfo) => {
			if (!current()) return;
			ended = true;
			this.ws = undefined;
			this.disconnectCurrent = undefined;
			this.ready = false;
			this.socketToken = undefined;
			clearTimeout(this.connectTimer);
			if (this.renewal) {
				clearTimeout(this.renewal.timer);
				this.renewal.reject(new NuvaError({ ...error, acceptance: 'not_accepted' }));
				this.renewal = undefined;
			}
			if ((!this.authFailed && !protocolFailure) || this.connecting !== undefined) this.failConnection(error);
			for (const [id, pending] of this.pending) {
				clearTimeout(pending.timer);
				const failure = new NuvaError({
					...error,
					requestId: id,
					...(writes.has(pending.method) ? { acceptance: 'unknown' as const } : {}),
				});
				this.trace({ id, method: pending.method, transport: 'websocket', phase: 'error', at: Date.now(), data: failure.toJSON() });
				pending.reject(failure);
			}
			this.pending.clear();
			if (!this.closed && !this.authFailed && !protocolFailure && this.watches.size && this.epoch === epoch)
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
					this.authenticationFailed(new NuvaError(errorInfo(error)));
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
					this.authenticationFailed(
						new NuvaError({
							code: 'UNAUTHENTICATED',
							message: 'Unexpected socket authentication acknowledgement.',
							retryable: false,
							acceptance: 'not_accepted',
						}),
					);
					return;
				}
				clearTimeout(renewal.timer);
				this.socketToken = renewal.token;
				this.renewal = undefined;
				renewal.resolve();
				return;
			}
			if (frame.type === 'error' && this.renewal?.id === frame.id) {
				this.authenticationFailed(new NuvaError({ ...frame.error, acceptance: 'not_accepted' }));
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
				this.trace({
					id: 'event-' + frame.sequence + '-' + frame.sessionId,
					method: 'agent.state',
					transport: 'websocket',
					phase: 'event',
					at: Date.now(),
					data: frame,
				});
				watch.receive(frozen(frame));
				return;
			}
			if (frame.type === 'error' && frame.id === 'auth') {
				this.authenticationFailed(new NuvaError(frame.error));
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
				const error = new NuvaError({ ...frame.error, requestId: frame.id });
				this.trace({
					id: frame.id,
					method: pending.method,
					transport: 'websocket',
					phase: 'error',
					at: Date.now(),
					durationMs: Date.now() - pending.started,
					data: error.toJSON(),
				});
				pending.reject(error);
			} else {
				this.trace({
					id: frame.id,
					method: pending.method,
					transport: 'websocket',
					phase: 'result',
					at: Date.now(),
					durationMs: Date.now() - pending.started,
					data: frame.result,
				});
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
	private failConnection(info: NuvaErrorInfo) {
		this.connectionReject?.(new NuvaError(info));
		this.connecting = undefined;
		this.connectionResolve = undefined;
		this.connectionReject = undefined;
		if (!this.closed) for (const watch of this.watches.values()) watch.fail(info);
	}
	async socket<T>(method: string, params: unknown, id: string = crypto.randomUUID()): Promise<T> {
		this.assertOpen();
		const started = Date.now();
		try {
			await this.connect();
			await this.reauthenticate(await this.token());
		} catch (error) {
			throw new NuvaError({ ...errorInfo(error), requestId: id, ...(writes.has(method) ? { acceptance: 'not_accepted' as const } : {}) });
		}
		this.assertOpen();
		const ws = this.ws;
		if (!ws || ws.readyState !== WebSocket.OPEN)
			throw new NuvaError({
				code: 'CONNECTION_ERROR',
				message: 'Not connected.',
				retryable: true,
				requestId: id,
				acceptance: 'not_accepted',
			});
		if (this.pending.has(id))
			throw new NuvaError({ code: 'REQUEST_ID_CONFLICT', message: 'This request is already in flight.', retryable: false, requestId: id });
		this.trace({ id, method, transport: 'websocket', phase: 'request', at: started, data: params });
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				const error = new NuvaError({
					code: 'CONNECTION_ERROR',
					message: 'No acknowledgement received. Inspect saved state before explicitly deciding whether to retry.',
					retryable: true,
					requestId: id,
					...(writes.has(method) ? { acceptance: 'unknown' as const } : {}),
				});
				this.trace({ id, method, transport: 'websocket', phase: 'error', at: Date.now(), data: error.toJSON() });
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
				new NuvaError({ code: 'CONNECTION_ERROR', message: 'Client closed.', retryable: false, acceptance: 'not_accepted' }),
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
				new NuvaError({
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
