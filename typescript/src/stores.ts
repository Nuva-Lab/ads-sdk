import type { GeneratePromptInput, NewScriptInput, ReviseScriptInput, NewStoryboardInput, ReviseStoryboardInput } from './schemas.js';
import type { ScriptContent, StoryboardContent } from './script-v3.js';
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
/** An Asset keeps its own `label` (what the uploader said it shows, or null); it is not replaced by a display label. */
export type Asset = B['AssetOut'] & Omit<ResourceLink<'asset'>, 'label'>;
export type Ad = B['AdOut'] & ResourceLink<'ad'>;
export type Batch = B['BatchOut'] & ResourceLink<'batch'>;
export type Skill = B['SkillDetail'] & ResourceLink<'skill'>;
export type Composition = B['CompositionV1'];
export type ArtifactKind = 'script' | 'storyboard' | 'prompt';
export type Artifact<K extends string = string, D = JsonValue> = ResourceLink<K> & { data: D; readonly schemaVersion: number };
export type BackendArtifact<K extends string = ArtifactKind, D = JsonValue> = Omit<B['Script'], 'kind' | 'data'> &
	Artifact<K, D> & { kind: K };
/** A Script: the v3 idea (`content`), or a read-only v2 ScriptPackage saved before Storyboards (`legacy`). */
export type Script = BackendArtifact<'script', B['ScriptDataV1']> &
	({ readonly format: 3; readonly content: ScriptContent; readonly legacy?: undefined } | { readonly format: 2; readonly legacy: ScriptPackage; readonly content?: undefined });
/** A Storyboard: how a Script is cast and shot. `prompts.generate({ storyboard })` turns its clips into the Prompts `videos.generate` renders. */
export type Storyboard = BackendArtifact<'storyboard', B['StoryboardDataV1']> & { readonly content: StoryboardContent };
export type Prompt = BackendArtifact<'prompt', B['PromptDataV1']> & Pick<B['Prompt'], 'relationships'>;
/** How to read one Artifact kind: `artifacts.forSchema(schema).get(ref)` returns its data parsed by `schema`. */
export interface ArtifactSchema<K extends string, D> {
	readonly kind: K;
	readonly schemaVersion: number;
	parse(data: unknown): D;
}
export interface TypedArtifactReader<K extends string, D> {
	get(ref: ResourceRef<K>): Promise<Artifact<K, D>>;
}
/**
 * Reads Artifacts of any kind. Scripts, Storyboards and Prompts are written through their own clients, which run the
 * Agent's checks: `scripts`, `storyboards`, `prompts` and raw `videos.generate({ input })`.
 */
export interface ArtifactsClient {
	get(ref: ResourceRef): Promise<Artifact>;
	forSchema<K extends string, D>(schema: ArtifactSchema<K, D>): TypedArtifactReader<K, D>;
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
	/**
	 * Deletes the Product for everyone in the organization: it is no longer listed, `get` of any version is `NOT_FOUND`,
	 * and it can't be edited or used for new Scripts. What was made from it stays readable but can't be revised.
	 * Deleting it again succeeds.
	 */
	delete(id: string, options?: CommandOptions): Promise<void>;
}
export interface AssetsClient {
	get(id: string): Promise<Asset>;
	register(input: B['AssetCreate'], options?: CommandOptions): Promise<Asset>;
	/** Uploads a file. `label` and `description` say what it shows (for example which part of a product package); writers read them. */
	upload(file: File, options?: CommandOptions & { kind?: B['AssetOut']['kind']; label?: string; description?: string }): Promise<Asset>;
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
	subscribe(id: string, listener: (state: JobState) => void, onError?: (error: NuvaErrorInfo) => void): Unsubscribe;
}
export type ScriptInput = NewScriptInput;
export type StoryboardInput = NewStoryboardInput;
export type PromptInput = GeneratePromptInput;
export interface ScriptsClient {
	get(ref: ResourceRef<'script'>): Promise<Script>;
	/** Writes a new Script for a Product. To change a Script, use `revise` (the writer) or `update` (your edit). */
	generate(input: ScriptInput, options?: StoreCommandOptions): Promise<Script>;
	/** The writer changes the Script as instructed and saves a new Script. Without `acceptable_duration_ms` it keeps the Script's length. */
	revise(ref: ResourceRef<'script'>, input: ReviseScriptInput, options?: StoreCommandOptions): Promise<Script>;
	/** Saves your edited content as a new version of the Script. */
	update(
		ref: ResourceRef<'script'>,
		input: { content: ScriptContent; batch_id?: string | null; relationships?: never },
		options?: StoreCommandOptions,
	): Promise<Script>;
}
export interface StoryboardsClient {
	get(ref: ResourceRef<'storyboard'>): Promise<Storyboard>;
	/** Writes a new Storyboard for a Script. To change one, use `revise` (the writer) or `update` (your edit). */
	generate(input: StoryboardInput, options?: StoreCommandOptions): Promise<Storyboard>;
	/** The writer changes the Storyboard as instructed and saves it as a new version. */
	revise(ref: ResourceRef<'storyboard'>, input: ReviseStoryboardInput, options?: StoreCommandOptions): Promise<Storyboard>;
	/** Checks your edited content as the writer's is checked and saves it as a new version of the Storyboard. */
	update(ref: ResourceRef<'storyboard'>, input: { content: StoryboardContent }, options?: StoreCommandOptions): Promise<Storyboard>;
}
/**
 * Video Prompts. `generate` compiles a Storyboard's clips; to change what a clip renders, revise or update the
 * Storyboard (or change the Product) and generate again. Raw `videos.generate({ input })` saves a Prompt of your own.
 */
export interface PromptsClient {
	get(ref: ResourceRef<'prompt'>): Promise<Prompt>;
	/** Saves a new version of the Prompt. Its text must name every file it attaches (`<Picture N>`, `<Video N>`, `<Audio N>`). */
	update(
		ref: ResourceRef<'prompt'>,
		input: { data: B['PromptDataV1']; batch_id?: string | null; relationships?: never },
		options?: StoreCommandOptions,
	): Promise<Prompt>;
	/** Compiles a Storyboard's clips, or one clip, into video Prompts in clip order. A clip compiled before from the same inputs returns its saved Prompt. */
	generate(input: PromptInput, options?: StoreCommandOptions): Promise<{ prompts: (Prompt & { data: { clip_id: string } })[] }>;
}
/** Proposed backend operation-key overlay; omitted for fresh unkeyed submissions. */
export interface StoreCommandOptions extends CommandOptions {
	readonly idempotencyKey?: string;
}
export type VideoCommandOptions = StoreCommandOptions;
export type RawPromptInput = Omit<B['RawPromptInput'], 'relationships'> & { relationships?: never };
/** A saved Prompt ID or raw input. Without `batch_id` (or with `batch_id: null`, which means the same) a saved Prompt's Job joins the Prompt's Batch; raw input has none. */
export type GenerateVideoInput = Omit<B['GenerateVideo'], 'prompt' | 'input'> & ({ prompt: string; input?: null } | { input: RawPromptInput; prompt?: null });
export interface StoreClients {
	readonly artifacts: ArtifactsClient;
	readonly assets: AssetsClient;
	readonly products: ProductsClient;
	readonly brands: ProfilesClient<Brand, B['BrandCreate'], B['BrandUpdate']>;
	readonly characters: ProfilesClient<Character, B['CharacterCreate'], B['CharacterUpdate']>;
	readonly scripts: ScriptsClient;
	readonly storyboards: StoryboardsClient;
	/** The per-clip video Prompts: `generate` compiles a Storyboard's clips; raw video input saves one. */
	readonly prompts: PromptsClient;
	readonly videos: {
		generate(input: GenerateVideoInput, options?: VideoCommandOptions): Promise<Job<Asset>>;
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
