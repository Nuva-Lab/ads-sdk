import { translate, msg, UiError } from "./i18n.js";
import type { ResourceLink } from "@nuva/sdk";
const names: Record<string, string> = {
  script: "Script",
  prompt: "Prompt",
  job: "Clip",
  batch: "Batch",
  ad: "Ad",
};
type Numbered = { numbers: Map<string, number>; next: Map<string, number> };
interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
/** Local display labels are assigned once per conversation; canonical references never change. */
export class ResourceIndex {
  private sessions = new Map<string, Numbered>();
  private warned = false;
  constructor(
    private scope: string,
    private storage: StoragePort,
    private onStorageError: () => void = () => {},
  ) {}
  private key(session: string) {
    return `${this.scope}:resource-index:${session}`;
  }
  private warn() {
    if (!this.warned) {
      this.warned = true;
      this.onStorageError();
    }
  }
  private read(session: string): Numbered {
    const prior = this.sessions.get(session);
    if (prior) return prior;
    const value: Numbered = { numbers: new Map(), next: new Map() };
    try {
      const raw = this.storage.getItem(this.key(session));
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.version !== 1 || !Array.isArray(saved.entries))
          throw new UiError(msg("Invalid display index"));
        const taken = new Set<string>();
        for (const entry of saved.entries) {
          if (
            !Array.isArray(entry) ||
            entry.length !== 3 ||
            typeof entry[0] !== "string" ||
            typeof entry[1] !== "string" ||
            !Number.isSafeInteger(entry[2]) ||
            entry[2] < 1
          )
            throw new UiError(msg("Invalid display index"));
          const [kind, id, number] = entry,
            key = JSON.stringify([kind, id]),
            ordinal = JSON.stringify([kind, number]);
          if (value.numbers.has(key) || taken.has(ordinal))
            throw new UiError(msg("Duplicate display index"));
          value.numbers.set(key, number);
          taken.add(ordinal);
          value.next.set(kind, Math.max(value.next.get(kind) ?? 0, number));
        }
      }
    } catch {
      value.numbers.clear();
      value.next.clear();
      this.warn();
    }
    this.sessions.set(session, value);
    return value;
  }
  private save(session: string, value: Numbered) {
    try {
      this.storage.setItem(
        this.key(session),
        JSON.stringify({
          version: 1,
          entries: [...value.numbers].map(([key, n]) => [
            ...JSON.parse(key),
            n,
          ]),
        }),
      );
    } catch {
      this.warn();
    }
  }
  private assign(session: string, record: ResourceLink) {
    if (!session || !Object.hasOwn(names, record.ref.kind)) return;
    const value = this.read(session),
      key = JSON.stringify([record.ref.kind, record.ref.id]);
    const existing = value.numbers.get(key);
    if (existing !== undefined)
      return { number: existing, changed: false, value };
    const number = (value.next.get(record.ref.kind) ?? 0) + 1;
    value.next.set(record.ref.kind, number);
    value.numbers.set(key, number);
    return { number, changed: true, value };
  }
  seed(records: readonly (ResourceLink & { sessionId: string })[]) {
    const changed = new Set<string>();
    for (const record of records) {
      if (this.assign(record.sessionId, record)?.changed)
        changed.add(record.sessionId);
    }
    for (const session of changed) this.save(session, this.read(session));
  }
  label(session: string, record: ResourceLink): string | undefined {
    const item = this.assign(session, record);
    if (!item) return;
    if (item.changed) this.save(session, item.value);
    return `${translate(names[record.ref.kind])} ${String(item.number).padStart(2, "0")}`;
  }
}
export function indexedTitle(
  kind: string,
  title: string,
  index?: string,
): string {
  if (!index) return title;
  const generic = new Set([
    "prompt",
    "video prompt",
    "video clip",
    "video generation",
    "generated clip",
    "final ad",
    "ad",
    "batch",
    "script",
  ]);
  for (const key of [
    "Prompt",
    "Video prompt",
    "Video clip",
    "Video generation",
    "Generated clip",
    "Final ad",
    "Ad",
    "Batch",
    "Script",
  ])
    generic.add(translate(key).toLowerCase());
  return generic.has(title.trim().toLowerCase()) ? index : title;
}
export function promptExcerpt(raw: string): string {
  const start = /^summary:[ \t]*/im.exec(raw);
  let selected = raw;
  if (start) {
    const tail = raw.slice(start.index + start[0].length);
    const next =
      /^(?:subject_definitions|retention_analysis|detailed_description|overall_soundscape|non_diegetic_music):/im.exec(
        tail,
      );
    selected = tail.slice(0, next?.index ?? tail.length).trim() || raw;
  }
  const text = selected
    .replace(/^subject_definitions:[ \t]*/i, "")
    .replace(/<(?:Subject|Picture|Image|Video|Audio)\s+(\d+)>/gi, (match) =>
      match.slice(1, -1),
    )
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 180 ? text.slice(0, 180).trimEnd() + "…" : text;
}
