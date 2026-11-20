import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { writeAudit } from "@/server/audit";
import { applyPercent, roundToWholeLira, MAX_KURUS } from "@/lib/money";
import { reindexProducts } from "../search";
import { publishIssues, type Actor } from "./products";
import type { BulkInput } from "./schema";

export interface BulkResult {
  updated: number;
  skipped: { id: string; name: string; reason: string }[];
}

/** Pure price math used by the bulk action (and tested directly). */
export function computeBulkPrice(current: number, input: { mode: "set" | "increase_percent" | "decrease_percent"; amountKurus?: number; percent?: number; roundToLira?: boolean }): number | null {
  let next: number;
  if (input.mode === "set") {
    if (input.amountKurus === undefined) return null;
    next = input.amountKurus;
  } else {
    if (input.percent === undefined) return null;
    next = applyPercent(current, input.percent, input.mode === "increase_percent" ? "increase" : "decrease");
  }
  if (input.roundToLira) next = roundToWholeLira(next);
  if (!Number.isInteger(next) || next <= 0 || next > MAX_KURUS) return null;
  return next;
}

export async function runBulk(input: BulkInput, actor: Actor): Promise<BulkResult> {
  const ids = [...new Set(input.productIds)];
  const products = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, priceKurus: true, status: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const skipped: BulkResult["skipped"] = [];
  for (const id of ids) if (!byId.has(id)) skipped.push({ id, name: id, reason: "Ürün bulunamadı." });
  const changed: string[] = [];
  const summary: Record<string, unknown> = { action: input.action, requested: ids.length };

  if (input.action === "price") {
    const mode = input.mode;
    if (!mode || (mode === "set" ? input.amountKurus === undefined : input.percent === undefined)) throw new AppError("VALIDATION", "Fiyat değişikliği için yöntem ve tutar/yüzde girin.");
    summary.mode = mode;
    summary.round = !!input.roundToLira;
    await db.$transaction(async (tx) => {
      for (const p of products) {
        const next = computeBulkPrice(p.priceKurus, { ...input, mode });
        if (next === null) { skipped.push({ id: p.id, name: p.name, reason: "Hesaplanan fiyat geçersiz." }); continue; }
        if (next === p.priceKurus) { skipped.push({ id: p.id, name: p.name, reason: "Fiyat zaten aynı." }); continue; }
        await tx.product.update({ where: { id: p.id }, data: { priceKurus: next } });
        changed.push(p.id);
      }
      await writeAudit({ actorUserId: actor.id, action: "product.bulk_price", entity: "Product", diff: { ...summary, changed: changed.length, percent: input.percent, amountKurus: input.amountKurus }, ip: actor.ip }, tx);
    });
  } else if (input.action === "category") {
    if (input.categoryId === undefined) throw new AppError("VALIDATION", "Kategori seçin.");
    const categoryId = input.categoryId;
    if (categoryId && !(await db.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) throw new AppError("VALIDATION", "Kategori bulunamadı.");
    await db.$transaction(async (tx) => {
      for (const p of products) {
        await tx.product.update({ where: { id: p.id }, data: { categoryId } });
        changed.push(p.id);
      }
      await writeAudit({ actorUserId: actor.id, action: "product.bulk_category", entity: "Product", diff: { ...summary, categoryId, changed: changed.length }, ip: actor.ip }, tx);
    });
  } else {
    const target = input.action === "publish" ? "ACTIVE" : input.action === "unpublish" ? "DRAFT" : "ARCHIVED";
    await db.$transaction(async (tx) => {
      for (const p of products) {
        if (p.status === target) { skipped.push({ id: p.id, name: p.name, reason: "Zaten bu durumda." }); continue; }
        if (target === "ACTIVE") {
          const issues = await publishIssues(tx, p.id);
          if (issues.length) { skipped.push({ id: p.id, name: p.name, reason: issues.join(" ") }); continue; }
        }
        await tx.product.update({ where: { id: p.id }, data: { status: target, ...(target === "ACTIVE" ? { publishedAt: new Date() } : {}) } });
        changed.push(p.id);
      }
      await writeAudit({ actorUserId: actor.id, action: `product.bulk_${input.action}`, entity: "Product", diff: { ...summary, changed: changed.length, skipped: skipped.length }, ip: actor.ip }, tx);
    });
  }
  if (changed.length) await reindexProducts(db, changed);
  return { updated: changed.length, skipped };
}
