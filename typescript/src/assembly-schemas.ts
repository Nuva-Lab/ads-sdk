import { backendIdSchema } from './backend-id.js';
import { z } from 'zod';
const dimension = z
	.number()
	.int()
	.min(2)
	.max(1920)
	.refine((value) => value % 2 === 0, 'Dimension must be even.');
export const assembleVideoSchema = z
	.object({
		batch_id: backendIdSchema,
		composition: z
			.object({
				version: z.literal(1),
				clips: z
					.array(
						z
							.object({ asset_id: backendIdSchema, start_ms: z.number().int().nonnegative(), end_ms: z.number().int().positive() })
							.strict()
							.refine((value) => value.end_ms > value.start_ms, 'end_ms must be after start_ms.'),
					)
					.min(1)
					.max(32),
				width: dimension,
				height: dimension,
				fps: z.number().int().min(1).max(60),
				audio: z.enum(['preserve', 'mute']),
			})
			.strict()
			.refine(
				(value) => value.clips.reduce((sum, clip) => sum + clip.end_ms - clip.start_ms, 0) <= 600000,
				'Assembly must not exceed ten minutes.',
			),
	})
	.strict();
export const assembledVideoSchema = z
	.object({
		assetId: backendIdSchema,
		uri: z.url().refine((value) => {
			const url = new URL(value);
			return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
		}, 'Assembly URI must be an HTTP(S) Asset URL without credentials.'),
	})
	.strict();
export type AssembleVideoInput = z.infer<typeof assembleVideoSchema>;
export type AssembledVideoResult = z.infer<typeof assembledVideoSchema>;
