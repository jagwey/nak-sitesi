import "server-only";
// Pure-ish line resolution: validates a client request against the catalog and prices it. The only price
// source is the database (Product / ProductVariant / ProductLicense / ProductOption).
import { AppError } from "../../errors";
import type { DbClient } from "../../db";
import { DEFAULT_PERSONALIZATION_MAX, isDigitalType } from "../orders/config";
import type { AddItemInput, PersonalizationInput } from "./schema";

export const productInclude = {
  variants: { where: { active: true }, include: { inventory: true }, orderBy: { sort: "asc" as const } },
  options: true,
  formats: { include: { format: true } },
  licenses: { include: { license: true } },
  inventory: true,
  images: { orderBy: { sort: "asc" as const }, take: 1 },
} as const;

export type CatalogProduct = NonNullable<Awaited<ReturnType<typeof loadProductByRef>>>;

export async function loadProductByRef(client: DbClient, ref: string) {
  return client.product.findFirst({
    where: { status: "ACTIVE", OR: [{ id: ref }, { slug: ref }, { sku: ref.toUpperCase() }] },
    include: productInclude,
  });
}

export async function loadProductsByIds(client: DbClient, ids: string[]) {
  const rows = await client.product.findMany({ where: { id: { in: ids } }, include: productInclude });
  return new Map(rows.map((p) => [p.id, p]));
}

interface PhysicalInfo {
  colors?: { name?: string }[];
  sizes?: unknown[];
  personalizationPriceKurus?: number;
}
const physInfo = (p: CatalogProduct): PhysicalInfo => ((p.physicalInfo ?? {}) as PhysicalInfo) || {};

/** What is persisted in CartItem.personalization (single JSON column). */
export interface StoredPersonalization {
  options: PersonalizationInput | null;
  color?: string;
  size?: string;
}
export const readStored = (v: unknown): StoredPersonalization => {
  const o = (v ?? {}) as Partial<StoredPersonalization>;
  return { options: o.options ?? null, color: o.color, size: o.size };
};

export interface ResolvedLine {
  product: CatalogProduct;
  variant: CatalogProduct["variants"][number] | null;
  format: { id: string; code: string } | null;
  license: { id: string; code: string; name: string } | null;
  stored: StoredPersonalization;
  kind: "DIGITAL" | "PHYSICAL";
  unitPriceKurus: number;
  /** Inventory row backing a physical line. */
  inventoryId: string | null;
}

const hasText = (v?: string) => !!v && v.trim().length > 0;
const cleanPers = (p?: PersonalizationInput): PersonalizationInput | null => {
  if (!p) return null;
  const out: PersonalizationInput = {};
  for (const k of ["text", "fontStyle", "threadColorName", "threadColorHex", "motif"] as const) {
    if (hasText(p[k])) out[k] = p[k]!.trim();
  }
  return Object.keys(out).length ? out : null;
};

const vErr = (msg: string, details?: unknown) => new AppError("VALIDATION", msg, details ? { details } : undefined);

/**
 * Validate + price one line. `licenseKey` accepts a code or a display name. Throws VALIDATION for any
 * combination the product does not offer.
 */
export function resolveLine(
  product: CatalogProduct,
  input: Pick<AddItemInput, "variantId" | "format" | "license" | "color" | "size" | "personalization">
): ResolvedLine {
  const digital = isDigitalType(product.type);
  const kind = digital ? "DIGITAL" : "PHYSICAL";

  // ── variant ──
  let variant: ResolvedLine["variant"] = null;
  if (product.variants.length > 0) {
    if (!input.variantId) throw vErr("Lütfen bir seçenek (varyant) seçin.");
    variant = product.variants.find((v) => v.id === input.variantId || v.sku === input.variantId) ?? null;
    if (!variant) throw vErr("Seçilen varyant bu ürün için geçerli değil.");
  } else if (input.variantId) {
    throw vErr("Bu ürünün varyantı yok.");
  }

  let unit = variant?.priceKurus ?? product.priceKurus;
  let format: ResolvedLine["format"] = null;
  let license: ResolvedLine["license"] = null;
  const stored: StoredPersonalization = { options: null };

  if (digital) {
    if (input.color || input.size || input.personalization) throw vErr("Dijital ürünlerde renk, beden veya kişiselleştirme seçilemez.");
    // format
    if (product.formats.length === 0) throw vErr("Bu ürün için indirilebilir format tanımlı değil.");
    const code = input.format?.toUpperCase();
    let pf = code ? product.formats.find((f) => f.format.code === code) : undefined;
    if (!code) {
      if (product.formats.length === 1) pf = product.formats[0];
      else throw vErr("Lütfen bir dosya formatı seçin.");
    }
    if (!pf) throw vErr("Seçilen format bu ürün için sunulmuyor.", { allowed: product.formats.map((f) => f.format.code) });
    format = { id: pf.formatId, code: pf.format.code };
    // license
    if (product.licenses.length === 0) throw vErr("Bu ürün için lisans tanımlı değil.");
    let pl: (typeof product.licenses)[number] | undefined;
    if (input.license) {
      const k = input.license.trim().toLowerCase();
      pl = product.licenses.find((l) => l.license.code.toLowerCase() === k || l.license.name.toLowerCase() === k);
      if (!pl) throw vErr("Seçilen lisans bu ürün için sunulmuyor.", { allowed: product.licenses.map((l) => l.license.code) });
    } else {
      pl = [...product.licenses].sort((a, b) => a.license.sort - b.license.sort)[0];
    }
    license = { id: pl.licenseId, code: pl.license.code, name: pl.license.name };
    unit += pl.priceDeltaKurus ?? pl.license.priceDeltaKurus;
  } else {
    if (input.format || input.license) throw vErr("Fiziksel ürünlerde format veya lisans seçilemez.");
    const info = physInfo(product);
    // color / size against the product's own lists (only when it defines them)
    const colors = (info.colors ?? []).map((c) => c.name).filter(Boolean) as string[];
    const sizes = (info.sizes ?? []).filter((s): s is string => typeof s === "string");
    if (input.color) {
      if (colors.length && !colors.includes(input.color)) throw vErr("Seçilen renk bu ürün için sunulmuyor.", { allowed: colors });
      stored.color = input.color;
    } else if (colors.length > 0) {
      stored.color = colors[0]; // quick-add: default to the first listed option
    }
    if (input.size) {
      if (sizes.length && !sizes.includes(input.size)) throw vErr("Seçilen beden/ölçü bu ürün için sunulmuyor.", { allowed: sizes });
      stored.size = input.size;
    } else if (sizes.length > 0) {
      stored.size = sizes[0];
    }

    // personalization
    const pers = cleanPers(input.personalization);
    const canPersonalize = product.personalizable || product.type === "PERSONALIZED";
    if (pers && !canPersonalize) throw vErr("Bu ürün kişiselleştirilemez.");
    const textOpt = product.options.find((o) => o.key === "monogram" || o.key === "text");
    if (pers?.text) {
      const max = textOpt?.maxLength ?? DEFAULT_PERSONALIZATION_MAX;
      const min = textOpt?.minLength ?? 1;
      const len = [...pers.text].length;
      if (len > max) throw vErr(`Kişiselleştirme metni en fazla ${max} karakter olabilir.`, { max });
      if (len < min) throw vErr(`Kişiselleştirme metni en az ${min} karakter olmalı.`, { min });
      unit += (info.personalizationPriceKurus ?? 0) + (textOpt?.priceDeltaKurus ?? 0);
    }
    if (canPersonalize && textOpt?.required && !pers?.text) throw vErr("Bu ürün için kişiselleştirme metni zorunlu.");
    stored.options = pers;
  }

  const inv = digital ? null : variant?.inventory ?? product.inventory ?? null;
  return { product, variant, format, license, stored, kind, unitPriceKurus: unit, inventoryId: inv?.id ?? null };
}

/** Compare two stored personalizations for line de-duplication. */
export const sameStored = (a: StoredPersonalization, b: StoredPersonalization) =>
  JSON.stringify([a.options, a.color ?? null, a.size ?? null]) === JSON.stringify([b.options, b.color ?? null, b.size ?? null]);
