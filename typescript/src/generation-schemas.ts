import { backendIdSchema } from './backend-id.js';
import { z } from 'zod';
import { scriptSchema, storyboardSchema } from './script-v3.js';
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
 * The Storyboard request the Agent's writer endpoint takes, in one of three forms:
 * - new: `{ script, cast?, instruction? }`; the writer casts, stages and shoots the Script (`storyboards.generate`);
 * - revision: `{ base, instruction, cast? }`; the writer changes the base Storyboard as instructed (`storyboards.revise`);
 * - edit: `{ content, base }`; saves an edited Storyboard as a new version of its base (`storyboards.update`).
 * `{ content }` without a base is how the Session Agent saves a Storyboard it wrote itself; the endpoint refuses it
 * from a direct request, so a customer's Storyboard always comes from the writer. Every form runs the same checks.
 * `generatePromptSchema` turns a Storyboard's clips into video Prompts.
 */
export const generateStoryboardSchema = z
	.object({
		script: backendIdSchema.optional(),
		base: backendIdSchema.optional().describe('The Storyboard this one revises or edits.'),
		content: storyboardSchema.optional().describe('A complete Storyboard to save as written: an edit of base.'),
		cast: z
			.record(z.string().max(40), backendIdSchema)
			.optional()
			.describe('Characters to cast, by Script role: { role: characterId }. Other roles are cast by the writer.'),
		instruction: z.string().max(32000).optional(),
		batch_id: backendIdSchema.optional(),
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
/** `storyboards.generate`: a new Storyboard for a Script. */
export const newStoryboardSchema = z
	.object({
		script: backendIdSchema,
		cast: generateStoryboardSchema.shape.cast,
		instruction: z.string().max(32000).optional(),
		batch_id: backendIdSchema.optional(),
	})
	.strict();
/** `storyboards.revise(ref, …)`: the writer changes a Storyboard as instructed and saves it as a new version. */
export const reviseStoryboardSchema = z
	.object({ instruction: z.string().min(1).max(32000), cast: generateStoryboardSchema.shape.cast })
	.strict();
/** `storyboards.update(ref, …)`: an edited Storyboard, checked and saved as a new version. */
export const updateStoryboardSchema = z.object({ content: storyboardSchema }).strict();
/**
 * The Agent's Script endpoint also takes an edit, `{ base, content }`: the user's edited Script, checked as a Session
 * save of a revision is (schema, the pinned Product's facts and images, reserved roles) and saved as a new version.
 */
export const editScriptSchema = z.object({ base: backendIdSchema, content: scriptSchema }).strict();
/** `scripts.generate`: a new Script for a Product. */
export const newScriptSchema = generateScriptSchema.omit({ base: true });
/** `scripts.revise(ref, …)`: the writer changes a Script as instructed. Without a range it keeps the Script's length. */
export const reviseScriptSchema = z
	.object({
		instruction: z.string().min(1).max(32000),
		acceptable_duration_ms: generateScriptSchema.shape.acceptable_duration_ms.optional(),
	})
	.strict();
/**
 * A Prompt request: compiles a saved Storyboard's clips (or one clip) into video Prompts, in clip order. A clip
 * compiled before from the same inputs returns its saved Prompt instead of being compiled again.
 */
export const generatePromptSchema = z
	.object({
		storyboard: backendIdSchema,
		clip: z
			.string()
			.regex(/^C\d{2}$/, 'Clip IDs use C01, C02, ...')
			.optional()
			.describe('One clip of the Storyboard; all of its clips when left out.'),
		ratio: z.enum(['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']).optional(),
	})
	.strict();
export type SkillSelection = z.infer<typeof skillSelectionSchema>;
export type GenerateScriptInput = z.infer<typeof generateScriptSchema>;
export type GenerateStoryboardInput = z.infer<typeof generateStoryboardSchema>;
export type EditScriptInput = z.infer<typeof editScriptSchema>;
export type NewScriptInput = z.infer<typeof newScriptSchema>;
export type ReviseScriptInput = z.infer<typeof reviseScriptSchema>;
export type NewStoryboardInput = z.infer<typeof newStoryboardSchema>;
export type ReviseStoryboardInput = z.infer<typeof reviseStoryboardSchema>;
export type UpdateStoryboardInput = z.infer<typeof updateStoryboardSchema>;
export type GeneratePromptInput = z.infer<typeof generatePromptSchema>;
