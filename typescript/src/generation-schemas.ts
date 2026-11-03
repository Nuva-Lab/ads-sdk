import { backendIdSchema } from './backend-id.js';
import { z } from 'zod';
import { storyboardSchema } from './script-v3.js';
/** Shared Agent-owned creation inputs. They do not change the pinned backend DTOs. The writers choose their Skills from their agent setups; a request names none. */
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
	})
	.strict();
/**
 * A Storyboard request, in one of three forms:
 * - new: `{ script, cast?, instruction? }`; the writer casts, stages and shoots the Script;
 * - revision: `{ base, instruction, cast? }`; the writer changes the base Storyboard as instructed;
 * - edit: `{ content, base? }`; saves a Storyboard written or edited by hand.
 * Each saves the Storyboard and compiles its clips for video generation; a revision or edit recompiles only the
 * clips that changed.
 */
export const generateStoryboardSchema = z
	.object({
		script: backendIdSchema.optional(),
		base: backendIdSchema.optional().describe('The Storyboard this one revises or edits.'),
		content: storyboardSchema.optional().describe('A complete Storyboard to save as written.'),
		cast: z
			.record(z.string().max(40), backendIdSchema)
			.optional()
			.describe('Characters to cast, by Script role: { role: characterId }. Other roles are cast by the writer.'),
		instruction: z.string().max(32000).optional(),
		batch_id: backendIdSchema.optional(),
		ratio: z.enum(['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']).optional(),
	})
	.strict()
	.superRefine((value, ctx) => {
		const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
		if (value.content !== undefined) {
			if (value.script !== undefined || value.cast !== undefined || value.instruction !== undefined)
				fail('content is a complete Storyboard: leave out script, cast and instruction.');
		} else if ((value.script === undefined) === (value.base === undefined)) fail('Give a script for a new Storyboard, or a base to revise.');
		else if (value.base !== undefined && value.instruction === undefined) fail('A revision needs an instruction saying what to change.');
	});
export type SkillSelection = z.infer<typeof skillSelectionSchema>;
export type GenerateScriptInput = z.infer<typeof generateScriptSchema>;
export type GenerateStoryboardInput = z.infer<typeof generateStoryboardSchema>;
