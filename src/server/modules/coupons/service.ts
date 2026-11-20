import "server-only";
import { z } from "zod";
import { AppError } from "../../errors";
import type { DbClient } from "../../db";
import { db } from "../../db";

export interface CouponLine {
  productId: string;
  categoryId: string | null;
  lineTotalKurus: number;
}
export interface CouponWho {
  userId?: string | null;
  email?: string | null;
}

const bad = (msg: string) => new AppError("VALIDATION", msg, { details: { coupon: true } });
export const normalizeCode = (c: string) => c.trim().toUpperCase();

/**
 * Validates a coupon for a cart and computes the discount (never more than the eligible amount).
 * - min subtotal is checked against the WHOLE cart subtotal; the discount applies to eligible lines only
 *   (all lines, or those matching the coupon's product / category scope).
 * - usage limits are re-enforced atomically at redemption time (redeemCoupon); this is the friendly pre-check.
 */
export async function evaluateCoupon(client: DbClient, rawCode: string, lines: CouponLine[], who: CouponWho) {
  const code = normalizeCode(rawCode);
  const coupon = await client.coupon.findUnique({ where: { code }, include: { products: true, categories: true } });
  if (!coupon || !coupon.active) throw bad("Kupon kodu geçerli değil.");
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw bad("Bu kupon henüz geçerli değil.");
  if (coupon.endsAt && coupon.endsAt < now) throw bad("Bu kuponun süresi dolmuş.");
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) throw bad("Bu kuponun kullanım limiti dolmuş.");

  const subtotal = lines.reduce((s, l) => s + l.lineTotalKurus, 0);
  if (subtotal < coupon.minSubtotalKurus) throw bad("Bu kupon için sepet tutarı yetersiz.");

  const scoped = coupon.products.length > 0 || coupon.categories.length > 0;
  const pIds = new Set(coupon.products.map((p) => p.productId));
  const cIds = new Set(coupon.categories.map((c) => c.categoryId));
  const eligible = lines
    .filter((l) => !scoped || pIds.has(l.productId) || (l.categoryId != null && cIds.has(l.categoryId)))
    .reduce((s, l) => s + l.lineTotalKurus, 0);
  if (eligible <= 0) throw bad("Bu kupon sepetinizdeki ürünlerde geçerli değil.");

  if (coupon.perCustomerLimit != null && (who.userId || who.email)) {
    const used = await countCustomerUses(client, coupon.id, who);
    if (used >= coupon.perCustomerLimit) throw bad("Bu kuponu kullanım hakkınız dolmuş.");
  }

  const discount = coupon.type === "PERCENT" ? Math.floor((eligible * coupon.value) / 100) : Math.min(coupon.value, eligible);
  return { coupon, discountKurus: Math.max(0, Math.min(discount, subtotal)) };
}

async function countCustomerUses(client: DbClient, couponId: string, who: CouponWho) {
  const or: Array<{ userId: string } | { email: string }> = [];
  if (who.userId) or.push({ userId: who.userId });
  if (who.email) or.push({ email: who.email.toLowerCase() });
  if (!or.length) return 0;
  return client.couponRedemption.count({ where: { couponId, OR: or } });
}

/**
 * Redeem inside the order transaction. The conditional UPDATE takes the coupon row lock and only succeeds
 * while usedCount < usageLimit, so concurrent checkouts can never exceed the limit; the per-customer count
 * runs after the lock is held (the lock serializes redemptions of the same coupon).
 */
export async function redeemCoupon(tx: DbClient, couponId: string, o: { orderId: string; discountKurus: number } & CouponWho) {
  const n = await tx.$executeRaw`
    UPDATE "Coupon" SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
    WHERE "id" = ${couponId} AND "active" = true AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
  if (n !== 1) throw bad("Bu kuponun kullanım limiti dolmuş.");
  const c = await tx.coupon.findUniqueOrThrow({ where: { id: couponId }, select: { perCustomerLimit: true } });
  if (c.perCustomerLimit != null) {
    const used = await countCustomerUses(tx, couponId, o);
    if (used >= c.perCustomerLimit) throw bad("Bu kuponu kullanım hakkınız dolmuş.");
  }
  await tx.couponRedemption.create({
    data: { couponId, orderId: o.orderId, userId: o.userId ?? null, email: (o.email ?? "").toLowerCase(), discountKurus: o.discountKurus },
  });
}

// ── Admin helpers (CRUD) ────────────────────────────────────────────────────────────────────────

export const couponInput = z.strictObject({
  code: z.string().trim().min(3).max(40),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().min(1),
  minSubtotalKurus: z.number().int().min(0).default(0),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  active: z.boolean().default(true),
  productIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
});
export type CouponInput = z.infer<typeof couponInput>;

function assertCoupon(i: Pick<CouponInput, "type" | "value" | "startsAt" | "endsAt">) {
  if (i.type === "PERCENT" && i.value > 100) throw new AppError("VALIDATION", "Yüzde indirim 1-100 arasında olmalı.");
  if (i.startsAt && i.endsAt && i.startsAt > i.endsAt) throw new AppError("VALIDATION", "Bitiş tarihi başlangıçtan önce olamaz.");
}

export async function createCoupon(input: CouponInput, client: DbClient = db) {
  const i = couponInput.parse(input);
  assertCoupon(i);
  try {
    return await client.coupon.create({
      data: {
        code: normalizeCode(i.code),
        type: i.type,
        value: i.value,
        minSubtotalKurus: i.minSubtotalKurus,
        usageLimit: i.usageLimit ?? null,
        perCustomerLimit: i.perCustomerLimit ?? null,
        startsAt: i.startsAt ?? null,
        endsAt: i.endsAt ?? null,
        active: i.active,
        products: { create: (i.productIds ?? []).map((productId) => ({ productId })) },
        categories: { create: (i.categoryIds ?? []).map((categoryId) => ({ categoryId })) },
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new AppError("CONFLICT", "Bu kupon kodu zaten var.");
    throw e;
  }
}

export async function updateCoupon(id: string, patch: Partial<CouponInput>, client: DbClient = db) {
  const cur = await client.coupon.findUnique({ where: { id } });
  if (!cur) throw new AppError("NOT_FOUND", "Kupon bulunamadı.");
  const p = couponInput.partial().parse(patch);
  assertCoupon({ type: p.type ?? cur.type, value: p.value ?? cur.value, startsAt: p.startsAt ?? cur.startsAt, endsAt: p.endsAt ?? cur.endsAt });
  return client.coupon.update({
    where: { id },
    data: {
      ...(p.code ? { code: normalizeCode(p.code) } : {}),
      ...(p.type ? { type: p.type } : {}),
      ...(p.value != null ? { value: p.value } : {}),
      ...(p.minSubtotalKurus != null ? { minSubtotalKurus: p.minSubtotalKurus } : {}),
      ...(p.usageLimit !== undefined ? { usageLimit: p.usageLimit } : {}),
      ...(p.perCustomerLimit !== undefined ? { perCustomerLimit: p.perCustomerLimit } : {}),
      ...(p.startsAt !== undefined ? { startsAt: p.startsAt } : {}),
      ...(p.endsAt !== undefined ? { endsAt: p.endsAt } : {}),
      ...(p.active != null ? { active: p.active } : {}),
      ...(p.productIds ? { products: { deleteMany: {}, create: p.productIds.map((productId) => ({ productId })) } } : {}),
      ...(p.categoryIds ? { categories: { deleteMany: {}, create: p.categoryIds.map((categoryId) => ({ categoryId })) } } : {}),
    },
  });
}

export const listCoupons = (client: DbClient = db) =>
  client.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { products: true, categories: true } });

export const deactivateCoupon = (id: string, client: DbClient = db) => client.coupon.update({ where: { id }, data: { active: false } });
