import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "../../errors";
import { db, type DbClient } from "../../db";
import { writeAudit } from "../../audit";
import { lockOrder } from "../orders/lifecycle";
import { cancelOrder, updateOrderStatus } from "../orders/service";
import { applyEvent, refundOrder } from "../payments/webhook";
import { createShipment, updateShipmentStatus } from "../shipping/service";
import { appUrl, sendEmail } from "../notifications/email";
import { applyRefundForManual } from "./manual";
import type { OrderListQuery } from "./schema";

const trackUrl = (o: { userId: string | null; number: string }) =>
  appUrl(o.userId ? `/hesabim?tab=siparisler&siparis=${o.number}` : `/odeme?siparis=${o.number}`);

export async function listAdminOrders(f: OrderListQuery) {
  const pageSize = f.pageSize ?? 25;
  const page = f.page ?? 1;
  const q = f.search?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(f.paymentStatus ? { paymentStatus: f.paymentStatus } : {}),
    ...(f.type === "digital" ? { digitalFulfillmentStatus: { not: "NOT_REQUIRED" } } : {}),
    ...(f.type === "physical" ? { physicalFulfillmentStatus: { not: "NOT_REQUIRED" } } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.from || f.to ? { placedAt: { ...(f.from ? { gte: new Date(`${f.from}T00:00:00.000Z`) } : {}), ...(f.to ? { lte: new Date(`${f.to}T23:59:59.999Z`) } : {}) } } : {}),
  };
  const and: Prisma.OrderWhereInput[] = [];
  if (f.fulfillment) and.push({ OR: [{ digitalFulfillmentStatus: f.fulfillment }, { physicalFulfillmentStatus: f.fulfillment }] });
  if (q) and.push({ OR: [{ number: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] });
  if (and.length) where.AND = and;

  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, number: true, email: true, status: true, paymentStatus: true, digitalFulfillmentStatus: true, physicalFulfillmentStatus: true,
        totalKurus: true, placedAt: true, _count: { select: { items: true } },
      },
    }),
  ]);
  return { total, page, pageSize, orders: rows.map(({ _count, ...o }) => ({ ...o, itemCount: _count.items })) };
}

export async function getAdminOrder(id: string) {
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" }, include: { entitlements: { include: { logs: { orderBy: { createdAt: "desc" }, take: 20 } } } } },
      payments: { orderBy: { createdAt: "asc" } },
      shipments: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!o) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
  const reservations = await db.inventoryReservation.findMany({ where: { orderId: id }, orderBy: { createdAt: "asc" } });
  const { guestAccessTokenHash: _g, ...order } = o;
  void _g;
  return {
    ...order,
    // Provider payloads may carry sensitive data: expose only a minimal safe projection.
    payments: o.payments.map((p) => ({
      id: p.id, provider: p.provider, providerPaymentId: p.providerPaymentId, status: p.status, amountKurus: p.amountKurus,
      failureReason: p.failureReason, paidAt: p.paidAt, createdAt: p.createdAt,
    })),
    items: o.items.map((i) => ({
      ...i,
      entitlements: i.entitlements.map((e) => ({
        id: e.id, remaining: e.remaining, expiresAt: e.expiresAt, revokedAt: e.revokedAt, revokeReason: e.revokeReason,
        logs: e.logs.map((l) => ({ id: l.id, createdAt: l.createdAt, ipHash: l.ipHash })),
      })),
    })),
    reservations: reservations.map((r) => ({ id: r.id, quantity: r.quantity, status: r.status, expiresAt: r.expiresAt })),
  };
}

export async function adminSetStatus(orderId: string, status: Parameters<typeof updateOrderStatus>[1], actorId: string, ip?: string | null) {
  return updateOrderStatus(orderId, status, actorId, ip);
}

/** Create a shipment for a paid order; optionally mark it shipped (sends "kargoya verildi" e-mail). */
export async function adminShip(
  orderId: string,
  input: { carrier?: string | null; trackingNumber?: string | null; estimatedPrepDays?: number | null; markShipped: boolean },
  actorId: string,
  ip?: string | null
) {
  const s = await createShipment(orderId, { carrier: input.carrier, trackingNumber: input.trackingNumber, estimatedPrepDays: input.estimatedPrepDays }, actorId, ip);
  if (input.markShipped) await updateShipmentStatus(s.id, "SHIPPED", actorId, ip);
  return getAdminOrder(orderId);
}

export async function adminShipmentStatus(orderId: string, shipmentId: string, status: Parameters<typeof updateShipmentStatus>[1], actorId: string, ip?: string | null) {
  const s = await db.shipment.findFirst({ where: { id: shipmentId, orderId }, select: { id: true } });
  if (!s) throw new AppError("NOT_FOUND", "Gönderi bulunamadı.");
  await updateShipmentStatus(shipmentId, status, actorId, ip);
  return getAdminOrder(orderId);
}

export async function adminCancel(orderId: string, actorId: string, ip?: string | null) {
  await cancelOrder(orderId, { userId: actorId }, ip);
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, select: { email: true, number: true, userId: true } });
  await sendEmail("order_cancelled", o.email, { orderNumber: o.number, url: trackUrl(o) }, { userId: o.userId });
  return getAdminOrder(orderId);
}

export async function adminRefund(orderId: string, actorId: string, ip?: string | null) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
  const paid = order.payments.find((p) => p.status === "PAID");
  if (!paid) throw new AppError("CONFLICT", "İade edilebilir ödeme yok.");
  if (paid.provider === "manual") {
    // Manual payments have no gateway: the refund is a bookkeeping step the admin performs outside the system.
    await applyRefundForManual(orderId, paid.id, actorId, ip);
  } else {
    await refundOrder(orderId, actorId, ip);
  }
  await sendEmail("order_refunded", order.email, { orderNumber: order.number, totalKurus: order.totalKurus, url: trackUrl(order) }, { userId: order.userId });
  return getAdminOrder(orderId);
}

/**
 * Documented exception: an admin records a payment received outside the gateway (bank transfer).
 * Only SUPER_ADMIN / ORDER_MANAGER (checked by the route), a reference note is mandatory, it is audited and
 * it goes through the same single "paid" code path as a gateway webhook.
 */
export async function recordManualPayment(orderId: string, reference: string, actorId: string, ip?: string | null) {
  const after: Array<() => Promise<unknown>> = [];
  await db.$transaction(
    async (rawTx) => {
      const tx = rawTx as unknown as DbClient;
      await lockOrder(tx, orderId);
      const o = await tx.order.findUnique({ where: { id: orderId } });
      if (!o) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
      if (o.status !== "PENDING_PAYMENT") throw new AppError("CONFLICT", "Yalnızca ödemesi bekleyen siparişe manuel ödeme kaydedilebilir.");
      const payment = await tx.payment.create({
        data: {
          orderId, provider: "manual", status: "PENDING", amountKurus: o.totalKurus, idempotencyKey: randomUUID(),
          raw: { reference: reference.slice(0, 200), recordedBy: actorId },
        },
      });
      await applyEvent(tx, { eventId: `manual:${payment.id}`, type: "payment.succeeded", paymentId: payment.id, amountKurus: o.totalKurus }, after);
      await writeAudit({ actorUserId: actorId, action: "order.manual_payment", entity: "Order", entityId: orderId, diff: { paymentId: payment.id, referenceLength: reference.length }, ip: ip ?? null }, tx);
    },
    { timeout: 20_000, maxWait: 10_000 }
  );
  for (const fn of after) await fn().catch(() => undefined);
  return getAdminOrder(orderId);
}
