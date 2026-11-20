import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "../../errors";
import { db, type DbClient } from "../../db";
import { getEnv } from "../../env";
import { sha256Hex } from "../../crypto";
import { writeAudit } from "../../audit";
import { consumeOrderReservations } from "../inventory/stock";
import { loadPolicy } from "../settings/service";
import { lockOrder } from "../../order-lock";
import { sendEmail } from "../notifications/email";
import { getPaymentProvider, type PaymentEvent } from "./provider";

export type WebhookOutcome = "processed" | "duplicate" | "ignored";
type AfterCommit = () => Promise<unknown>;

/**
 * The ONLY place an order can become PAID. The caller must have a verified provider event:
 * signature checked over the raw body, event id stored under a unique (provider, eventId) key, and the
 * whole effect applied in ONE transaction — so a duplicate/replayed delivery is a no-op.
 */
export async function processWebhook(providerName: string, rawBody: string, signature: string | null): Promise<{ outcome: WebhookOutcome }> {
  if (providerName !== getEnv().PAYMENT_PROVIDER) throw new AppError("NOT_FOUND");
  const provider = getPaymentProvider(providerName); // simulated => 404 unless isPaymentSimulationAllowed()
  if (!provider.verifyWebhook(signature, rawBody)) throw new AppError("FORBIDDEN", "Geçersiz webhook imzası.");
  const event = provider.parseEvent(rawBody);

  const after: AfterCommit[] = [];
  const outcome = await db.$transaction(
    async (rawTx) => {
      const tx = rawTx as unknown as DbClient;
      // Raw INSERT .. ON CONFLICT DO NOTHING: a duplicate must not abort the transaction (unlike a P2002).
      const inserted = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO "WebhookEvent" ("id", "provider", "eventId", "payloadHash", "receivedAt")
        VALUES (${randomUUID()}, ${providerName}, ${event.eventId}, ${sha256Hex(rawBody)}, now())
        ON CONFLICT ("provider", "eventId") DO NOTHING
        RETURNING "id"`;
      if (inserted.length === 0) return "duplicate" as const;
      const eventRowId = inserted[0].id;
      const res = await applyEvent(tx, event, after);
      await tx.webhookEvent.update({ where: { id: eventRowId }, data: { processedAt: new Date(), error: res.error ?? null } });
      return res.error ? ("ignored" as const) : ("processed" as const);
    },
    { timeout: 20_000, maxWait: 10_000 }
  );
  for (const fn of after) await fn().catch(() => undefined); // e-mails never undo a committed payment
  return { outcome };
}

export async function applyEvent(tx: DbClient, ev: PaymentEvent, after: AfterCommit[]): Promise<{ error?: string }> {
  await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${ev.paymentId} FOR UPDATE`;
  const payment = await tx.payment.findUnique({ where: { id: ev.paymentId } });
  if (!payment) return { error: "unknown payment" };
  if (ev.amountKurus !== payment.amountKurus) return { error: "amount mismatch" };
  await lockOrder(tx, payment.orderId);
  const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true } });

  if (ev.type === "payment.failed") {
    if (payment.status === "PENDING") {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "Ödeme sağlayıcısı başarısız bildirdi" } });
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
    }
    return {};
  }

  if (ev.type === "refund.succeeded") {
    await applyRefund(tx, order.id, payment.id);
    return {};
  }

  // payment.succeeded
  if (payment.status === "PAID") return {};
  if (order.status === "CANCELLED") {
    // Money arrived for an order we already cancelled: record it, never fulfil, flag for a manual refund.
    await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date(), failureReason: "Ödeme iptal edilmiş siparişe ulaştı — manuel iade gerekli" } });
    await writeAudit({ action: "payment.after_cancel", entity: "Order", entityId: order.id, diff: { paymentId: payment.id } }, tx);
    return {};
  }
  if (order.status !== "PENDING_PAYMENT") return {};

  const now = new Date();
  await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: now } });
  const { shortfalls } = await consumeOrderReservations(tx, order.id);
  if (shortfalls.length) await writeAudit({ action: "order.stock_shortfall", entity: "Order", entityId: order.id, diff: { shortfalls } }, tx);

  const digital = order.items.filter((i) => i.kind === "DIGITAL");
  const policy = await loadPolicy(tx);
  const expDays = policy.downloadExpiryDays > 0 ? policy.downloadExpiryDays : null;
  for (const it of digital) {
    const files = it.productId && it.format
      ? await tx.digitalFile.findMany({
          where: { productId: it.productId, format: { code: it.format }, status: "ACTIVE", isCurrent: true },
          distinct: ["downloadLabel"],
          orderBy: { version: "desc" },
          select: { id: true },
        })
      : [];
    if (it.productId) {
      const productId = it.productId;
      await tx.downloadEntitlement.createMany({
        data: (files.length ? files : [{ id: null }]).map((file) => ({
          orderItemId: it.id,
          userId: order.userId,
          productId,
          digitalFileId: file.id,
          remaining: policy.downloadLimit,
          expiresAt: expDays ? new Date(now.getTime() + expDays * 86_400_000) : null,
        })),
      });
    }
    await tx.orderItem.update({ where: { id: it.id }, data: { fulfillmentStatus: "FULFILLED" } });
  }
  await tx.order.update({
    where: { id: order.id },
    data: { status: "PAID", paymentStatus: "PAID", paidAt: now, ...(digital.length ? { digitalFulfillmentStatus: "FULFILLED" as const } : {}) },
  });

  const url = order.userId ? `/hesabim?tab=siparisler&siparis=${order.number}` : `/odeme?siparis=${order.number}`;
  after.push(() => sendEmail("payment_completed", order.email, { orderNumber: order.number, totalKurus: order.totalKurus, url }, { userId: order.userId }));
  if (digital.length) after.push(() => sendEmail("downloads_ready", order.email, { orderNumber: order.number, url: "/hesabim?tab=indirmeler" }, { userId: order.userId }));
  return {};
}

/** Mark an order refunded (payment + order) and revoke its downloads per REFUND_REVOKES_DOWNLOADS. Idempotent. */
export async function applyRefund(tx: DbClient, orderId: string, paymentId: string) {
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status === "PAID") await tx.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED" } });
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status === "REFUNDED") return;
  await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED", paymentStatus: "REFUNDED" } });
  if ((await loadPolicy(tx)).refundRevokesDownloads) {
    await tx.downloadEntitlement.updateMany({
      where: { orderItem: { orderId }, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: "Sipariş iade edildi" },
    });
  }
}

/** Admin: refund a PAID order through the provider, then record it. */
export async function refundOrder(orderId: string, actorUserId: string | null, ip?: string | null) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
  const payment = order.payments.find((p) => p.status === "PAID");
  if (!payment) throw new AppError("CONFLICT", "İade edilebilir ödeme yok.");
  const provider = getPaymentProvider(payment.provider);
  const r = await provider.refund({ paymentId: payment.id, providerPaymentId: payment.providerPaymentId, amountKurus: payment.amountKurus });
  if (!r.ok) throw new AppError("PAYMENT_FAILED", "İade sağlayıcı tarafından reddedildi.");
  await db.$transaction(async (rawTx) => {
    const tx = rawTx as unknown as DbClient;
    await lockOrder(tx, orderId);
    await applyRefund(tx, orderId, payment.id);
    await writeAudit({ actorUserId, action: "order.refund", entity: "Order", entityId: orderId, diff: { paymentId: payment.id, providerRefundId: r.providerRefundId }, ip: ip ?? null }, tx);
  });
  return { ok: true };
}
