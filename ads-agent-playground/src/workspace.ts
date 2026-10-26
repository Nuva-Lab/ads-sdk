import type { Product, ResourceLink, JsonObject } from "@nuva/sdk";
export type KnownResource = ResourceLink & {
  sessionId: string;
  sourceScriptId?: string;
  order?: number;
};
export function mergeResources(
  current: readonly KnownResource[],
  incoming: readonly KnownResource[],
): KnownResource[] {
  const map = new Map(
    current.map((record) => [
      `${record.sessionId}:${record.ref.kind}:${record.ref.id}`,
      record,
    ]),
  );
  for (const record of incoming)
    map.set(`${record.sessionId}:${record.ref.kind}:${record.ref.id}`, record);
  return [...map.values()].slice(-500);
}
export function resourcesForSession(
  records: readonly KnownResource[],
  sessionId: string,
) {
  return records.filter((record) => record.sessionId === sessionId);
}
export function attributes(text: string): JsonObject {
  const value: unknown = JSON.parse(text);
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("Attributes must be a JSON object.");
  return value as JsonObject;
}
export const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
export interface ProductFields {
  name: string;
  facts: string;
  selling_points: string;
  constraints: string;
  target_audience: string;
  attributes: string;
}
export function productFields(product?: Product): ProductFields {
  return {
    name: product?.data.name ?? "",
    facts: product?.data.facts?.join("\n") ?? "",
    selling_points: product?.data.selling_points?.join("\n") ?? "",
    constraints: product?.data.constraints?.join("\n") ?? "",
    target_audience: product?.data.target_audience ?? "",
    attributes: JSON.stringify(product?.data.attributes ?? {}, null, 2),
  };
}
/** Untouched optional/null fields retain the exact captured base semantics. No read/rebase occurs here. */
export function productData(
  base: Product | undefined,
  fields: ProductFields,
): Product["data"] {
  if (!fields.name.trim()) throw new Error("Product name is required.");
  const before = productFields(base);
  const data: Product["data"] = base
    ? { ...base.data }
    : { name: fields.name.trim(), images: [] };
  data.name = fields.name.trim();
  for (const key of ["facts", "selling_points", "constraints"] as const)
    if (!base || fields[key] !== before[key]) data[key] = lines(fields[key]);
  if (!base || fields.target_audience !== before.target_audience)
    data.target_audience = fields.target_audience.trim() || null;
  if (!base || fields.attributes !== before.attributes)
    data.attributes = attributes(fields.attributes);
  return data;
}
export function secondsToMs(text: string) {
  const value = Number(text);
  if (
    !text.trim() ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(value * 1000)
  )
    throw new Error(
      "Times require non-negative seconds with at most three decimals.",
    );
  return value * 1000;
}

/** Compare captured values, not object insertion order; the chosen Brand is part of the draft. */
export function productFormChanged(
  original: ProductFields,
  current: ProductFields,
  originalBrand: string,
  currentBrand: string,
): boolean {
  return (
    originalBrand !== currentBrand ||
    (Object.keys(original) as (keyof ProductFields)[]).some(
      (key) => original[key] !== current[key],
    )
  );
}

/** A bounded refreshed page must not silently switch a previously selected, verified Session. */
export function sessionChoices<T extends { id: string; title: string }>(
  sessions: readonly T[],
  selected?: { id: string; title: string },
): { id: string; title: string }[] {
  return selected && !sessions.some((session) => session.id === selected.id)
    ? [...sessions, selected]
    : [...sessions];
}
