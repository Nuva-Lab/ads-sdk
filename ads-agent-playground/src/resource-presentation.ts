import type { IconName } from "./icons.js";
import { translate } from "./i18n.js";
import type { ResourceLink } from "@nuva/sdk";
export interface ResourcePresentation {
  kind: string;
  title: string;
  summary?: string;
  meta?: string;
  image?: string;
  status?: string;
  icon: IconName;
}
type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const count = (n: number, singular: string, plural = singular + "s") =>
  translate(`{count} ${n === 1 ? singular : plural}`, { count: n });
const join = (...values: (string | undefined)[]) =>
  values.filter(Boolean).join(" · ") || undefined;
const labels: Record<string, string> = {
  product: "Product",
  brand: "Brand",
  character: "Character",
  script: "Script",
  directing_plan: "Directing plan",
  prompt: "Video prompt",
  batch: "Batch",
  job: "Video generation",
  ad: "Ad",
  asset: "Media",
  skill: "Skill",
};
const icons: Record<string, IconName> = {
  product: "layers",
  brand: "layers",
  character: "subject",
  script: "document",
  directing_plan: "layers",
  prompt: "edit",
  batch: "folder",
  job: "video",
  ad: "video",
  asset: "image",
  skill: "spark",
};
export function usefulLabel(record: ResourceLink): string | undefined {
  const value = record.label.trim();
  if (
    !value ||
    (record.ref.id.length >= 16 &&
      value.toLowerCase().includes(record.ref.id.toLowerCase())) ||
    value === record.ref.id ||
    value.toLowerCase() ===
      `${record.ref.kind} ${record.ref.id}`.toLowerCase() ||
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
  )
    return undefined;
  return value;
}
export function duration(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return;
  const seconds = value / 1000;
  return seconds < 60
    ? translate("{seconds} sec", { seconds: Number(seconds.toFixed(1)) })
    : `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0")}`;
}
function imageURL(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (["https:", "http:"].includes(url.protocol)) return value;
  } catch {}
}
function cover(data: RecordValue, assets: RecordValue) {
  for (const id of list(data.images))
    if (typeof id === "string") {
      const url = imageURL(object(assets[id]).download_url);
      if (url) return url;
    }
}
export function resourcePresentation(
  record: ResourceLink,
  value?: unknown,
): ResourcePresentation {
  const row = object(value),
    data = object(row.data),
    kind = record.ref.kind;
  const base: ResourcePresentation = {
    kind: labels[kind] ?? kind.replaceAll("_", " "),
    title: usefulLabel(record) ?? translate(labels[kind] ?? "Resource"),
    icon: icons[kind] ?? "next",
  };
  if (value === undefined) return base;
  if (["product", "brand", "character"].includes(kind)) {
    const images = list(data.images);
    return {
      ...base,
      title: text(data.name) ?? base.title,
      summary:
        text(data.description) ??
        (kind === "product" ? text(data.target_audience) : undefined),
      image: cover(data, object(row.assets)),
      meta: images.length ? count(images.length, "image") : undefined,
    };
  }
  if (kind === "script") {
    const content = object(row.content),
      concept = object(content.concept),
      clips = list(content.clips);
    const durations = clips.map((clip) => object(clip).duration_ms);
    const total =
      durations.length && durations.every((n) => typeof n === "number")
        ? durations.reduce<number>((sum, n) => sum + (n as number), 0)
        : undefined;
    return {
      ...base,
      title: text(concept.name) ?? base.title,
      summary: text(concept.proposition),
      meta: join(
        clips.length ? count(clips.length, "clip") : undefined,
        duration(total),
      ),
    };
  }
  if (kind === "prompt")
    return {
      ...base,
      title:
        text(data.title) ??
        text(data.name) ??
        usefulLabel(record) ??
        translate("Video prompt"),
      summary: text(data.prompt),
      meta: join(
        typeof data.seconds === "number"
          ? duration(data.seconds * 1000)
          : undefined,
        text(data.ratio),
      ),
    };
  if (kind === "batch") {
    const jobs = object(row.jobs),
      total = Object.values(jobs).reduce<number>(
        (sum, n) => sum + (typeof n === "number" ? n : 0),
        0,
      );
    return {
      ...base,
      title: text(row.intent) ?? text(row.title) ?? base.title,
      meta: join(
        count(list(row.ads).length, "ad"),
        total ? count(total, "video job") : undefined,
      ),
    };
  }
  if (kind === "job") {
    const asset = object(row.asset),
      metadata = object(asset.metadata),
      status = text(row.status);
    const display: Record<string, string> = {
      queued: "Queued",
      running: "Generating",
      completed: "Ready",
      failed: "Failed",
      cancelled: "Cancelled",
    };
    return {
      ...base,
      title:
        usefulLabel(record) ??
        translate(
          status === "completed" ? "Generated clip" : "Video generation",
        ),
      status,
      meta: join(
        status ? translate(display[status] ?? status) : undefined,
        duration(metadata.duration_ms),
        text(row.resolution),
      ),
      summary:
        status === "failed" ? text(object(row.error).message) : undefined,
    };
  }
  if (kind === "asset") {
    const metadata = object(row.metadata),
      type = text(row.kind),
      names: Record<string, string> = {
        image: "Image",
        video: "Video",
        audio: "Audio",
      };
    return {
      ...base,
      kind: type ? (names[type] ?? "Media") : "Media",
      title:
        text(metadata.filename) ??
        text(metadata.name) ??
        usefulLabel(record) ??
        (type ? translate(names[type]) : undefined) ??
        translate("Media"),
      image: type === "image" ? imageURL(row.download_url) : undefined,
      icon: type === "audio" ? "audio" : type === "video" ? "video" : "image",
      meta: join(
        duration(metadata.duration_ms),
        typeof metadata.width === "number" &&
          typeof metadata.height === "number"
          ? `${metadata.width} × ${metadata.height}`
          : undefined,
      ),
    };
  }
  if (kind === "ad")
    return {
      ...base,
      title: usefulLabel(record) ?? translate("Final ad"),
      meta: join(
        count(list(object(row.composition).clips).length, "clip"),
        duration(object(object(row.asset).metadata).duration_ms),
      ),
    };
  if (kind === "skill")
    return {
      ...base,
      title: text(row.name) ?? base.title,
      summary: text(row.description) ?? text(object(row.main).description),
      meta:
        typeof row.main_version === "number"
          ? `Version ${row.main_version}`
          : undefined,
    };
  return {
    ...base,
    title:
      text(data.name) ??
      text(data.title) ??
      text(row.name) ??
      text(row.title) ??
      base.title,
    summary: text(data.description),
  };
}
