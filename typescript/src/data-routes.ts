import { backendIdSchema } from './backend-id.js';
import { AdsError } from './errors.js';
import type { ShareableKind } from './stores.js';

export const SHAREABLE_KINDS: readonly ShareableKind[] = ['brand', 'product', 'character', 'asset', 'script', 'storyboard', 'prompt'];
/** Existing backend DTOs are passed unchanged. Generation writers use a separate service. */
export function dataRequest(
	method: string,
	value: unknown,
): { method: string; path: string; body?: unknown; query?: Record<string, unknown>; generation?: boolean; agent?: boolean } {
	const p = value as Record<string, unknown>;
	const id = (v: unknown) => {
		if (typeof v !== 'string' || !v) throw new TypeError('A resource ID is required.');
		return encodeURIComponent(v);
	};
	const resourceId = (value: unknown) => {
		const parsed = backendIdSchema.safeParse(value);
		if (!parsed.success)
			throw new AdsError({
				code: 'INVALID_INPUT',
				message: 'A canonical backend resource ID is required.',
				retryable: false,
				acceptance: 'not_accepted',
			});
		return encodeURIComponent(parsed.data);
	};
	// Known backend artifacts have OrderedUUID IDs. Explicit custom codecs retain their
	// declared opaque identifier contract; an invalid known ID never falls back to it.
	const artifactId = (kind: string, value: unknown) =>
		['script', 'storyboard', 'prompt'].includes(kind) ? resourceId(value) : id(value);
	const [collection, action] = method.split('.');
	if (collection === 'shares') {
		const invalid = (message: string) => new AdsError({ code: 'INVALID_INPUT', message, retryable: false, acceptance: 'not_accepted' });
		const item = p.item as { kind?: unknown; id?: unknown } | undefined;
		if (!SHAREABLE_KINDS.includes(item?.kind as ShareableKind)) throw invalid(`A share is for one of: ${SHAREABLE_KINDS.join(', ')}.`);
		const base = `/v1/shares/${item!.kind as string}/${resourceId(typeof item!.id === 'string' ? item!.id.toLowerCase() : item!.id)}`;
		if (action === 'list') return { method: 'GET', path: base };
		// `customer`, or an org's or group's external ID: 1–255 characters, no control characters or '/', and not '.' or
		// '..', which would change the request path.
		const scope = p.scope;
		if (typeof scope !== 'string' || scope === '.' || scope === '..' || !/^[^\x00-\x1f\x7f/]{1,255}$/.test(scope)) throw invalid('A scope is required: customer, or an org or group external ID.');
		if (action === 'set') {
			if (p.access !== 'read' && p.access !== 'write') throw invalid('access must be read or write.');
			return { method: 'PUT', path: `${base}/${encodeURIComponent(scope)}`, body: { access: p.access } };
		}
		if (action === 'remove') return { method: 'DELETE', path: `${base}/${encodeURIComponent(scope)}` };
	}
	if (collection === 'artifacts') {
		const ref = p.ref as { kind: string; id: string } | undefined;
		if (action === 'get') return { method: 'GET', path: `/v1/artifacts/${id(ref!.kind)}/${artifactId(ref!.kind, ref!.id)}` };
	}
	if (method === 'prompts.createFrom') {
		const { ref, ...body } = p as { ref: { id: string } };
		return { method: 'POST', path: `/v1/artifacts/prompt/${resourceId(ref.id)}/versions`, body };
	}
	if (method === 'jobs.cancel') return { method: 'POST', path: `/v1/jobs/${resourceId(p.id)}/cancel` };
	if (['scripts', 'storyboards', 'prompts', 'videos'].includes(collection!) && action === 'generate')
		return { method: 'POST', path: '/v1/generate/' + collection!.slice(0, -1), body: p, generation: collection !== 'videos' };
	if (method === 'assets.uploadIntent') return { method: 'POST', path: '/v1/assets/uploads', body: p };
	if (method === 'assets.register') return { method: 'POST', path: '/v1/assets', body: p };
	if (method === 'skills.version') return { method: 'GET', path: `/v1/skills/${resourceId(p.id)}/versions/${p.version}` };
	if (['products', 'brands', 'characters', 'assets', 'jobs', 'ads', 'batches', 'skills', 'sessions'].includes(collection!)) {
		const base = '/v1/' + collection;
		if (action === 'get') {
			const { id: rid, sessionId, ...query } = p;
			return {
				method: 'GET',
				path: base + '/' + (collection === 'sessions' ? id(sessionId) : resourceId(rid)),
				query,
				...(collection === 'sessions' ? { agent: true } : {}),
			};
		}
		if (action === 'list') return { method: 'GET', path: base, query: p, ...(collection === 'sessions' ? { agent: true } : {}) };
		if (action === 'create') return { method: 'POST', path: base, body: p, ...(collection === 'sessions' ? { agent: true } : {}) };
		if (action === 'update' && ['products', 'brands', 'characters', 'assets'].includes(collection!)) {
			const { id: rid, ...body } = p;
			return { method: 'PATCH', path: base + '/' + resourceId(rid), body };
		}
		if (action === 'delete' && collection === 'products') return { method: 'DELETE', path: base + '/' + resourceId(p.id) };
	}
	throw new AdsError({
		code: 'UNSUPPORTED_OPERATION',
		message: `No pinned backend operation: ${method}`,
		retryable: false,
		acceptance: 'not_accepted',
	});
}
