import type { GenerateScriptInput, GeneratePromptInput } from './schemas.js';
import type { CommandOptions, JsonObject, JsonValue, ResourceRef, ResourceLink, NuvaErrorInfo, Unsubscribe } from './types.js';
import type { BackendSchemas as B } from './backend-target.js';
import type { ScriptPackage } from './service-schemas.js';
export type { ScriptPackage, ScriptRequest, ClipResponse, VideoRequest } from './service-schemas.js';
export type BackendPage<T> = { readonly items: readonly T[]; readonly next_cursor: string | null; readonly nextCursor: string | null };
export type StoreQuery = { limit?: number; cursor?: string | null; brand_id?: string; batch_id?: string };
export type Product = B['Product'] & ResourceLink<'product'>;
export type Brand = B['Brand'] & ResourceLink<'brand'>;
export type Character = B['Character'] & ResourceLink<'character'>;
export type MutableResource = Product | Brand | Character;
export type Asset = B['AssetOut'] & ResourceLink<'asset'>;
export type Ad = B['AdOut'] & ResourceLink<'ad'>;
export type Batch = B['BatchOut'] & ResourceLink<'batch'>;
export type Skill = B['SkillDetail'] & ResourceLink<'skill'>;
export type Composition = B['CompositionV1'];
export type ArtifactKind = 'script' | 'directing_plan' | 'prompt';
export type Artifact<K extends string = string, D = JsonValue> = ResourceLink<K> & { data: D; readonly schemaVersion: number };
export type BackendArtifact<K extends string = ArtifactKind, D = JsonValue> = Omit<B['Script'], 'kind' | 'data'> &
	Artifact<K, D> & { kind: K };
export type Script = BackendArtifact<'script', B['ScriptDataV1']> & { readonly content: ScriptPackage };
export type Prompt = BackendArtifact<'prompt', B['PromptDataV1']>;
export type DirectingPlan = BackendArtifact<'directing_plan', B['DirectingPlanDataV1']>;
export interface ArtifactSchema<K extends string, D, W extends boolean = boolean> {
	readonly kind: K;
	readonly schemaVersion: number;
	readonly writable: W;
	parse(data: unknown): D;
}
export interface TypedArtifactReader<K extends string, D> {
	get(ref: ResourceRef<K>): Promise<Artifact<K, D>>;
}
export interface TypedArtifactWriter<K extends string, D> extends TypedArtifactReader<K, D> {
	create(input: { data: D; batch_id?: string | null }, options?: StoreCommandOptions): Promise<Artifact<K, D>>;
	update(ref: ResourceRef<K>, input: { data: D; batch_id?: string | null }, options?: StoreCommandOptions): Promise<Artifact<K, D>>;
}
export type TypedArtifacts<K extends string, D, W extends boolean> = W extends true ? TypedArtifactWriter<K, D> : TypedArtifactReader<K, D>;
export interface ArtifactsClient {
	get(ref: ResourceRef): Promise<Artifact>;
	create(
		input: { kind: ArtifactKind; schema_version: number; data: JsonValue; batch_id?: string | null },
		options?: StoreCommandOptions,
	): Promise<BackendArtifact>;
	update(ref: ResourceRef, input: { data: JsonValue; batch_id?: string | null }, options?: StoreCommandOptions): Promise<BackendArtifact>;
	forSchema<K extends string, D, W extends boolean>(schema: ArtifactSchema<K, D, W>): TypedArtifacts<K, D, W>;
}
export interface ProfilesClient<T, C, U> {
	get(id: string, query?: { version?: number }): Promise<T>;
	list(query?: StoreQuery): Promise<BackendPage<T>>;
	create(input: C, options?: CommandOptions): Promise<T>;
	update(input: Omit<U, 'version'> & { base: T }, options?: CommandOptions): Promise<T>;
}
export interface ProductImageUploadResult {
	readonly productId: string;
	readonly assetId: string;
	readonly product: Product;
	readonly asset: Asset;
}
export interface ProductsClient extends ProfilesClient<Product, B['ProductCreate'], B['ProductUpdate']> {
	uploadImage(input: { base: Product; file: File }, options?: CommandOptions): Promise<ProductImageUploadResult>;
}
export interface AssetsClient {
	get(id: string): Promise<Asset>;
	register(input: B['AssetCreate'], options?: CommandOptions): Promise<Asset>;
	upload(file: File, options?: CommandOptions & { kind?: B['AssetOut']['kind'] }): Promise<Asset>;
	uploadIntent(input: B['UploadRequest'], options?: CommandOptions): Promise<B['UploadOut']>;
}
export type JobState<T = unknown> = B['JobOut'];
export interface ResultOptions {
	signal?: AbortSignal;
	timeoutMs?: number;
}
export type Job<T = Asset> = B['JobOut'] & {
	subscribe(listener: (state: JobState) => void, onError?: (error: NuvaErrorInfo) => void): Unsubscribe;
	result(options?: ResultOptions): Promise<T>;
};
export interface JobsClient {
	get(id: string): Promise<JobState>;
	cancel(id: string, options?: CommandOptions): Promise<JobState>;
	subscribe(id: string, listener: (state: JobState) => void, onError?: (error: NuvaErrorInfo) => void): Unsubscribe;
}
export type ScriptInput = GenerateScriptInput;
export type PromptInput = GeneratePromptInput;
export interface ScriptsClient {
	get(ref: ResourceRef<'script'>): Promise<Script>;
	create(
		input: { content: ScriptPackage; product?: string | null; skill?: string | null; batch_id?: string | null },
		options?: StoreCommandOptions,
	): Promise<Script>;
	update(
		ref: ResourceRef<'script'>,
		input: { content: ScriptPackage; product?: string | null; skill?: string | null; batch_id?: string | null },
		options?: StoreCommandOptions,
	): Promise<Script>;
	generate(input: ScriptInput, options?: StoreCommandOptions): Promise<Script>;
}
export interface PromptsClient extends TypedArtifactWriter<'prompt', B['PromptDataV1']> {
	get(ref: ResourceRef<'prompt'>): Promise<Prompt>;
	create(input: { data: B['PromptDataV1']; batch_id?: string | null }, options?: StoreCommandOptions): Promise<Prompt>;
	update(
		ref: ResourceRef<'prompt'>,
		input: { data: B['PromptDataV1']; batch_id?: string | null },
		options?: StoreCommandOptions,
	): Promise<Prompt>;
	generate(input: PromptInput, options?: StoreCommandOptions): Promise<{ prompts: Prompt[] }>;
}
/** Proposed backend operation-key overlay; omitted for fresh unkeyed submissions. */
export interface StoreCommandOptions extends CommandOptions {
	readonly idempotencyKey?: string;
}
export type VideoCommandOptions = StoreCommandOptions;
export interface StoreClients {
	readonly artifacts: ArtifactsClient;
	readonly assets: AssetsClient;
	readonly products: ProductsClient;
	readonly brands: ProfilesClient<Brand, B['BrandCreate'], B['BrandUpdate']>;
	readonly characters: ProfilesClient<Character, B['CharacterCreate'], B['CharacterUpdate']>;
	readonly scripts: ScriptsClient;
	readonly prompts: PromptsClient;
	readonly videos: {
		generate(input: B['GenerateVideo'], options?: VideoCommandOptions): Promise<Job<Asset>>;
		assemble(
			input: import('./assembly-schemas.js').AssembleVideoInput,
			options?: StoreCommandOptions,
		): Promise<import('./assembly-schemas.js').AssembledVideoResult>;
	};
	readonly jobs: JobsClient;
	readonly ads: {
		get(id: string): Promise<Ad>;
		list(query?: StoreQuery): Promise<BackendPage<Ad>>;
	};
	readonly batches: {
		get(id: string): Promise<Batch>;
		list(query?: StoreQuery): Promise<BackendPage<B['BatchSummary']>>;
	};
	readonly skills: {
		get(id: string): Promise<Skill>;
		list(query?: StoreQuery): Promise<BackendPage<B['SkillOut']>>;
		version(id: string, version: number): Promise<B['SkillVersionOut']>;
	};
}
