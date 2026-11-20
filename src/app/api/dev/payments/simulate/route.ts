import { z } from "zod";
import { randomUUID } from "node:crypto";
import { route } from "@/server/http";
import { AppError } from "@/server/errors";
import { db } from "@/server/db";
import { sha256Hex, safeEqual } from "@/server/crypto";
import { isPaymentSimulationAllowed } from "@/server/env";
import { processWebhook } from "@/server/modules/payments/webhook";
import { signSimulatedEvent } from "@/server/modules/payments/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DEV ONLY (404 unless PAYMENT_SIMULATION_ENABLED + simulated provider + non-production). Builds a signed event and feeds the real webhook path. */
export const POST = route(
  {
    auth: "optional",
    body: z.strictObject({ orderNumber: z.string().min(6).max(30), outcome: z.enum(["success", "failure"]), guestToken: z.string().min(16).max(200).optional() }),
    rateLimit: { name: "pay-simulate", limit: 30, windowSec: 60 },
  },
  async ({ user, body }) => {
    if (!isPaymentSimulationAllowed()) throw new AppError("NOT_FOUND");
    const order = await db.order.findUnique({ where: { number: body.orderNumber }, include: { payments: { where: { status: "PENDING" }, take: 1 } } });
    const owns =
      !!order &&
      ((user && order.userId === user.id) ||
        (body.guestToken && order.guestAccessTokenHash && safeEqual(order.guestAccessTokenHash, sha256Hex(body.guestToken))));
    if (!order || !owns) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
    const payment = order.payments[0];
    if (!payment) throw new AppError("CONFLICT", "Bekleyen ödeme yok.");
    const raw = JSON.stringify({ eventId: `sim_${randomUUID()}`, type: body.outcome === "success" ? "payment.succeeded" : "payment.failed", paymentId: payment.id, amountKurus: payment.amountKurus });
    const r = await processWebhook("simulated", raw, signSimulatedEvent(raw));
    return { ok: true, outcome: r.outcome };
  }
);
