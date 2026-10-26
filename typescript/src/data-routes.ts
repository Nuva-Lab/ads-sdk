import { backendIdSchema } from './backend-id.js';
import { NuvaError } from './errors.js';
/** Existing backend DTOs are passed unchanged. Generation writers use a separate service. */
export function dataRequest(
	method: string,
	value: unknown,
): { method: string; path: string; body?: unknown; query?: Record<string, unknown>; generation?: boolean; agent?: boolean } {
	if (method === 'videos.assemble') return { method: 'POST', path: '/v1/assemble', body: value, generation: true };
	const p = value as Record<string, unknown>;
	const id = (v: unknown) => {
		if (typeof v !== 'string' || !v) throw new TypeError('A resource ID is required.');
		return encodeURIComponent(v);
	};
	const resourceId = (value: unknown) => {
		const parsed = backendIdSchema.safeParse(value);
		if (!parsed.success)
			throw new NuvaError({
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
		['script', 'prompt', 'directing_plan'].includes(kind) ? resourceId(value) : id(value);
	const [collection, action] = method.split('.');
	if (collection === 'artifacts') {
		const ref = p.ref as { kind: string; id: string } | undefined;
		if (action === 'get') return { method: 'GET', path: `/v1/artifacts/${id(ref!.kind)}/${artifactId(ref!.kind, ref!.id)}` };
		if (action === 'create') {
			const { kind, ...body } = p;
			return { method: 'POST', path: `/v1/artifacts/${id(kind)}`, body };
		}
		if (action === 'update') {
			const { ref: _, ...body } = p;
			return { method: 'POST', path: `/v1/artifacts/${id(ref!.kind)}/${artifactId(ref!.kind, ref!.id)}/versions`, body };
		}
	}
	if (['scripts', 'prompts', 'videos'].includes(collection!) && action === 'generate')
		return { method: 'POST', path: '/v1/generate/' + collection!.slice(0, -1), body: p, generation: collection !== 'videos' };
	if (method === 'assets.uploadIntent') return { method: 'POST', path: '/v1/assets/uploads', body: p };
	if (method === 'assets.register') return { method: 'POST', path: '/v1/assets', body: p };
	if (method === 'skills.version') return { method: 'GET', path: `/v1/skills/${resourceId(p.id)}/versions/${p.version}` };
	if (method === 'batches.appendLog') return { method: 'POST', path: `/v1/batches/${resourceId(p.id)}/log`, body: p.input };
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
		if (action === 'update' && ['products', 'brands', 'characters'].includes(collection!)) {
			const { id: rid, ...body } = p;
			return { method: 'PUT', path: base + '/' + resourceId(rid), body };
		}
	}
	throw new NuvaError({
		code: 'UNSUPPORTED_OPERATION',
		message: `No pinned backend operation: ${method}`,
		retryable: false,
		acceptance: 'not_accepted',
	});
}
