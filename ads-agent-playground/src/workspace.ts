import { msg, UiError } from "./i18n.js";
import type { Product, ProductsClient, ResourceLink, JsonObject } from "@nuva/sdk";
type NewProductData = Parameters<ProductsClient["create"]>[0]["data"];
/** What `products.update` changes in a Product's `data`. */
export type ProductChanges = NonNullable<Parameters<ProductsClient["update"]>[1]["data"]>;
export type KnownResource = ResourceLink & {
  sessionId: string;
  sourceScriptId?: string;
  purpose?: "clip" | "final";
  finalAssetId?: string;
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
  for (const record of incoming) {
    const key = `${record.sessionId}:${record.ref.kind}:${record.ref.id}`;
    map.set(key, { ...map.get(key), ...record });
  }
  return [...map.values()].slice(-500);
}
export function resourcesForSession(
  records: readonly KnownResource[],
  sessionId: string,
) {
  return records.filter((record) => record.sessionId === sessionId);
}
export function resourcesForTab(
  records: KnownResource[],
  tab: "script" | "storyboard" | "prompt" | "job" | "asset",
) {
  const registeredFinals = new Set(
    records
      .filter((record) => record.ref.kind === "ad")
      .map((record) => record.finalAssetId),
  );
  return records.filter((record) =>
    tab === "asset"
      ? record.ref.kind === "ad" ||
        (record.ref.kind === "asset" &&
          record.purpose === "final" &&
          !registeredFinals.has(record.ref.id))
      : record.ref.kind === tab,
  );
}
export function attributes(text: string): JsonObject {
  const value: unknown = JSON.parse(text);
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new UiError(msg("Attributes must be a JSON object."));
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
/** A new Product's data, from the form. */
export function newProductData(fields: ProductFields): NewProductData {
  if (!fields.name.trim()) throw new UiError(msg("Product name is required."));
  return {
    name: fields.name.trim(),
    image_asset_ids: [],
    facts: lines(fields.facts),
    selling_points: lines(fields.selling_points),
    constraints: lines(fields.constraints),
    target_audience: fields.target_audience.trim() || null,
    attributes: attributes(fields.attributes),
  };
}
/**
 * Only the fields the form changed from `base`, as `products.update` sends them; the service keeps the rest as
 * saved. An emptied audience clears it (`null`); a list is sent whole.
 */
export function productChanges(base: Product, fields: ProductFields): ProductChanges {
  if (!fields.name.trim()) throw new UiError(msg("Product name is required."));
  const before = productFields(base);
  const changes: ProductChanges = {};
  if (fields.name.trim() !== base.data.name) changes.name = fields.name.trim();
  for (const key of ["facts", "selling_points", "constraints"] as const)
    if (fields[key] !== before[key]) changes[key] = lines(fields[key]);
  if (fields.target_audience !== before.target_audience)
    changes.target_audience = fields.target_audience.trim() || null;
  if (fields.attributes !== before.attributes)
    changes.attributes = attributes(fields.attributes);
  return changes;
}
export function secondsToMs(text: string) {
  const value = Number(text);
  if (
    !text.trim() ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(value * 1000)
  )
    throw new UiError(
      msg("Times require non-negative seconds with at most three decimals."),
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
