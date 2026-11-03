import { msg, UiError } from "./i18n.js";
/** Where a keyed request is recorded: the browser scope and the conversation it belongs to. */
export interface RequestScope {
  scope: string;
  sessionId: string;
}
/** Operations whose unfinished request records are listed with the gallery. */
export const KEYED_OPERATIONS = [
  "script",
  "prompts",
  "storyboard",
  "storyboard-revision",
  "storyboard-edit",
  "video",
  "assembly",
] as const;
/** A failed/unknown keyed invocation remains addressable; never silently replace its key or payload. */
export async function keyed<T>(
  host: RequestScope,
  operation: string,
  input: unknown,
  run: (key: string) => Promise<T>,
): Promise<T> {
  const slot = `${host.scope}:pending:${host.sessionId}:${operation}`;
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
    if ((error as { acceptance?: string }).acceptance === "not_accepted")
      localStorage.removeItem(slot);
    throw error;
  }
}
