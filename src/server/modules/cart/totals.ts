import "server-only";
import { EMBROIDERY_OFFER } from "@/lib/embroidery-offer";
import type { DbClient } from "../../db";
import { SHIPPING_FALLBACK } from "../../commerce-config";

export interface ShippingConfig {
  freeShippingThresholdKurus: number;
  standardShippingKurus: number;
}

/** Shipping rules come from SiteSettings "studio" (admin-editable); documented constants are the fallback. */
export async function getShippingConfig(client: DbClient): Promise<ShippingConfig> {
  const row = await client.siteSettings.findUnique({ where: { key: "studio" } });
  const v = (row?.value ?? {}) as Partial<ShippingConfig>;
  return {
    freeShippingThresholdKurus: Number.isInteger(v.freeShippingThresholdKurus) ? v.freeShippingThresholdKurus! : SHIPPING_FALLBACK.freeShippingThresholdKurus,
    standardShippingKurus: Number.isInteger(v.standardShippingKurus) ? v.standardShippingKurus! : SHIPPING_FALLBACK.standardShippingKurus,
  };
}

/** Digital-only baskets ship nothing (0). Physical baskets pay the standard fee below the free threshold. */
export function computeShipping(cfg: ShippingConfig, a: { hasPhysical: boolean; subtotalKurus: number; discountKurus: number }) {
  if (!a.hasPhysical) return 0;
  return a.subtotalKurus - a.discountKurus >= cfg.freeShippingThresholdKurus ? 0 : cfg.standardShippingKurus;
}

export function computeTotals(a: { subtotalKurus: number; discountKurus: number; shippingKurus: number }) {
  return { ...a, totalKurus: Math.max(0, a.subtotalKurus - a.discountKurus + a.shippingKurus) };
}

/** A different format of the same design does not count as a separate design. */
export function computeEmbroideryOffer(lines: readonly { productId: string; lineTotalKurus: number }[]) {
  const distinct = new Set(lines.map((line) => line.productId)).size;
  const percent = EMBROIDERY_OFFER.find((tier) => distinct >= tier.minDesigns)?.percent ?? 0;
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotalKurus, 0);
  return { percent, discountKurus: Math.floor(subtotal * percent / 100) };
}
