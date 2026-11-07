import { backendIdSchema } from './backend-id.js';
import { z } from 'zod';
import { Transport, isWriteMethod } from './transport.js';
import { NuvaError, PartialCreationError, ProductImageUploadError } from './errors.js';
import { frozen, stableJSON } from './protocol.js';
import { backendSchema } from './backend-schema.js';
import { decodeScriptPackage } from './script-content.js';
import {
	PromptSchema,
	generateScriptSchema,
	generateStoryboardSchema,
	generatePromptSchema,
	newScriptSchema,
	editScriptSchema,
	reviseScriptSchema,
	newStoryboardSchema,
	reviseStoryboardSchema,
	updateStoryboardSchema,
} from './schemas.js';
import { ASSET, ASSET_ROLE_MESSAGE, decodeScript, decodeStoryboard, hasAssetRole, scriptVersion, type ScriptContent } from './script-v3.js';
import type { BackendSchemas as B } from './backend-target.js';
import type { NuvaClientOptions, NuvaErrorInfo, ResourceRef, ResourceLink } from './types.js';
import type {
	StoreClients,
	Artifact,
	BackendArtifact,
	ArtifactSchema,
	TypedArtifactReader,
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
			if (method === 'artifacts.update') assertClientRelationships(params);
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
		const kind = z.object({ kind: z.enum(['script', 'storyboard', 'prompt']) }).parse(v).kind;
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
	const artifacts = {
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
		forSchema<K extends string, D>(schema: ArtifactSchema<K, D>): TypedArtifactReader<K, D> {
			return {
				get: async (ref: ResourceRef<K>) => {
					const a = await artifacts.get(ref);
					if (a.ref.kind !== schema.kind || a.schemaVersion !== schema.schemaVersion)
						throw new NuvaError({ code: 'UNSUPPORTED_SCHEMA', message: 'Artifact kind or schema mismatch.', retryable: false });
					return { ...a, data: checked(schema, a.data) } as Artifact<K, D>;
				},
			};
		},
	} satisfies StoreClients['artifacts'];
	/** A new version of a Script or Prompt, the only Artifact versions users write directly. */
	const artifactVersion = (ref: ResourceRef, input: { data: unknown; batch_id?: string | null; relationships?: never }, o?: { requestId?: string; idempotencyKey?: string }) => {
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
	const prompts = artifacts.forSchema(PromptSchema);
	/** Every Storyboard write goes through the Agent's Storyboard endpoint and its checks. */
	const storyboardRequest = (input: unknown, o?: { requestId?: string; idempotencyKey?: string }) =>
		request('storyboards.generate', checked(generateStoryboardSchema, input, true), { parse: (v) => typedStoryboard(artifact(v)) }, o?.requestId, o?.idempotencyKey);
	const storyboardId = (ref: ResourceRef<'storyboard'>) => {
		if (ref?.kind !== 'storyboard') throw moved('Give the Storyboard as { kind: "storyboard", id }.');
		return ref.id;
	};
	const moved = (message: string) => new NuvaError({ code: 'INVALID_INPUT', message, retryable: false, acceptance: 'not_accepted' });
	/** The Product a Script was written for: the Product revision it is based on, by lineage. */
	const scriptProduct = (script: Script) => {
		const revision = script.relationships?.find((relationship) => relationship.type === 'based_on' && relationship.target.kind === 'product')?.target.id;
		const product = revision === undefined ? undefined : script.entities?.[revision];
		if (product?.kind !== 'product')
			throw new NuvaError({ code: 'SERVICE_ERROR', message: 'The Script does not say which Product it was written for.', retryable: false });
		return product.id;
	};
	// An Artifact's share carries its first version's ID, whichever version named it; any other item's names the item.
	const artifactKinds = ['script', 'storyboard', 'directing_plan', 'prompt'];
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
		artifacts,
		shares: {
			list: async (item) => [...(await request('shares.list', { item }, z.object({ items: z.array(shareFor(item)) }).loose())).items],
			set: (item, scope, access, options) => request('shares.set', { item, scope, access }, shareFor(item), options?.requestId),
			remove: async (item, scope, options) => {
				await request('shares.remove', { item, scope }, noContent, options?.requestId);
			},
		},
		products: {
			...(profiles('Product') as Omit<StoreClients['products'], 'uploadImage' | 'delete'>),
			delete: async (id, options) => {
				const empty = {
					parse: (v: unknown) => {
						if (v !== undefined) throw new TypeError('A delete returns no content.');
						return undefined;
					},
				};
				await request('products.delete', { id }, empty, options?.requestId);
			},
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
				const text = { ...(o?.label === undefined ? {} : { label: o.label }), ...(o?.description === undefined ? {} : { description: o.description }) };
				const prefix = file.type.split('/')[0];
				const kind = o?.kind ?? (prefix === 'image' || prefix === 'video' || prefix === 'audio' ? prefix : undefined);
				if (!kind) throw new NuvaError({ code: 'INVALID_INPUT', message: 'Specify the media kind for this upload.', retryable: false });
				const intent = await api.assets.uploadIntent({ kind }, o);
				if (file.size > intent.max_bytes)
					throw new NuvaError({ code: 'INVALID_INPUT', message: 'Upload exceeds backend max_bytes.', retryable: false });
				await transport.upload(intent.upload_url, file);
				return api.assets.register({ upload_token: intent.upload_token, ...text }, o);
			},
		},
		scripts: {
			get: async (ref) => typedScript(await artifacts.get(ref)),
			update: async (ref, input, o) => {
				assertClientRelationships(input);
				const { content, ...unexpected } = input;
				if (Object.keys(unexpected).length)
					throw new NuvaError({ code: 'INVALID_INPUT', message: 'scripts.update takes the edited content; the new version keeps its base\'s Batch.', retryable: false, acceptance: 'not_accepted' });
				const current = await api.scripts.get(ref);
				reservedRoles(content, current);
				// The edit goes through the Agent's Script endpoint, with the same checks and pins as a written Script.
				return request(
					'scripts.generate',
					checked(editScriptSchema, { base: current.id, content }, true),
					{ parse: (v) => typedScript(artifact(v)) },
					o?.requestId,
					o?.idempotencyKey,
				);
			},
			generate: (input, o) => {
				if (input !== null && typeof input === 'object' && 'base' in input)
					throw moved('scripts.generate writes a new Script; use scripts.revise(ref, { instruction }) to change one.');
				return request(
					'scripts.generate',
					checked(newScriptSchema, input, true),
					{ parse: (v) => typedScript(artifact(v)) },
					o?.requestId,
					o?.idempotencyKey,
				);
			},
			revise: async (ref, input, o) => {
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
		},
		prompts: {
			get: async (ref) => (await prompts.get(ref)) as Prompt,
			update: async (ref, input, o) => {
				assertClientRelationships(input);
				await prompts.get(ref);
				const data = checked(z.json(), checked(PromptSchema, input.data, true), true);
				return (await artifactVersion(ref, { ...input, data }, o)) as Prompt;
			},
			generate: (input, o) => {
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
			get: async (ref) => typedStoryboard(await artifacts.get(ref)),
			generate: (input, o) => {
				if (input !== null && typeof input === 'object' && 'content' in input)
					throw moved('storyboards.generate writes a new Storyboard; use storyboards.update(ref, { content }) to save an edit.');
				if (input !== null && typeof input === 'object' && 'base' in input)
					throw moved('storyboards.generate writes a new Storyboard; use storyboards.revise(ref, { instruction }) to change one.');
				return storyboardRequest(checked(newStoryboardSchema, input, true), o);
			},
			revise: (ref, input, o) => storyboardRequest({ base: storyboardId(ref), ...checked(reviseStoryboardSchema, input, true) }, o),
			update: (ref, input, o) => storyboardRequest({ base: storyboardId(ref), ...checked(updateStoryboardSchema, input, true) }, o),
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
