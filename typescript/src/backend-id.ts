import { z } from 'zod';
/** Backend OrderedUUID: canonical 8-4-4-4-12 hex layout, without RFC version/variant bits. */
export const backendIdPattern = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
export const backendIdSchema = z.string().length(36).regex(new RegExp(backendIdPattern));
