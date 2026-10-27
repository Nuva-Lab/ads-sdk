import { backendIdSchema } from './backend-id.js';
import { z } from 'zod';
import { Transport, isWriteMethod } from './transport.js';
import { NuvaError, PartialCreationError, ProductImageUploadError } from './errors.js';
import { frozen, stableJSON } from './protocol.js';
import { backendSchema } from './backend-schema.js';
import { encodeScriptPackage, decodeScriptPackage } from './script-content.js';
import { PromptSchema, generateScriptSchema, generatePromptSchema } from './schemas.js';
import type { BackendSchemas as B } from './backend-target.js';
import type { NuvaClientOptions, NuvaErrorInfo, ResourceRef, ResourceLink } from './types.js';
import type {
	StoreClients,
	Artifact,
	BackendArtifact,
	ArtifactSchema,
	TypedArtifacts,
	JobState,
	Asset,
	Script,
	Prompt,
	ResultOptions,
} from './stores.js';
const kinds = { script: 'Script', directing_plan: 'DirectingPlan', prompt: 'Prompt' } as const;
function checked<T>(schema: { parse(v: unknown): T }, value: unknown, input = false): T {
	try {
		return schema.parse(value);
	} catch (e) {
		if (e instanceof NuvaError) throw e;
		throw new NuvaError({
			code: input ? 'INVALID_INPUT' : 'SERVICE_ERROR',
			message: e instanceof Error ? e.message : 'Invalid data.',
			retryable: false,
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
		allowScriptCreationRelationships = false,
	): Promise<T> {
		let received = false;
		try {
			if (method === 'artifacts.create' || method === 'artifacts.update') {
				const scriptCreation = allowScriptCreationRelationships && method === 'artifacts.create' &&
					params !== null && typeof params === 'object' && 'kind' in params && params.kind === 'script';
				if (!scriptCreation) assertClientRelationships(params);
			}
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
		const kind = z.object({ kind: z.enum(['script', 'directing_plan', 'prompt']) }).parse(v).kind;
		const version = z.object({ schema_version: z.number().int().positive() }).parse(v).schema_version;
		const raw =
			version === 1
				? backendSchema(kinds[kind]).parse(v)
				: z
						.object({
							kind: z.literal(kind),
							id: backendIdSchema,
							lineage_id: backendIdSchema,
							base_id: backendIdSchema.nullable(),
							schema_version: z.number().int().positive(),
							data: z.json(),
							batch_id: backendIdSchema.nullable(),
							created_at: z.iso.datetime({ offset: true }),
							assets: z.record(backendIdSchema, backendSchema('AssetOut')),
							entities: z.record(backendIdSchema, backendSchema('EntityRef')),
							skills: z.record(backendIdSchema, backendSchema('SkillRef')),
						})
						.parse(v);
		if (expected && (raw.id !== expected.id || raw.kind !== expected.kind))
			throw new NuvaError({ code: 'SERVICE_ERROR', message: 'Artifact identity mismatch.', retryable: false });
		return { ...raw, ref: { kind, id: raw.id }, label: raw.id, schemaVersion: raw.schema_version } as BackendArtifact;
	}
	const artifacts: StoreClients['artifacts'] = {
		get: (ref) =>
			request(
				'artifacts.get',
				{ ref },
				{
					parse: (v) => {
						if (Object.hasOwn(kinds, ref.kind)) return artifact(v, ref);
						const custom = z
							.object({
								ref: z.object({ kind: z.literal(ref.kind), id: z.literal(ref.id) }),
								label: z.string(),
								schemaVersion: z.number().int().positive(),
								data: z.json(),
							})
							.parse(v);
						return custom;
					},
				},
			),
		create: (input, o) => {
			assertClientRelationships(input);
			const name = kinds[input.kind];
			if (!name) throw new NuvaError({ code: 'UNSUPPORTED_SCHEMA', message: 'Unsupported Artifact kind.', retryable: false });
			const { kind, ...body } = input;
			checked(backendSchema(`${name}Create`), body, true);
			return request(
				'artifacts.create',
				input,
				{
					parse: (v) => {
						const a = artifact(v);
						if (a.kind !== kind || a.schema_version !== input.schema_version) throw new TypeError('Artifact kind or schema mismatch.');
						return a;
					},
				},
				o?.requestId,
				o?.idempotencyKey,
			);
		},
		update: (ref, input, o) => {
			assertClientRelationships(input);
			const name = kinds[ref.kind as keyof typeof kinds];
			if (!name) throw new NuvaError({ code: 'UNSUPPORTED_SCHEMA', message: 'Unsupported Artifact kind.', retryable: false });
			checked(backendSchema(`${name}VersionCreate`), input, true);
			return request(
				'artifacts.update',
				{ ref, ...input },
				{
					parse: (v) => {
						const a = artifact(v);
						if (a.kind !== ref.kind || a.base_id !== ref.id || a.id === ref.id) throw new TypeError('Invalid Artifact parent.');
						return a;
					},
				},
				o?.requestId,
				o?.idempotencyKey,
			);
		},
		forSchema<K extends string, D, W extends boolean>(schema: ArtifactSchema<K, D, W>): TypedArtifacts<K, D, W> {
			const decode = (a: Artifact) => {
				if (a.ref.kind !== schema.kind || a.schemaVersion !== schema.schemaVersion)
					throw new NuvaError({ code: 'UNSUPPORTED_SCHEMA', message: 'Artifact kind or schema mismatch.', retryable: false });
				return { ...a, data: checked(schema, a.data) } as Artifact<K, D>;
			};
			const reader = { get: async (ref: ResourceRef<K>) => decode(await artifacts.get(ref)) };
			if (!schema.writable) return reader as TypedArtifacts<K, D, W>;
			return {
				...reader,
				create: async (input: { data: D; batch_id?: string | null }, o?: { requestId?: string; idempotencyKey?: string }) =>
					decode(
						await artifacts.create(
							{
								kind: schema.kind as keyof typeof kinds,
								schema_version: schema.schemaVersion,
								...input,
								data: checked(z.json(), checked(schema, input.data, true), true),
							},
							o,
						),
					),
				update: async (
					ref: ResourceRef<K>,
					input: { data: D; batch_id?: string | null },
					o?: { requestId?: string; idempotencyKey?: string },
				) => {
					assertClientRelationships(input);
					await reader.get(ref);
					return decode(await artifacts.update(ref, { ...input, data: checked(z.json(), checked(schema, input.data, true), true) }, o));
				},
			} as TypedArtifacts<K, D, W>;
		},
	};
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
			create: (input: unknown, o?: { requestId?: string; idempotencyKey?: string }) =>
				request(collection + '.create', checked(backendSchema(`${name}Create`), input, true), parser, o?.requestId),
			update: (
				input: { base: { id: string; version: number }; data: unknown; brand_id?: string },
				o?: { requestId?: string; idempotencyKey?: string },
			) => {
				const { base, ...body } = input;
				return request(
					collection + '.update',
					{ id: base.id, ...checked(backendSchema(`${name}Update`), { ...body, version: base.version }, true) },
					parser,
					o?.requestId,
				);
			},
		};
	}
	const assetParser = resource('AssetOut', 'asset');
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
		return {
			...(a as BackendArtifact),
			kind: 'script',
			ref: { kind: 'script', id: a.ref.id },
			data,
			content: checked({ parse: decodeScriptPackage }, data.text),
		};
	};
	const writeScript = (input: {
		content: import('./stores.js').ScriptPackage;
		relationships?: never;
		batch_id?: string | null;
	}) => {
		assertClientRelationships(input);
		const { content, batch_id, ...unexpected } = input;
		if (Object.keys(unexpected).length)
			throw new NuvaError({ code: 'INVALID_INPUT', message: 'Script inputs accept content and an optional batch_id.', retryable: false });
		return { data: { text: encodeScriptPackage(content) }, ...(batch_id === undefined ? {} : { batch_id }) };
	};
	const prompts = artifacts.forSchema(PromptSchema);
	const api: StoreClients = {
		artifacts,
		products: {
			...(profiles('Product') as Omit<StoreClients['products'], 'uploadImage'>),
			uploadImage: async ({ base, file }, options) => {
				const capturedBase = structuredClone(base);
				const original = backendSchema('Product').parse(capturedBase);
				if (!(file instanceof File) || !file.type.startsWith('image/'))
					throw new NuvaError({
						code: 'INVALID_INPUT',
						message: 'An image File is required; the backend validates the uploaded media.',
						retryable: false,
						acceptance: 'not_accepted',
					});
				const asset = await api.assets.upload(file, { ...options, kind: 'image' });
				try {
					if (asset.kind !== 'image')
						throw new NuvaError({
							code: 'SERVICE_ERROR',
							message: 'Registered upload did not return an image Asset.',
							retryable: false,
							acceptance: 'unknown',
						});
					const images = original.data.images ?? [];
					const alreadyAttached = images.includes(asset.id);
					if (!alreadyAttached && images.length >= 20)
						throw new NuvaError({
							code: 'INVALID_INPUT',
							message: 'Product already has the maximum number of images; the uploaded Asset is retained.',
							retryable: false,
							acceptance: 'unknown',
						});
					const data = { ...original.data, images: alreadyAttached ? images : [...images, asset.id] };
					// Always send the original optimistic version, including a duplicate/no-op.
					// Returning locally or refetching would hide a stale-base conflict.
					const product = await api.products.update({ base: capturedBase, data, brand_id: original.brand_id }, options);
					if (
						product.id !== original.id ||
						product.version !== original.version + (alreadyAttached ? 0 : 1) ||
						(alreadyAttached && product.revision !== original.revision) ||
						product.brand_id !== original.brand_id ||
						stableJSON(product.data) !== stableJSON(data)
					)
						throw new NuvaError({
							code: 'SERVICE_ERROR',
							message: 'Product attachment response does not preserve expected identity/version/image.',
							retryable: false,
							acceptance: 'unknown',
						});
					return frozen({ productId: product.id, assetId: asset.id, product, asset });
				} catch (error) {
					throw new ProductImageUploadError(original.id, asset, error);
				}
			},
		},
		brands: profiles('Brand') as StoreClients['brands'],
		characters: profiles('Character') as StoreClients['characters'],
		assets: {
			get: (id) => request('assets.get', { id }, assetParser) as Promise<Asset>,
			register: (input, o) =>
				request('assets.register', checked(backendSchema('AssetCreate'), input, true), assetParser, o?.requestId) as Promise<Asset>,
			uploadIntent: (input, o) =>
				dto('assets.uploadIntent', checked(backendSchema('UploadRequest'), input, true), 'UploadOut', o?.requestId),
			upload: async (file, o) => {
				const prefix = file.type.split('/')[0];
				const kind = o?.kind ?? (prefix === 'image' || prefix === 'video' || prefix === 'audio' ? prefix : undefined);
				if (!kind) throw new NuvaError({ code: 'INVALID_INPUT', message: 'Specify the media kind for this upload.', retryable: false });
				const intent = await api.assets.uploadIntent({ kind }, o);
				if (file.size > intent.max_bytes)
					throw new NuvaError({ code: 'INVALID_INPUT', message: 'Upload exceeds backend max_bytes.', retryable: false });
				await transport.upload(intent.upload_url, file);
				return api.assets.register({ upload_token: intent.upload_token }, o);
			},
		},
		scripts: {
			get: async (ref) => typedScript(await artifacts.get(ref)),
			create: async (input, o) => {
				const { relationships, ...scriptInput } = input;
				const body = checked(backendSchema('ScriptCreate'), {
					schema_version: 1,
					...writeScript(scriptInput),
					...(relationships === undefined ? {} : { relationships }),
				}, true);
				return request('artifacts.create', { kind: 'script', ...body },
					{ parse: value => typedScript(artifact(value)) }, o?.requestId, o?.idempotencyKey, true);
			},
			update: async (ref, input, o) => {
				await api.scripts.get(ref);
				return typedScript(await artifacts.update(ref, writeScript(input), o));
			},
			generate: (input, o) =>
				request(
					'scripts.generate',
					checked(generateScriptSchema, input, true),
					{ parse: (v) => typedScript(artifact(v)) },
					o?.requestId,
					o?.idempotencyKey,
				),
		},
		prompts: {
			get: async (ref) => (await prompts.get(ref)) as Prompt,
			create: async (input, o) => (await prompts.create(input, o)) as Prompt,
			update: async (ref, input, o) => (await prompts.update(ref, input, o)) as Prompt,
			generate: (input, o) =>
				request(
					'prompts.generate',
					checked(generatePromptSchema, input, true),
					{
						parse: (v) => {
							const raw = z
								.object({ prompts: z.array(backendSchema('Prompt')).min(1) })
								.strict()
								.parse(v);
							if (
								new Set(raw.prompts.map((prompt) => prompt.id)).size !== raw.prompts.length ||
								raw.prompts.some((prompt) => prompt.relationships.some((relationship) => relationship.target.kind === 'directing_plan'))
							)
								throw new NuvaError({
									code: 'SERVICE_ERROR',
									message: 'Generation must return unique independent Prompts without Plan associations.',
									retryable: false,
									acceptance: 'unknown',
								});
							return { prompts: raw.prompts.map((v) => artifact(v) as Prompt) };
						},
					},
					o?.requestId,
					o?.idempotencyKey,
				),
		},
		jobs: { get: getJob, subscribe },
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
