import "server-only";
import type { ShipmentStatus } from "@/generated/prisma/client";
import { AppError } from "../../errors";
import { db, type DbClient } from "../../db";
import { writeAudit } from "../../audit";
import { sendEmail } from "../notifications/email";

export interface ShipmentInput {
  carrier?: string | null;
  trackingNumber?: string | null;
  estimatedPrepDays?: number | null;
}

/** Manual shipping: admin records a shipment for a PAID physical order. Never creates labels with a carrier API. */
export async function createShipment(orderId: string, input: ShipmentInput, actorUserId: string | null, ip?: string | null) {
  return db.$transaction(async (rawTx) => {
    const tx = rawTx as unknown as DbClient;
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
    if (o.physicalFulfillmentStatus === "NOT_REQUIRED") throw new AppError("CONFLICT", "Bu siparişte fiziksel ürün yok.");
    if (!["PAID", "PROCESSING", "IN_PRODUCTION", "SHIPPED"].includes(o.status)) throw new AppError("CONFLICT", "Ödemesi tamamlanmamış sipariş için gönderi oluşturulamaz.");
    const s = await tx.shipment.create({
      data: {
        orderId,
        carrier: input.carrier ?? null,
        trackingNumber: input.trackingNumber ?? null,
        estimatedPrepDays: input.estimatedPrepDays ?? null,
        shippingFeeKurus: o.shippingKurus,
        address: (o.shippingAddress as object | null) ?? undefined,
        status: "PENDING",
      },
    });
    await writeAudit({ actorUserId, action: "shipment.create", entity: "Shipment", entityId: s.id, diff: { orderId }, ip: ip ?? null }, tx);
    return s;
  });
}

const NEXT: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: ["PREPARING", "SHIPPED"],
  PREPARING: ["SHIPPED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: [],
  RETURNED: [],
};

export async function updateShipmentStatus(shipmentId: string, status: ShipmentStatus, actorUserId: string | null, ip?: string | null) {
  let mail: (() => Promise<unknown>) | null = null;
  const result = await db.$transaction(async (rawTx) => {
    const tx = rawTx as unknown as DbClient;
    const s0 = await tx.shipment.findUnique({ where: { id: shipmentId } });
    if (!s0) throw new AppError("NOT_FOUND", "Gönderi bulunamadı.");
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${s0.orderId} FOR UPDATE`;
    const s = await tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
    if (!NEXT[s.status].includes(status)) throw new AppError("CONFLICT", `Gönderi "${s.status}" durumundan "${status}" durumuna geçirilemez.`);
    const now = new Date();
    const updated = await tx.shipment.update({
      where: { id: shipmentId },
      data: { status, ...(status === "SHIPPED" ? { shippedAt: now } : {}), ...(status === "DELIVERED" ? { deliveredAt: now } : {}) },
    });
    const order = await tx.order.findUniqueOrThrow({ where: { id: s.orderId } });
    if (status === "SHIPPED" && ["PAID", "PROCESSING", "IN_PRODUCTION"].includes(order.status)) {
      await tx.order.update({ where: { id: order.id }, data: { status: "SHIPPED", physicalFulfillmentStatus: "IN_PROGRESS" } });
      mail = () =>
        sendEmail("order_shipped", order.email, { orderNumber: order.number, carrier: updated.carrier ?? undefined, trackingNumber: updated.trackingNumber ?? undefined, url: order.userId ? `/hesabim?tab=siparisler&siparis=${order.number}` : `/odeme?siparis=${order.number}` }, { userId: order.userId });
    }
    if (status === "DELIVERED") {
      await tx.order.update({ where: { id: order.id }, data: { status: "COMPLETED", physicalFulfillmentStatus: "FULFILLED" } });
      await tx.orderItem.updateMany({ where: { orderId: order.id, kind: "PHYSICAL" }, data: { fulfillmentStatus: "FULFILLED" } });
    }
    await writeAudit({ actorUserId, action: "shipment.status", entity: "Shipment", entityId: shipmentId, diff: { from: s.status, to: status }, ip: ip ?? null }, tx);
    return updated;
  });
  if (mail) await (mail as () => Promise<unknown>)().catch(() => undefined);
  return result;
}
