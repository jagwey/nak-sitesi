import "server-only";
import { db, type DbClient } from "../../db";
import { writeAudit } from "../../audit";
import { lockOrder } from "../orders/lifecycle";
import { applyRefund } from "../payments/webhook";

/** Refund bookkeeping for a "manual" payment (no gateway call). Revokes downloads per policy via applyRefund. */
export async function applyRefundForManual(orderId: string, paymentId: string, actorUserId: string, ip?: string | null) {
  await db.$transaction(async (rawTx) => {
    const tx = rawTx as unknown as DbClient;
    await lockOrder(tx, orderId);
    await applyRefund(tx, orderId, paymentId);
    await writeAudit({ actorUserId, action: "order.refund", entity: "Order", entityId: orderId, diff: { paymentId, manual: true }, ip: ip ?? null }, tx);
  });
}
