import "server-only";
import type { z } from "zod";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { writeAudit } from "@/server/audit";
import { normalizeTurkish } from "@/lib/search";
import { setOnHand } from "../inventory/stock";
import type { Actor } from "./products";
import type { inventoryListQuery, inventoryUpdateSchema } from "./schema";

const NON_DIGITAL = ["PHYSICAL", "PERSONALIZED", "TEXTILE_PRINT"] as const;

export interface StockRow {
  inventoryId: string | null;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  threshold: number;
  low: boolean;
}

/** Rows for every physical product (or each of its variants). Missing inventory rows are created on demand (onHand 0). */
export async function listStock(q: z.infer<typeof inventoryListQuery>) {
  const products = await db.product.findMany({
    where: { type: { in: [...NON_DIGITAL] }, status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, sku: true, searchText: true, inventory: true,
      variants: { where: { active: true }, orderBy: { sort: "asc" }, select: { id: true, name: true, sku: true, inventory: true } },
    },
  });
  const needle = q.q ? normalizeTurkish(q.q) : null;
  const rows: StockRow[] = [];
  for (const p of products) {
    if (needle && !p.searchText.includes(needle) && !p.sku.toLowerCase().includes(q.q!.toLowerCase())) continue;
    const mk = (inv: { id: string; onHand: number; reserved: number; lowStockThreshold: number } | null, sku: string, v: { id: string; name: string } | null): StockRow => {
      const onHand = inv?.onHand ?? 0;
      const reserved = inv?.reserved ?? 0;
      const threshold = inv?.lowStockThreshold ?? 3;
      const available = onHand - reserved;
      return { inventoryId: inv?.id ?? null, productId: p.id, variantId: v?.id ?? null, productName: p.name, variantName: v?.name ?? null, sku, onHand, reserved, available, threshold, low: available <= threshold };
    };
    if (p.variants.length) for (const v of p.variants) rows.push(mk(v.inventory, v.sku, v));
    else rows.push(mk(p.inventory, p.sku, null));
  }
  const filtered = q.low ? rows.filter((r) => r.low) : rows;
  const start = (q.page - 1) * q.pageSize;
  return { total: filtered.length, page: q.page, pageSize: q.pageSize, lowCount: rows.filter((r) => r.low).length, items: filtered.slice(start, start + q.pageSize) };
}

export async function adjustStock(input: z.infer<typeof inventoryUpdateSchema>, actor: Actor) {
  if (!!input.productId === !!input.variantId) throw new AppError("VALIDATION", "Ürün ya da varyant belirtin (yalnızca biri).");
  return db.$transaction(async (tx) => {
    const target = input.variantId ? { variantId: input.variantId } : { productId: input.productId! };
    if (input.variantId) {
      if (!(await tx.productVariant.findUnique({ where: { id: input.variantId }, select: { id: true } }))) throw new AppError("NOT_FOUND", "Varyant bulunamadı.");
    } else {
      const p = await tx.product.findUnique({ where: { id: input.productId! }, select: { type: true } });
      if (!p) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
      if (!(NON_DIGITAL as readonly string[]).includes(p.type)) throw new AppError("VALIDATION", "Dijital ürünlerde stok takibi yoktur.");
    }
    let inv = await tx.inventory.findFirst({ where: target });
    if (!inv) inv = await tx.inventory.create({ data: target });
    const before = { onHand: inv.onHand, lowStockThreshold: inv.lowStockThreshold };
    if (input.onHand < inv.reserved) throw new AppError("VALIDATION", `Stok, ayrılmış ${inv.reserved} adetten az olamaz.`);
    const after = await setOnHand(tx, inv.id, input.onHand);
    if (input.lowStockThreshold !== undefined) await tx.inventory.update({ where: { id: inv.id }, data: { lowStockThreshold: input.lowStockThreshold } });
    await writeAudit({ actorUserId: actor.id, action: "inventory.adjust", entity: "Inventory", entityId: inv.id, diff: { ...target, before, after: { onHand: after.onHand, lowStockThreshold: input.lowStockThreshold ?? before.lowStockThreshold }, reason: input.reason }, ip: actor.ip }, tx);
    return { inventoryId: inv.id, onHand: after.onHand, reserved: after.reserved };
  });
}
