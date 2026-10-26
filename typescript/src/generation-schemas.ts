import { backendIdSchema } from './backend-id.js';
import { z } from 'zod';
/** Shared Agent-owned creation inputs. They do not change the pinned backend DTOs. */
export const skillSelectionSchema = z.object({ id: backendIdSchema, version: z.number().int().positive().optional() }).strict();
export const generateScriptSchema = z
	.object({
		product: backendIdSchema,
		base: backendIdSchema.optional(),
		batch_id: backendIdSchema.optional(),
		acceptable_duration_ms: z
			.object({ min: z.number().int().positive(), max: z.number().int().min(5000) })
			.strict()
			.refine((range) => range.min <= range.max, 'Minimum duration must not exceed maximum.'),
		instruction: z.string().max(32000).optional(),
		skill: skillSelectionSchema.optional(),
	})
	.strict();
export const generatePromptSchema = z
	.object({
		script: backendIdSchema,
		batch_id: backendIdSchema.optional(),
		instruction: z.string().max(32000).optional(),
		ratio: z.enum(['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']).optional(),
		skill: skillSelectionSchema.optional(),
	})
	.strict();
export type SkillSelection = z.infer<typeof skillSelectionSchema>;
export type GenerateScriptInput = z.infer<typeof generateScriptSchema>;
export type GeneratePromptInput = z.infer<typeof generatePromptSchema>;
