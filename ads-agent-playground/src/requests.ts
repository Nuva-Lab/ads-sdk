import { msg, UiError } from "./i18n.js";
/** Where a keyed request is recorded: the browser scope and the conversation it belongs to. */
export interface RequestScope {
  scope: string;
  sessionId: string;
}
/** Operations whose unfinished request records are listed with the gallery. */
export const KEYED_OPERATIONS = [
  "script",
  "prompt",
  "storyboard",
  "storyboard-revision",
  "storyboard-edit",
  "video",
  "assembly",
] as const;
/** The record of one keyed operation; `part` (such as a Storyboard clip) gives parallel requests their own records. */
export function pendingSlot(host: RequestScope, operation: string, part?: string) {
  return `${host.scope}:pending:${host.sessionId}:${operation}${part === undefined ? "" : ":" + part}`;
}
/** The input of an unresolved keyed request, if one is recorded. */
export function pendingInput(host: RequestScope, operation: string, part?: string): unknown {
  const prior = localStorage.getItem(pendingSlot(host, operation, part));
  return prior === null ? undefined : JSON.parse((JSON.parse(prior) as { input: string }).input);
}
/** A failed/unknown keyed invocation remains addressable; never silently replace its key or payload. */
export async function keyed<T>(
  host: RequestScope,
  operation: string,
  input: unknown,
  run: (key: string) => Promise<T>,
  part?: string,
): Promise<T> {
  const slot = pendingSlot(host, operation, part);
  const prior = localStorage.getItem(slot),
    encoded = JSON.stringify(input);
  const saved = prior
    ? (JSON.parse(prior) as { key: string; input: string })
    : { key: crypto.randomUUID(), input: encoded };
  if (saved.input !== encoded)
    throw new UiError(
      msg(
        "A previous {p0} request remains unresolved. Restore its exact input and retry to reuse its operation key.",
        { p0: operation },
      ),
    );
  localStorage.setItem(slot, JSON.stringify(saved));
  try {
    const result = await run(saved.key);
    localStorage.removeItem(slot);
    return result;
  } catch (error) {
    // A refused request (not retryable, and not an unreadable answer) is over: its key is not reused.
    const { retryable, code } = error as { retryable?: boolean; code?: string };
    if (retryable === false && code !== "SERVICE_ERROR") localStorage.removeItem(slot);
    throw error;
  }
}
