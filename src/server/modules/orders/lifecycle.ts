// Order cancel / reservation expiry. No "server-only", no ../db import: shared with scripts/release-reservations.ts.
import type { DbClient } from "../../db";
import { lockOrder } from "../../order-lock";
import type { PrismaClient } from "@/generated/prisma/client";
import { expireStaleForInventories, releaseOrderReservations } from "../inventory/stock";

/**
 * Cancel an unpaid order: free its stock, give the coupon use back, fail the pending payment.
 * Returns false (no-op) when the order is not PENDING_PAYMENT any more (e.g. paid meanwhile).
 */
export async function cancelPendingOrder(tx: DbClient, orderId: string, reason: string): Promise<boolean> {
  await lockOrder(tx, orderId);
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
  if (!order || order.status !== "PENDING_PAYMENT") return false;

  await releaseOrderReservations(tx, orderId, "RELEASED");

  const red = await tx.couponRedemption.findUnique({ where: { orderId } });
  if (red) {
    await tx.couponRedemption.delete({ where: { id: red.id } });
    await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "id" = ${red.couponId}`;
  }
  await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "FAILED", failureReason: reason } });
  await tx.orderItem.updateMany({ where: { orderId }, data: { fulfillmentStatus: "CANCELLED" } });
  await tx.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      paymentStatus: "FAILED",
      cancelledAt: new Date(),
      digitalFulfillmentStatus: "CANCELLED",
      physicalFulfillmentStatus: "CANCELLED",
    },
  });
  return true;
}

/**
 * Sweep: ACTIVE reservations past expiry become EXPIRED (stock freed) and the unpaid orders that held them
 * are cancelled. Safe to run concurrently / repeatedly (`npm run jobs:release-reservations`).
 */
export async function expireReservations(client: PrismaClient): Promise<{ expiredOrders: number; cancelledOrders: number }> {
  const stale = await client.inventoryReservation.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
    select: { inventoryId: true },
    distinct: ["inventoryId"],
  });
  const orderIds = new Set<string>();
  const ids = stale.map((s) => s.inventoryId);
  if (ids.length) {
    await client.$transaction(async (tx) => {
      for (const o of await expireStaleForInventories(tx as unknown as DbClient, ids)) orderIds.add(o);
    });
  }
  let cancelled = 0;
  for (const orderId of orderIds) {
    const done = await client.$transaction(async (tx) => {
      const t = tx as unknown as DbClient;
      await lockOrder(t, orderId);
      const live = await t.inventoryReservation.count({ where: { orderId, status: "ACTIVE" } });
      if (live > 0) return false;
      return cancelPendingOrder(t, orderId, "Rezervasyon süresi doldu");
    });
    if (done) cancelled++;
  }
  return { expiredOrders: orderIds.size, cancelledOrders: cancelled };
}
