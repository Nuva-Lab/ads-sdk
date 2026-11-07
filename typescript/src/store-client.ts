import { backendIdSchema } from './backend-id.js';
import { z } from 'zod';
import { Transport, isWriteMethod } from './transport.js';
import { NuvaError, PartialCreationError } from './errors.js';
import { frozen } from './protocol.js';
import { backendSchema } from './backend-schema.js';
import { decodeScriptPackage } from './script-content.js';
import {
	generateScriptSchema,
	generateStoryboardSchema,
	generatePromptSchema,
	newScriptSchema,
	editScriptSchema,
	reviseScriptSchema,
	newStoryboardSchema,
	reviseStoryboardSchema,
} from './generation-schemas.js';
import { ASSET, ASSET_ROLE_MESSAGE, decodeScript, decodeStoryboard, hasAssetRole, scriptVersion, type ScriptContent } from './script-v3.js';
import type { BackendSchemas as B } from './backend-target.js';
import type { NuvaClientOptions, NuvaErrorInfo, ResourceRef, ResourceLink } from './types.js';
import type {
	StoreClients,
	Artifact,
	BackendArtifact,
	JobState,
	Asset,
	Script,
	Storyboard,
	Prompt,
	ResultOptions,
	ShareTarget,
} from './stores.js';
const kinds = { script: 'Script', storyboard: 'Storyboard', prompt: 'Prompt' } as const;
function checked<T>(schema: { parse(v: unknown): T }, value: unknown, input = false): T {
	try {
		return schema.parse(value);
	} catch (e) {
		if (e instanceof NuvaError) throw e;
		throw new NuvaError({
			code: input ? 'INVALID_INPUT' : 'SERVICE_ERROR',
			message: e instanceof Error ? e.message : 'Invalid data.',
			retryable: false,
			// Invalid input is refused before anything is sent.
			...(input ? { acceptance: 'not_accepted' as const } : {}),
		});
	}
}
const link = <T extends { id: string }, K extends string>(v: T, kind: K, label: string) => ({ ...v, ref: { kind, id: v.id }, label });
function assertClientRelationships(input: unknown): void {
	if (input !== null && typeof input === 'object' && Object.hasOwn(input, 'relationships'))
		throw new NuvaError({ code: 'UNSUPPORTED_OPERATION', message: 'Artifact relationships are managed by the Agent.', retryable: false, acceptance: 'not_accepted' });
}
export function createStores(transport: Transport, options: NuvaClientOptions) {
	let closed = false;
	const stops = new Set<() => void>();
	const closeErrors = new Map<() => void, (error: NuvaErrorInfo) => void>();
	const interval = options.jobPollIntervalMs ?? 500;
	if (!Number.isFinite(interval) || interval < 10) throw new TypeError('jobPollIntervalMs must be at least 10.');
	async function request<T>(
		method: string,
		params: unknown,
		schema: { parse(v: unknown): T },
		requestId: string = crypto.randomUUID(),
		idempotencyKey?: string,
	): Promise<T> {
		let received = false;
		try {
			if (method === 'prompts.createFrom') assertClientRelationships(params);
			const response = await transport.data(method, params, requestId, idempotencyKey);
			received = true;
			const result = checked(schema, response);
			if (
				method.endsWith('.get') &&
				typeof params === 'object' &&
				params !== null &&
				'id' in params &&
				typeof result === 'object' &&
				result !== null &&
				'id' in result
			) {
				if (params.id !== result.id)
					throw new NuvaError({ code: 'SERVICE_ERROR', message: 'Response resource identity differs from the request.', retryable: false });
				if ('version' in params && params.version !== undefined && 'version' in result && params.version !== result.version)
					throw new NuvaError({
						code: 'SERVICE_ERROR',
						message: 'Response revision differs from the requested version.',
						retryable: false,
					});
			}
			return frozen(result);
		} catch (e) {
			if (e instanceof PartialCreationError) throw e;
			if (e instanceof NuvaError)
				throw new NuvaError({
					...e.toJSON(),
					requestId: e.requestId ?? requestId,
					...(isWriteMethod(method) && (received || e.code === 'SERVICE_ERROR') && e.acceptance === undefined
						? { acceptance: 'unknown' as const }
						: {}),
				});
			throw e;
		}
	}
	const dto = <K extends keyof B>(method: string, params: unknown, name: K, id?: string, idempotencyKey?: string) =>
		request(method, params, backendSchema(name), id, idempotencyKey);
	const decorated = <K extends keyof B, Kind extends string>(name: K, kind: Kind): { parse(v: unknown): B[K] & ResourceLink<Kind> } => ({
		parse(v: unknown) {
			const raw = backendSchema(name).parse(v) as B[K] & { id: string; data?: { name?: string }; name?: string; intent?: string };
			return link(raw, kind, raw.data?.name ?? raw.name ?? raw.intent ?? raw.id);
		},
	});
	const resource = decorated;
	function artifact(v: unknown, expected?: ResourceRef): BackendArtifact {
		const { kind, schema_version } = z
			.object({ kind: z.enum(['script', 'storyboard', 'prompt']), schema_version: z.number().int().positive() })
			.loose()
			.parse(v);
		if (schema_version !== 1)
			throw new NuvaError({ code: 'UNSUPPORTED_SCHEMA', message: `${kind}@${schema_version} is newer than this SDK; upgrade it.`, retryable: false });
		const raw = backendSchema(kinds[kind]).parse(v);
		if (expected && (raw.id !== expected.id || raw.kind !== expected.kind))
			throw new NuvaError({ code: 'SERVICE_ERROR', message: 'Artifact identity mismatch.', retryable: false });
		return { ...raw, ref: { kind, id: raw.id }, label: raw.id, schemaVersion: raw.schema_version } as BackendArtifact;
	}
	/** Whether `ref` is the full record (read before) rather than a reference. */
	const held = (ref: unknown, kind: string) =>
		ref !== null && typeof ref === 'object' && (ref as { kind?: unknown }).kind === kind && ('content' in ref || 'legacy' in ref || 'data' in ref);
	/** Reads one Script, Storyboard or Prompt by its id. */
	const readArtifact = (ref: ResourceRef, kind: keyof typeof kinds): Promise<Artifact> => {
		if (ref?.kind !== kind) throw moved(`Give the ${kinds[kind]} as { kind: "${kind}", id }.`);
		return request('artifacts.get', { ref }, { parse: (v) => artifact(v, ref) });
	};
	/** A new Prompt from `base` with changed render fields, the only Artifact users save directly. */
	const promptFrom = (base: ResourceRef, data: unknown, o?: { requestId?: string; idempotencyKey?: string }) =>
		request(
			'prompts.createFrom',
			{ ref: base, ...checked(backendSchema('PromptVersionCreate'), { data }, true) },
			{
				parse: (v) => {
					const a = artifact(v);
					if (a.kind !== 'prompt' || a.base_id !== base.id || a.id === base.id) throw new TypeError('Invalid Prompt base.');
					return a as Prompt;
				},
			},
			o?.requestId,
			o?.idempotencyKey,
		);
	function profiles(name: 'Product' | 'Brand' | 'Character') {
		const kind = name.toLowerCase(),
			collection = kind + 's',
			parser = resource(name, kind);
		return {
			get: (id: string, query = {}) => request(collection + '.get', { id, ...query }, parser),
			list: async (query = {}) => {
				const raw = await dto(collection + '.list', query, `${name}Page`);
				return { ...raw, items: raw.items.map((v) => parser.parse(v)), nextCursor: raw.next_cursor };
			},
			create: async (input: unknown, o?: { requestId?: string; idempotencyKey?: string }) =>
				request(collection + '.create', checked(backendSchema(`${name}Create`), input, true), parser, o?.requestId, o?.idempotencyKey),
			update: async (ref: { id: string; version: number }, changes: object, o?: { requestId?: string; idempotencyKey?: string }) => {
				if (typeof ref?.id !== 'string' || !Number.isInteger(ref?.version))
					throw moved(`Give the ${name} you read, or { id, version }, as the first argument.`);
				return request(
					collection + '.update',
					{ id: ref.id, ...checked(backendSchema(`${name}Edit`), { ...changes, version: ref.version }, true) },
					parser,
					o?.requestId,
					o?.idempotencyKey,
				);
			},
		};
	}
	// An Asset's own label (or null) is kept; display code falls back to its ID.
	const assetParser = { parse: (v: unknown) => { const raw = backendSchema('AssetOut').parse(v); return { ...raw, ref: { kind: 'asset' as const, id: raw.id } }; } };
	const getJob = (id: string) => dto('jobs.get', { id }, 'JobOut');
	function subscribe(id: string, listener: (s: JobState) => void, onError?: (e: NuvaErrorInfo) => void) {
		if (closed) throw new NuvaError({ code: 'CONNECTION_ERROR', message: 'Client closed.', retryable: false });
		let active = true,
			timer: ReturnType<typeof setTimeout> | undefined;
		const stop = () => {
			active = false;
			clearTimeout(timer);
			stops.delete(stop);
			closeErrors.delete(stop);
		};
		stops.add(stop);
		if (onError) closeErrors.set(stop, onError);
		const poll = async () => {
			try {
				const state = await getJob(id);
				if (!active) return;
				listener(state);
				if (['completed', 'failed', 'cancelled'].includes(state.status)) {
					stop();
					return;
				}
			} catch (e) {
				if (active) onError?.(e instanceof NuvaError ? e.toJSON() : { code: 'SERVICE_ERROR', message: String(e), retryable: false });
			}
			if (active) timer = setTimeout(() => void poll(), interval);
		};
		void poll();
		return stop;
	}
	const typedScript = (a: Artifact): Script => {
		if (a.ref.kind !== 'script' || a.schemaVersion !== 1)
			throw new NuvaError({ code: 'UNSUPPORTED_SCHEMA', message: 'Expected script@1.', retryable: false });
		const data = checked(backendSchema('ScriptDataV1'), a.data);
		const base = { ...(a as BackendArtifact), kind: 'script' as const, ref: { kind: 'script' as const, id: a.ref.id }, data };
		// Scripts saved before Storyboards are read-only v2 ScriptPackages.
		return scriptVersion(data.text) === 2
			? { ...base, format: 2, legacy: checked({ parse: decodeScriptPackage }, data.text) }
			: { ...base, format: 3, content: checked({ parse: decodeScript }, data.text) };
	};
	const typedStoryboard = (a: Artifact): Storyboard => {
		if (a.ref.kind !== 'storyboard' || a.schemaVersion !== 1)
			throw new NuvaError({ code: 'UNSUPPORTED_SCHEMA', message: 'Expected storyboard@1.', retryable: false });
		const data = checked(backendSchema('StoryboardDataV1'), a.data);
		return {
			...(a as BackendArtifact),
			kind: 'storyboard',
			ref: { kind: 'storyboard', id: a.ref.id },
			data,
			content: checked({ parse: decodeStoryboard }, data.text),
		} as Storyboard;
	};
	/** `asset` is reserved: no new Script or version may have a role called `asset`. */
	const reservedRoles = (content: ScriptContent, current?: Script) => {
		if (current?.format === 3 && hasAssetRole(current.content))
			throw new NuvaError({ code: 'INVALID_INPUT', message: ASSET_ROLE_MESSAGE, retryable: false, acceptance: 'not_accepted' });
		if (content?.roles?.some((role) => role.id === ASSET))
			throw new NuvaError({ code: 'INVALID_INPUT', message: 'roles: narrator, product and asset are reserved.', retryable: false, acceptance: 'not_accepted' });
	};
	/** Every Storyboard write goes through the Agent's Storyboard endpoint and its checks. */
	const storyboardRequest = (input: unknown, o?: { requestId?: string; idempotencyKey?: string }) =>
		request('storyboards.generate', checked(generateStoryboardSchema, input, true), { parse: (v) => typedStoryboard(artifact(v)) }, o?.requestId, o?.idempotencyKey);
	const storyboardId = (ref: ResourceRef<'storyboard'>) => {
		if (ref?.kind !== 'storyboard') throw moved('Give the Storyboard as { kind: "storyboard", id }.');
		return ref.id;
	};
	const moved = (message: string) => new NuvaError({ code: 'INVALID_INPUT', message, retryable: false, acceptance: 'not_accepted' });
	/** The Product a Script was written for: the Product it is based on. */
	const scriptProduct = (script: Script) => {
		const product = script.relationships?.find((relationship) => relationship.type === 'based_on' && relationship.target.kind === 'product')?.target;
		if (product === undefined)
			throw new NuvaError({ code: 'SERVICE_ERROR', message: 'The Script does not say which Product it was written for.', retryable: false });
		return product.id;
	};
	// An Artifact's share carries its first version's ID, whichever version named it; any other item's names the item.
	const artifactKinds = ['script', 'storyboard', 'prompt'];
	const shareFor = (item: ShareTarget) =>
		z
			.object({
				kind: z.literal(item.kind),
				id: artifactKinds.includes(item.kind)
					? backendIdSchema
					: backendIdSchema.refine((id) => id.toLowerCase() === String(item.id).toLowerCase(), 'The share is for another item.'),
				scope: z.string().min(1),
				access: z.enum(['read', 'write']),
				created_at: z.string(),
			})
			.loose();
	const noContent = {
		parse: (v: unknown) => {
			if (v !== undefined) throw new TypeError('A delete returns no content.');
			return undefined;
		},
	};
	const api: StoreClients = {
		shares: {
			list: async (item) => [...(await request('shares.list', { item }, z.object({ items: z.array(shareFor(item)) }).loose())).items],
			set: (item, scope, access, options) => request('shares.set', { item, scope, access }, shareFor(item), options?.requestId),
			remove: async (item, scope, options) => {
				await request('shares.remove', { item, scope }, noContent, options?.requestId);
			},
		},
		products: {
			...(profiles('Product') as Omit<StoreClients['products'], 'delete'>),
			delete: async (id, options) => {
				const empty = {
					parse: (v: unknown) => {
						if (v !== undefined) throw new TypeError('A delete returns no content.');
						return undefined;
					},
				};
				await request('products.delete', { id }, empty, options?.requestId);
			},
		},
		brands: profiles('Brand') as StoreClients['brands'],
		characters: profiles('Character') as StoreClients['characters'],
		assets: {
			get: (id) => request('assets.get', { id }, assetParser) as Promise<Asset>,
			upload: async (source, o) => {
				const text = { ...(o?.label === undefined ? {} : { label: o.label }), ...(o?.description === undefined ? {} : { description: o.description }) };
				const register = (body: object) =>
					request('assets.register', checked(backendSchema('AssetCreate'), { ...body, ...text }, true), assetParser, o?.requestId, o?.idempotencyKey) as Promise<Asset>;
				if (!(source instanceof File)) {
					if (typeof source?.url !== 'string') throw moved('Upload a File, or { url } for a public HTTPS URL.');
					return register({ url: source.url, ...(o?.kind === undefined ? {} : { kind: o.kind }) });
				}
				const prefix = source.type.split('/')[0];
				const kind = o?.kind ?? (prefix === 'image' || prefix === 'video' || prefix === 'audio' ? prefix : undefined);
				if (!kind) throw new NuvaError({ code: 'INVALID_INPUT', message: 'Specify the media kind for this upload.', retryable: false });
				const intent = await dto('assets.uploadIntent', checked(backendSchema('UploadRequest'), { kind }, true), 'UploadOut', o?.requestId);
				if (source.size > intent.max_bytes)
					throw new NuvaError({ code: 'INVALID_INPUT', message: `The file is larger than ${intent.max_bytes} bytes.`, retryable: false });
				await transport.upload(intent.upload_url, source);
				return register({ upload_token: intent.upload_token });
			},
		},
		scripts: {
			get: async (ref) => typedScript(await readArtifact(ref, 'script')),
			generate: async (input, o) => {
				if (input !== null && typeof input === 'object' && 'base' in input)
					throw moved('scripts.generate writes a new Script; use scripts.generateFrom(base, { instruction }) to start from one.');
				return request('scripts.generate', checked(newScriptSchema, input, true), { parse: (v) => typedScript(artifact(v)) }, o?.requestId, o?.idempotencyKey);
			},
			generateFrom: async (ref, input, o) => {
				const { instruction, acceptable_duration_ms } = checked(reviseScriptSchema, input, true);
				const base = await api.scripts.get(ref);
				if (base.format !== 3) throw moved('This Script was saved before Storyboards and is read-only; generate a new Script instead.');
				const length = base.content.duration_ms;
				return request(
					'scripts.generate',
					checked(
						generateScriptSchema,
						{ product: scriptProduct(base), base: base.id, instruction, acceptable_duration_ms: acceptable_duration_ms ?? { min: length, max: length } },
						true,
					),
					{ parse: (v) => typedScript(artifact(v)) },
					o?.requestId,
					o?.idempotencyKey,
				);
			},
			createFrom: async (ref, changes, o) => {
				assertClientRelationships(changes);
				const base = held(ref, 'script') ? (ref as Script) : await api.scripts.get(ref);
				if (base.format !== 3) throw moved('This Script was saved before Storyboards and is read-only; generate a new Script instead.');
				const content = { ...base.content, ...changes } as ScriptContent;
				reservedRoles(content, base);
				// Saved through the Agent's Script endpoint, with the same checks and pins as a written Script.
				return request(
					'scripts.generate',
					checked(editScriptSchema, { base: base.id, content }, true),
					{ parse: (v) => typedScript(artifact(v)) },
					o?.requestId,
					o?.idempotencyKey,
				);
			},
		},
		prompts: {
			get: async (ref) => (await readArtifact(ref, 'prompt')) as Prompt,
			createFrom: async (ref, changes, o) => {
				assertClientRelationships(changes);
				const base = held(ref, 'prompt') ? (ref as Prompt) : await api.prompts.get(ref);
				const render = ['prompt', 'image_asset_ids', 'video_asset_ids', 'audio_asset_ids', 'seconds', 'ratio'] as const;
				const unknown = Object.keys(changes).filter((key) => !(render as readonly string[]).includes(key));
				if (unknown.length) throw moved(`prompts.createFrom changes only ${render.join(', ')}; not ${unknown.join(', ')}.`);
				const data = Object.fromEntries(render.map((key) => [key, key in changes ? changes[key] : base.data[key]]));
				return promptFrom(base.ref, data, o);
			},
			generate: async (input, o) => {
				const parsed = checked(generatePromptSchema, input, true);
				return request(
					'prompts.generate',
					parsed,
					{
						parse: (v) => {
							const raw = z
								.object({ prompts: z.array(backendSchema('Prompt')).min(1) })
								.strict()
								.parse(v);
							// Each Prompt is one clip's: a distinct, non-null clip ID (the requested one, for a single clip).
							const clips = raw.prompts.map((prompt) => prompt.data.clip_id);
							if (
								new Set(raw.prompts.map((prompt) => prompt.id)).size !== raw.prompts.length ||
								clips.some((clip) => typeof clip !== 'string') ||
								new Set(clips).size !== clips.length ||
								(parsed.clip !== undefined && (raw.prompts.length !== 1 || clips[0] !== parsed.clip)) ||
								raw.prompts.some(
									(prompt) => !prompt.relationships.some((relationship) => relationship.target.kind === 'storyboard' && relationship.target.id === parsed.storyboard),
								)
							)
								throw new NuvaError({
									code: 'SERVICE_ERROR',
									message: 'Generation must return unique Prompts of the requested Storyboard clips.',
									retryable: false,
									acceptance: 'unknown',
								});
							return { prompts: raw.prompts.map((v) => artifact(v) as Prompt & { data: { clip_id: string } }) };
						},
					},
					o?.requestId,
					o?.idempotencyKey,
				);
			},
		},
		storyboards: {
			get: async (ref) => typedStoryboard(await readArtifact(ref, 'storyboard')),
			generate: async (input, o) => {
				if (input !== null && typeof input === 'object' && ('content' in input || 'base' in input))
					throw moved('storyboards.generate writes a new Storyboard; to start from one, use storyboards.generateFrom or createFrom.');
				return storyboardRequest(checked(newStoryboardSchema, input, true), o);
			},
			generateFrom: async (ref, input, o) => storyboardRequest({ base: storyboardId(ref), ...checked(reviseStoryboardSchema, input, true) }, o),
			createFrom: async (ref, changes, o) => {
				const base = held(ref, 'storyboard') ? (ref as Storyboard) : await api.storyboards.get(ref);
				if (changes !== null && typeof changes === 'object' && 'script' in changes) throw moved('A Storyboard keeps its Script: leave script out of the changes.');
				return storyboardRequest({ base: base.id, content: { ...base.content, ...changes } }, o);
			},
		},
		jobs: {
			get: getJob,
			subscribe,
			cancel: (id, o) => dto('jobs.cancel', { id }, 'JobOut', o?.requestId),
		},
		videos: {
			generate: async (input, o) => {
				assertClientRelationships(input.input);
				const receipt = await dto(
					'videos.generate',
					checked(backendSchema('GenerateVideo'), input, true),
					'JobOut',
					o?.requestId,
					o?.idempotencyKey,
				);
				return {
					...receipt,
					subscribe: (listener, onError) => subscribe(receipt.id, listener, onError),
					result: (opts: ResultOptions = {}) =>
						new Promise<Asset>((resolve, reject) => {
							if (opts.signal?.aborted) {
								reject(opts.signal.reason);
								return;
							}
							let stop = () => {};
							let timer: ReturnType<typeof setTimeout> | undefined;
							const done = (f: () => void) => {
								stop();
								clearTimeout(timer);
								opts.signal?.removeEventListener('abort', abort);
								f();
							};
							const abort = () => done(() => reject(opts.signal?.reason));
							opts.signal?.addEventListener('abort', abort, { once: true });
							stop = subscribe(
								receipt.id,
								(s) => {
									if (s.status === 'completed')
										done(() => {
											if (s.asset === null) {
												reject(new NuvaError({ code: 'SERVICE_ERROR', message: 'Completed Job has no Asset.', retryable: false }));
												return;
											}
											resolve(assetParser.parse(s.asset) as Asset);
										});
									else if (s.status === 'failed' || s.status === 'cancelled')
										done(() =>
											reject(
												new NuvaError({
													code: s.status === 'cancelled' ? 'JOB_CANCELLED' : 'SERVICE_ERROR',
													message: s.error ?? (s.status === 'cancelled' ? 'Job cancelled.' : 'Job failed without an error message.'),
													retryable: false,
												}),
											),
										);
								},
								(e) => done(() => reject(new NuvaError(e))),
							);
							if (opts.timeoutMs !== undefined)
								timer = setTimeout(
									() =>
										done(() =>
											reject(
												new NuvaError({ code: 'CONNECTION_ERROR', message: 'Timed out waiting; server work continues.', retryable: true }),
											),
										),
									opts.timeoutMs,
								);
						}),
				};
			},
		},
		ads: {
			get: (id) => request('ads.get', { id }, resource('AdOut', 'ad')),
			list: async (query = {}) => {
				const raw = await dto('ads.list', query, 'AdPage');
				return { ...raw, items: raw.items.map((v) => link(v, 'ad', v.id)), nextCursor: raw.next_cursor };
			},
		},
		batches: {
			get: (id) => request('batches.get', { id }, resource('BatchOut', 'batch')),
			list: async (query = {}) => {
				const raw = await dto('batches.list', query, 'BatchPage');
				return { ...raw, nextCursor: raw.next_cursor };
			},
		},
		skills: {
			get: (id) => request('skills.get', { id }, resource('SkillDetail', 'skill')),
			list: async (query = {}) => {
				const raw = await dto('skills.list', query, 'SkillPage');
				return { ...raw, nextCursor: raw.next_cursor };
			},
			version: (id, version) => dto('skills.version', { id, version }, 'SkillVersionOut'),
		},
	};
	return {
		api,
		close() {
			closed = true;
			for (const stop of stops) {
				closeErrors.get(stop)?.({ code: 'CONNECTION_ERROR', message: 'Client closed; server work continues.', retryable: false });
				stop();
			}
			stops.clear();
		},
	};
}
