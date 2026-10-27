import { z } from 'zod';
import { backendSchema } from './backend-schema.js';
import type { BackendSchemas } from './backend-target.js';
import { frozen } from './protocol.js';
import type { NuvaErrorCode, NuvaErrorInfo } from './types.js';

export class NuvaError extends Error implements NuvaErrorInfo {
	readonly code: NuvaErrorCode;
	readonly retryable: boolean;
	readonly details?: { path: string; message: string }[] | null;
	readonly requestId?: string;
	readonly acceptance?: 'not_accepted' | 'unknown';
	constructor(info: NuvaErrorInfo & { details?: { path: string; message: string }[] | null }) {
		super(info.message);
		this.name = 'NuvaError';
		this.code = info.code;
		this.retryable = info.retryable;
		if (info.details !== undefined) this.details = info.details;
		if (info.requestId !== undefined) this.requestId = info.requestId;
		if (info.acceptance !== undefined) this.acceptance = info.acceptance;
	}
	toJSON(): NuvaErrorInfo & { details?: { path: string; message: string }[] | null } {
		return {
			code: this.code,
			message: this.message,
			retryable: this.retryable,
			...(this.details === undefined ? {} : { details: this.details }),
			...(this.requestId === undefined ? {} : { requestId: this.requestId }),
			...(this.acceptance === undefined ? {} : { acceptance: this.acceptance }),
		};
	}
}

/** Records already persisted before a later Prompt creation failed. These are
 * validated raw backend records, not a successful generation response. */
export interface PartialCreationSaved {
	prompts: BackendSchemas['Prompt'][];
}
export class PartialCreationError extends NuvaError {
	readonly code = 'PARTIAL_CREATION' as const;
	readonly saved: PartialCreationSaved;
	constructor(info: NuvaErrorInfo, saved: unknown) {
		const parsed = z
			.object({ prompts: z.array(backendSchema('Prompt')) })
			.strict()
			.safeParse(saved);
		if (
			!parsed.success ||
			parsed.data.prompts.some(
				(prompt) => prompt.schema_version !== 1 || prompt.relationships.some((relationship) => relationship.target.kind === 'directing_plan'),
			) ||
			new Set(parsed.data.prompts.map((prompt) => prompt.id)).size !== parsed.data.prompts.length
		)
			throw new NuvaError({
				code: 'SERVICE_ERROR',
				message: 'Invalid partial Prompt records; expected unique independent Prompts without Plan associations.',
				retryable: false,
				...(info.requestId === undefined ? {} : { requestId: info.requestId }),
				acceptance: 'unknown',
			});
		super({ ...info, code: 'PARTIAL_CREATION', acceptance: 'unknown' });
		this.name = 'PartialCreationError';
		this.saved = frozen(parsed.data);
	}
	override toJSON(): ReturnType<NuvaError['toJSON']> & { saved: PartialCreationSaved } {
		return { ...super.toJSON(), saved: this.saved };
	}
}
/** The upload succeeded. Preserve its Asset if optimistic Product attachment fails. */
export class ProductImageUploadError extends NuvaError {
	readonly productId: string;
	readonly asset: import('./stores.js').Asset;
	readonly assetId: string;
	constructor(productId: string, asset: import('./stores.js').Asset, error: unknown) {
		const info =
			error instanceof NuvaError
				? error.toJSON()
				: {
						code: 'SERVICE_ERROR' as const,
						message: 'Image uploaded, but Product attachment failed.',
						retryable: false,
						acceptance: 'unknown' as const,
					};
		super(info);
		this.name = 'ProductImageUploadError';
		this.productId = productId;
		this.asset = frozen(structuredClone(asset));
		this.assetId = asset.id;
	}
	override toJSON() {
		return { ...super.toJSON(), productId: this.productId, assetId: this.assetId, asset: this.asset };
	}
}

export function errorInfo(error: unknown): NuvaErrorInfo {
	if (error instanceof NuvaError) return error.toJSON();
	return { code: 'SERVICE_ERROR', message: error instanceof Error ? error.message : String(error), retryable: false };
}
