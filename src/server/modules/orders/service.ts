import "server-only";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { AppError } from "../../errors";
import { db, type DbClient } from "../../db";
import { sha256Hex, safeEqual } from "../../crypto";
import { writeAudit } from "../../audit";
import { cancelPendingOrder } from "./lifecycle";

export const orderInclude = {
  items: { orderBy: { id: "asc" as const }, include: { entitlements: { select: { id: true, remaining: true, expiresAt: true, revokedAt: true } } } },
  payments: { orderBy: { createdAt: "asc" as const }, select: { id: true, provider: true, status: true, amountKurus: true, paidAt: true, createdAt: true } },
  shipments: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

export type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** Customer-safe serialization (no hashes, no provider raw payloads). */
export function orderView(o: OrderRow) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    paymentStatus: o.paymentStatus,
    digitalFulfillmentStatus: o.digitalFulfillmentStatus,
    physicalFulfillmentStatus: o.physicalFulfillmentStatus,
    currency: o.currency,
    email: o.email,
    subtotalKurus: o.subtotalKurus,
    discountKurus: o.discountKurus,
    shippingKurus: o.shippingKurus,
    totalKurus: o.totalKurus,
    couponCode: o.couponCode,
    shippingAddress: o.shippingAddress,
    customerNote: o.customerNote,
    placedAt: o.placedAt,
    paidAt: o.paidAt,
    cancelledAt: o.cancelledAt,
    items: o.items.map((i) => ({
      id: i.id,
      kind: i.kind,
      productId: i.productId,
      productName: i.productName,
      sku: i.sku,
      variantName: i.variantName,
      format: i.format,
      license: i.license,
      unitPriceKurus: i.unitPriceKurus,
      quantity: i.quantity,
      lineTotalKurus: i.lineTotalKurus,
      personalization: i.personalization,
      fulfillmentStatus: i.fulfillmentStatus,
      entitlement: i.entitlements[0] ?? null,
    })),
    payments: o.payments,
    shipments: o.shipments.map((s) => ({
      id: s.id,
      carrier: s.carrier,
      trackingNumber: s.trackingNumber,
      status: s.status,
      shippedAt: s.shippedAt,
      deliveredAt: s.deliveredAt,
    })),
  };
}

// ── customer reads (always scoped to the owner) ─────────────────────────────────────────────────
export async function listUserOrders(userId: string) {
  const rows = await db.order.findMany({ where: { userId }, orderBy: { placedAt: "desc" }, take: 100, include: orderInclude });
  return rows.map(orderView);
}

export async function getUserOrder(userId: string, number: string) {
  const o = await db.order.findFirst({ where: { number, userId }, include: orderInclude });
  if (!o) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
  return orderView(o);
}

/** Guest lookup: order number + the one-time access token returned at checkout (compared by hash). */
export async function getGuestOrder(number: string, token: string) {
  const o = await db.order.findUnique({ where: { number }, include: orderInclude });
  if (!o || !o.guestAccessTokenHash || !safeEqual(o.guestAccessTokenHash, sha256Hex(token))) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
  return orderView(o);
}

// ── admin API (called by the admin phase; RBAC is enforced by the routes) ───────────────────────
export interface OrderFilter {
  status?: OrderStatus;
  paymentStatus?: "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listOrders(f: OrderFilter = {}, client: DbClient = db) {
  const pageSize = Math.min(Math.max(f.pageSize ?? 25, 1), 100);
  const page = Math.max(f.page ?? 1, 1);
  const where: Prisma.OrderWhereInput = {
    ...(f.status ? { status: f.status } : {}),
    ...(f.paymentStatus ? { paymentStatus: f.paymentStatus } : {}),
    ...(f.search ? { OR: [{ number: { contains: f.search.trim(), mode: "insensitive" } }, { email: { contains: f.search.trim(), mode: "insensitive" } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    client.order.count({ where }),
    client.order.findMany({ where, orderBy: { placedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: orderInclude }),
  ]);
  return { total, page, pageSize, orders: rows.map(orderView) };
}

export async function getOrder(id: string, client: DbClient = db) {
  const o = await client.order.findUnique({ where: { id }, include: orderInclude });
  if (!o) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
  return orderView(o);
}

/** Forward-only manual progress for paid physical work. PAID / REFUNDED / CANCELLED have dedicated functions. */
const MANUAL_NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAID: ["PROCESSING", "IN_PRODUCTION", "SHIPPED", "COMPLETED"],
  PROCESSING: ["IN_PRODUCTION", "SHIPPED", "COMPLETED"],
  IN_PRODUCTION: ["SHIPPED", "COMPLETED"],
  SHIPPED: ["COMPLETED"],
};

export async function updateOrderStatus(orderId: string, status: OrderStatus, actorUserId: string | null, ip?: string | null) {
  if (["PENDING_PAYMENT", "PAID", "CANCELLED", "REFUNDED"].includes(status)) {
    throw new AppError("VALIDATION", "Bu durum doğrudan ayarlanamaz (ödeme/iptal/iade kendi akışlarından geçer).");
  }
  return db.$transaction(async (rawTx) => {
    const tx = rawTx as unknown as DbClient;
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
    if (!MANUAL_NEXT[o.status]?.includes(status)) throw new AppError("CONFLICT", `Sipariş "${o.status}" durumundan "${status}" durumuna geçirilemez.`);
    if (status === "SHIPPED" || status === "COMPLETED") {
      await tx.order.update({ where: { id: orderId }, data: { status, ...(o.physicalFulfillmentStatus === "PENDING" || o.physicalFulfillmentStatus === "IN_PROGRESS" ? { physicalFulfillmentStatus: status === "COMPLETED" ? "FULFILLED" : "IN_PROGRESS" } : {}) } });
    } else {
      await tx.order.update({ where: { id: orderId }, data: { status, ...(o.physicalFulfillmentStatus === "PENDING" ? { physicalFulfillmentStatus: "IN_PROGRESS" } : {}) } });
    }
    await writeAudit({ actorUserId, action: "order.status", entity: "Order", entityId: orderId, diff: { from: o.status, to: status }, ip: ip ?? null }, tx);
    return orderView(await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude }));
  });
}

/** Cancel an UNPAID order (frees stock, returns the coupon use). Paid orders go through refundOrder instead. */
export async function cancelOrder(orderId: string, actor: { userId: string | null; ownerOnly?: boolean }, ip?: string | null) {
  return db.$transaction(async (rawTx) => {
    const tx = rawTx as unknown as DbClient;
    const o = await tx.order.findFirst({ where: { id: orderId, ...(actor.ownerOnly ? { userId: actor.userId ?? "__none__" } : {}) } });
    if (!o) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
    const ok = await cancelPendingOrder(tx, orderId, "Müşteri/yönetici iptali");
    if (!ok) throw new AppError("CONFLICT", "Yalnızca ödemesi bekleyen siparişler iptal edilebilir.");
    await writeAudit({ actorUserId: actor.userId, action: "order.cancel", entity: "Order", entityId: orderId, diff: {}, ip: ip ?? null }, tx);
    return orderView(await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude }));
  });
}
