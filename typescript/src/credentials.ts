import { z } from 'zod';
import { AdsError } from './errors.js';
import type { AccessToken, NuvaClientOptions } from './types.js';
export interface Credential {
	readonly token: string;
	readonly expiresAt?: number;
	readonly refreshAt?: number;
}
/** One provider invocation per refresh wave. Timers are an optimization; every
 * request checks the clock again, including after browser sleep.
 *
 * A failed early refresh keeps the current token while it is unexpired and the
 * service has not rejected it, and retries with backoff (at least 1 s apart) until it expires. */
export class Credentials {
	private cached: Credential | undefined;
	private principal: AccessToken['principal'];
	private identityFailed = false;
	private flight: Promise<Credential> | undefined;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private closed = false;
	private generation = 0;
	private failures = 0;
	private readonly skew: number;
	constructor(
		private options: NuvaClientOptions,
		private changed: (credential: Credential) => void,
		private failed: (error: AdsError) => void,
	) {
		this.skew = options.tokenRefreshSkewMs ?? 30_000;
		if (!Number.isFinite(this.skew) || this.skew < 0) throw new TypeError('tokenRefreshSkewMs must be nonnegative.');
	}
	async get(): Promise<Credential> {
		if (this.closed)
			throw new AdsError({ code: 'CONNECTION_ERROR', message: 'Client closed.', retryable: false, acceptance: 'not_accepted' });
		if (this.identityFailed)
			throw new AdsError({
				code: 'UNAUTHENTICATED',
				message: 'Token principal changed; create a new client for the new account.',
				retryable: false,
				acceptance: 'not_accepted',
			});
		if (this.cached?.refreshAt !== undefined && Date.now() < this.cached.refreshAt) return this.cached;
		if (this.flight) return this.flight;
		const generation = ++this.generation;
		this.flight = this.refresh(generation);
		try {
			return await this.flight;
		} finally {
			if (this.generation === generation) this.flight = undefined;
		}
	}
	private async refresh(generation: number): Promise<Credential> {
		let timeout: ReturnType<typeof setTimeout> | undefined;
		try {
			const value = await Promise.race([
				this.options.getAccessToken(),
				new Promise<never>((_, reject) => {
					timeout = setTimeout(() => reject(new Error('timeout')), this.options.requestTimeoutMs ?? 8000);
				}),
			]);
			if (this.closed || generation !== this.generation) throw new Error('closed');
			let credential: Credential;
			if (typeof value === 'string') {
				if (this.principal) {
					this.identityFailed = true;
					throw new Error('principal metadata removed');
				}
				if (!value || /[\r\n]/.test(value)) throw new Error('empty or invalid');
				// No expiry metadata: deliberately do not cache or schedule proactive renewal.
				credential = { token: value };
			} else {
				if (!value || typeof value.token !== 'string' || !value.token || /[\r\n]/.test(value.token)) throw new Error('invalid');
				const expiry =
					typeof value.expiresAt === 'number'
						? value.expiresAt
						: typeof value.expiresAt === 'string' && z.iso.datetime({ offset: true }).safeParse(value.expiresAt).success
							? Date.parse(value.expiresAt)
							: NaN;
				const now = Date.now();
				if (!Number.isFinite(expiry) || expiry <= now) throw new Error('expired');
				if (this.principal && value.principal === undefined) {
					this.identityFailed = true;
					throw new Error('principal metadata removed');
				}
				if (value.principal !== undefined) {
					if (
						typeof value.principal.customerId !== 'string' ||
						!value.principal.customerId ||
						typeof value.principal.userId !== 'string' ||
						!value.principal.userId
					)
						throw new Error('invalid principal');
					if (
						this.principal &&
						(this.principal.customerId !== value.principal.customerId || this.principal.userId !== value.principal.userId)
					) {
						this.identityFailed = true;
						throw new Error('principal changed');
					}
					this.principal = { ...value.principal };
				}
				const margin = Math.min(this.skew, (expiry - now) / 2);
				credential = { token: value.token, expiresAt: expiry, refreshAt: expiry - margin };
			}
			this.cached = credential;
			this.failures = 0;
			clearTimeout(this.timer);
			this.schedule(credential);
			this.changed(credential);
			return credential;
		} catch {
			clearTimeout(this.timer);
			const current = this.cached,
				now = Date.now();
			if (
				current?.expiresAt !== undefined &&
				now < current.expiresAt &&
				!this.closed &&
				!this.identityFailed &&
				generation === this.generation
			) {
				// Early refresh failed but the token still works: keep it and retry, at least 1 s apart, until it expires.
				const delay = Math.max(1000, Math.min(1000 * 2 ** this.failures++, 30_000, (current.expiresAt - now) / 2));
				this.cached = { ...current, refreshAt: Math.min(now + delay, current.expiresAt) };
				this.schedule(this.cached);
				return this.cached;
			}
			this.cached = undefined;
			const error = new AdsError({
				code: 'UNAUTHENTICATED',
				message: this.identityFailed
					? 'Token principal changed; create a new client for the new account.'
					: 'Access token refresh failed. Sign in again or retry explicitly.',
				retryable: false,
				acceptance: 'not_accepted',
			});
			if (!this.closed) this.failed(error);
			throw error;
		} finally {
			clearTimeout(timeout);
		}
	}
	private schedule(credential: Credential) {
		clearTimeout(this.timer);
		if (this.closed || credential.refreshAt === undefined) return;
		this.timer = setTimeout(
			() => {
				if (this.closed) return;
				if (this.cached === credential && Date.now() < credential.refreshAt!) this.schedule(credential);
				else
					void this.get().catch(() => {
						/* surfaced through failed */
					});
			},
			Math.max(1, Math.min(2147483647, credential.refreshAt - Date.now())),
		);
		(this.timer as unknown as { unref?: () => void }).unref?.();
	}

	/** A delayed rejection of an older token must not evict a newer refresh. */
	reject(token: string) {
		if (this.cached?.token === token) {
			this.cached = undefined;
			clearTimeout(this.timer);
		}
	}

	close() {
		this.closed = true;
		this.generation++;
		clearTimeout(this.timer);
		this.cached = undefined;
		this.flight = undefined;
	}
}
