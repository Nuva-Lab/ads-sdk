import type { NewPromptsInput, NewScriptInput, ReviseScriptInput, NewStoryboardInput, ReviseStoryboardInput } from './generation-schemas.js';
import type { ScriptContent, StoryboardContent } from './script-v3.js';
import type { CommandOptions, JsonObject, JsonValue, ResourceRef, ResourceLink, AdsErrorInfo, Page, Unsubscribe } from './types.js';
import type { BackendSchemas as B } from './backend-target.js';
import type { ScriptPackage } from './service-schemas.js';
export type { ScriptPackage } from './service-schemas.js';
export type StoreQuery = { limit?: number; cursor?: string | null; brand_id?: string; batch_id?: string };
export type Product = B['Product'] & ResourceLink<'product'>;
export type Brand = B['Brand'] & ResourceLink<'brand'>;
export type Character = B['Character'] & ResourceLink<'character'>;
export type MutableResource = Product | Brand | Character;
/** An Asset keeps its own `label` (what the uploader said it shows, or null); it is not replaced by a display label. */
export type Asset = B['AssetOut'] & Omit<ResourceLink<'asset'>, 'label'>;
export type Ad = B['AdOut'] & ResourceLink<'ad'>;
export type Batch = B['BatchOut'] & ResourceLink<'batch'>;
/** A Skill at one version: the latest, or the one you asked for. `main_version` is the version new work uses. */
export type Skill = Pick<B['SkillRead'], 'id' | 'name' | 'platform' | 'main_version' | 'created_at'> & {
	readonly version: number;
	readonly description: string | null;
	readonly note: string | null;
	readonly attributes: JsonObject;
	readonly files: readonly B['SkillFile'][];
	readonly download_url_expires_at: string;
} & ResourceLink<'skill'>;
export type Composition = B['CompositionReadV1'];
export type ArtifactKind = 'script' | 'storyboard' | 'prompt';
export type Artifact<K extends string = string, D = JsonValue> = ResourceLink<K> & { data: D };
/** Each kind's record as the service keeps it: what it was made from differs by kind. */
type ArtifactRecords = { script: B['Script']; storyboard: B['Storyboard']; prompt: B['Prompt'] };
export type BackendArtifact<K extends ArtifactKind = ArtifactKind, D = JsonValue> = Omit<ArtifactRecords[K], 'kind' | 'data'> &
	Artifact<K, D> & { kind: K };
/** A Script: the v3 idea (`content`), or a read-only v2 ScriptPackage saved before Storyboards (`legacy`). */
export type Script = BackendArtifact<'script', B['ScriptDataV1']> &
	({ readonly format: 3; readonly content: ScriptContent; readonly legacy?: undefined } | { readonly format: 2; readonly legacy: ScriptPackage; readonly content?: undefined });
/** A Storyboard: how a Script is cast and shot. `prompts.generate({ storyboard })` turns its clips into the Prompts `videos.generate` renders. */
export type Storyboard = BackendArtifact<'storyboard', B['StoryboardDataV1']> & { readonly content: StoryboardContent };
export type Prompt = BackendArtifact<'prompt', B['PromptReadV1']>;
/** The version of a Brand, Product or Character you read: `update` needs it, so edits made since aren't overwritten. */
export type EntityRef = { readonly id: string; readonly version: number };
/** Brands, Products and Characters: you change them in place, and each change saves the next `version`. */
export interface ProfilesClient<T, C, E extends { data?: unknown }> {
	/** The latest version, or `version`. */
	get(id: string, query?: { version?: number }): Promise<T>;
	list(query?: StoreQuery): Promise<Page<T>>;
	create(input: C, options?: StoreCommandOptions): Promise<T>;
	/**
	 * Changes the fields `data` sends and keeps the rest; a list is replaced as a whole, `[]` empties it and `null`
	 * clears an optional value. `ref` is what you read (a record, or `{ id, version }`): if someone saved a newer
	 * version since, this fails with `REVISION_CONFLICT` and nothing changes; read it again and reapply your change.
	 */
	update(ref: EntityRef, changes: Omit<E, 'version'>, options?: StoreCommandOptions): Promise<T>;
}
/** What `update` changes: only the `data` fields you send, and for a Product its Brand. */
export type ProductChanges = Omit<B['ProductEdit'], 'version'>;
export type BrandChanges = Omit<B['BrandEdit'], 'version'>;
export type CharacterChanges = Omit<B['CharacterEdit'], 'version'>;
export interface ProductsClient extends ProfilesClient<Product, B['ProductCreate'], B['ProductEdit']> {
	/**
	 * Deletes the Product for everyone in the organization: it is no longer listed, `get` of any version is `NOT_FOUND`,
	 * and it can't be edited or used for new Scripts. What was made from it stays readable but can't be revised.
	 * Deleting it again succeeds.
	 */
	delete(id: string, options?: CommandOptions): Promise<void>;
}
export interface AssetsClient {
	get(id: string): Promise<Asset>;
	/**
	 * Adds a file, uploaded or fetched from a public HTTPS URL. `label` and `description` say what it shows (for example
	 * which side of a package); the writers read them. The same file added again returns the same Asset, so retrying a
	 * file upload is safe; `idempotencyKey` applies to a URL. To change the text later, use `update`.
	 */
	upload(
		source: File | { readonly url: string },
		options?: StoreCommandOptions & { kind?: B['AssetOut']['kind']; label?: string; description?: string },
	): Promise<Asset>;
	/**
	 * Changes an Asset's `label` and `description`: only the fields you send; `null` removes one. The file never
	 * changes. Only the user who uploaded it, or an admin above them, can edit it.
	 */
	update(id: string, changes: AssetChanges, options?: CommandOptions): Promise<Asset>;
}
/** What `assets.update` changes. */
export type AssetChanges = B['AssetEdit'];
export type JobState<T = unknown> = B['JobOut'];
export interface ResultOptions {
	signal?: AbortSignal;
	timeoutMs?: number;
}
export type Job<T = Asset> = B['JobOut'] & {
	subscribe(listener: (state: JobState) => void, onError?: (error: AdsErrorInfo) => void): Unsubscribe;
	result(options?: ResultOptions): Promise<T>;
};
export interface JobsClient {
	get(id: string): Promise<JobState>;
	subscribe(id: string, listener: (state: JobState) => void, onError?: (error: AdsErrorInfo) => void): Unsubscribe;
	/** Stops a queued or running Job; it ends `cancelled`. A finished Job can't be cancelled (`JOB_FINISHED`). */
	cancel(id: string, options?: CommandOptions): Promise<JobState>;
}
export type ScriptInput = NewScriptInput;
/** `storyboards.generate(input)`: the Script as `{ id }` or the Script you read. */
export type StoryboardInput = Omit<NewStoryboardInput, 'script'> & { readonly script: ArtifactRef };
/** `prompts.generate(input)`: the Storyboard as `{ id }` or the Storyboard you read. */
export type PromptInput = Omit<NewPromptsInput, 'storyboard'> & { readonly storyboard: ArtifactRef };
/**
 * Scripts, Storyboards and Prompts never change: each method returns a new one, and the one you started from stays as
 * it was. `generate` has the writer make one from scratch; `generateFrom` has the writer make one from an existing one,
 * as instructed; `createFrom` saves your own changes to an existing one, after the same checks as the writer's. Calling
 * a `…From` method twice on the same base gives two alternatives side by side.
 */
/** `base` for a `…From` method: a reference, or the record you hold (then it isn't read again). */
/** A Script, Storyboard or Prompt: `{ id }`, or the record you read. */
export type ArtifactRef = { readonly id: string };
/** What a method starts from: a reference, or the record you read (then it is not read again). */
export type Base<T> = ArtifactRef | T;
export interface ScriptsClient {
	get(ref: ArtifactRef): Promise<Script>;
	/** The writer writes a new Script for a Product. */
	generate(input: ScriptInput, options?: StoreCommandOptions): Promise<Script>;
	/** The writer writes a new Script from `base`, as instructed. Without `acceptable_duration_ms` it keeps `base`'s length. */
	generateFrom(base: Base<Script>, input: ReviseScriptInput, options?: StoreCommandOptions): Promise<Script>;
	/** Saves `base` with the top-level content fields you change (`concept`, `roles`, `panels`, …); the rest is copied from `base`. */
	createFrom(base: Base<Script>, changes: Partial<ScriptContent>, options?: StoreCommandOptions): Promise<Script>;
}
export interface StoryboardsClient {
	get(ref: ArtifactRef): Promise<Storyboard>;
	/** The writer writes a new Storyboard for a Script. */
	generate(input: StoryboardInput, options?: StoreCommandOptions): Promise<Storyboard>;
	/** The writer writes a new Storyboard from `base`, as instructed, with the latest Product and Characters (a `cast` entry's `version` pins one). */
	generateFrom(base: Base<Storyboard>, input: ReviseStoryboardInput, options?: StoreCommandOptions): Promise<Storyboard>;
	/**
	 * Saves `base` with the top-level content fields you change (`cast`, `direction`, `clips`); the rest is copied from
	 * `base`, which keeps its Product and Character versions: an edit changes only what you edit.
	 */
	createFrom(base: Base<Storyboard>, changes: Partial<Omit<StoryboardContent, 'script'>>, options?: StoreCommandOptions): Promise<Storyboard>;
}
/** The render fields of a Prompt: the only ones `prompts.createFrom` changes. */
export type PromptChanges = Partial<Pick<B['PromptReadV1'], 'prompt' | 'image_asset_ids' | 'video_asset_ids' | 'audio_asset_ids' | 'seconds' | 'ratio'>>;
/**
 * Video Prompts: what a clip is rendered from. `generate` compiles a Storyboard's clips. To change what a clip shows,
 * change its Storyboard (`storyboards.createFrom` or `generateFrom`) and compile again; `createFrom` saves a Prompt of
 * your own from one, and raw `videos.generate({ input })` renders one written from scratch.
 */
export interface PromptsClient {
	get(ref: ArtifactRef): Promise<Prompt>;
	/** Compiles a Storyboard's clips, or one clip, into Prompts in clip order. A clip compiled before from the same inputs returns its saved Prompt. */
	generate(input: PromptInput, options?: StoreCommandOptions): Promise<{ prompts: (Prompt & { data: { clip_id: string } })[] }>;
	/** Saves `base` with the render fields you change; the rest is copied from `base`. Its text must name every attached file. */
	createFrom(base: Base<Prompt>, changes: PromptChanges, options?: StoreCommandOptions): Promise<Prompt>;
}
/**
 * `idempotencyKey` makes a write safe to retry: the same key with the same input returns what the first call made,
 * instead of making it again. Keep it for retries of one write, and use a new one for a new write.
 */
export interface StoreCommandOptions extends CommandOptions {
	readonly idempotencyKey?: string;
}
export type VideoCommandOptions = StoreCommandOptions;
export type RawPromptInput = B['RawPromptInput'];
/** A saved Prompt ID or raw input. Without `batch_id` (or with `batch_id: null`, which means the same) a saved Prompt's Job joins the Prompt's Batch; raw input has none. */
export type GenerateVideoInput = Omit<B['GenerateVideo'], 'prompt' | 'input'> & ({ prompt: ArtifactRef; input?: null } | { input: RawPromptInput; prompt?: null });
/** The kinds of item a share can be given for. Batches, Jobs and Ads are never shared. */
export type ShareableKind = 'brand' | 'product' | 'character' | 'asset' | 'script' | 'storyboard' | 'prompt';
/** An Artifact may be named by any of its versions' IDs; its shares cover every version and carry its first version's ID. */
export interface ShareTarget {
	readonly kind: ShareableKind;
	readonly id: string;
}
/** `read` lets everyone at or below the scope see the item and use it; `write` also lets them edit it. */
export type ShareAccess = 'read' | 'write';
export interface Share {
	readonly kind: ShareableKind;
	readonly id: string;
	/** `customer` (everyone in the organization) or the external ID of an org or group. */
	readonly scope: string;
	readonly access: ShareAccess;
	readonly created_at: string;
}
/**
 * An item is private to the user who made it, and to the admins above them, until it is shared with a scope. Only an
 * admin of the scope (or above it) shares into it, for items they own or administer. A share never allows deleting the
 * item or sharing it on.
 */
export interface SharesClient {
	/** The item's shares, for whoever may share it: its owner or an admin above them. Others who can read the item get `FORBIDDEN`. */
	list(item: ShareTarget): Promise<Share[]>;
	/** Shares the item with everyone at or below `scope`. A repeat changes the access. */
	set(item: ShareTarget, scope: string, access: ShareAccess, options?: CommandOptions): Promise<Share>;
	/** Removes the item's share with `scope`; it succeeds when there was none. Those it reached get `NOT_FOUND` again. */
	remove(item: ShareTarget, scope: string, options?: CommandOptions): Promise<void>;
}
export interface StoreClients {
	readonly assets: AssetsClient;
	readonly products: ProductsClient;
	readonly brands: ProfilesClient<Brand, B['BrandCreate'], B['BrandEdit']>;
	readonly characters: ProfilesClient<Character, B['CharacterCreate'], B['CharacterEdit']>;
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
		list(query?: StoreQuery): Promise<Page<Ad>>;
	};
	readonly batches: {
		get(id: string): Promise<Batch>;
		list(query?: StoreQuery): Promise<Page<Batch>>;
	};
	readonly shares: SharesClient;
	readonly skills: {
		/** The latest version, or `version`. */
		get(id: string, options?: { version?: number }): Promise<Skill>;
		/** Each Skill at its latest version. */
		list(query?: StoreQuery): Promise<Page<Skill>>;
	};
}
