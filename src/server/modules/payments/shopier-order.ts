import "server-only";
import { randomUUID } from "node:crypto";
import { db, type DbClient } from "../../db";
import { getEnv } from "../../env";
import { sha256Hex } from "../../crypto";
import { sendEmail } from "../notifications/email";
import { nextOrderNumber } from "../orders/numbering";
import { loadPolicy } from "../settings/service";
import { parseShopierOsb, ShopierOsbError, verifyShopierOsb, type ShopierOsbNotice } from "../../shopier/osb";
import { decideShopierWebhook, verifyShopierWebhook } from "../../shopier/webhook";

const DIGITAL = new Set(["DIGITAL_EMBROIDERY", "DIGITAL_PRINT", "BUNDLE"]);

export interface ShopierOsbResponse {
  status: number;
  body: "success" | "forbidden" | "bad request" | "retry" | "unconfigured";
}

interface ReadyLine {
  productId: string;
  name: string;
  sku: string;
  digital: boolean;
  lineKurus: number;
}

class Retry extends Error {}

function allocate(weights: number[], paid: number): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((total, weight) => total + weight, 0);
  if (sum <= 0) return [paid, ...weights.slice(1).map(() => 0)];
  const lines = weights.map((weight) => Math.floor((paid * weight) / sum));
  lines[0] += paid - lines.reduce((total, line) => total + line, 0);
  return lines;
}

async function grantFiles(tx: DbClient, orderItemId: string, userId: string | null, productId: string, now: Date, policy: Awaited<ReturnType<typeof loadPolicy>>) {
  const files = await tx.digitalFile.findMany({
    where: { productId, status: "ACTIVE", isCurrent: true },
    orderBy: { version: "desc" },
    select: { id: true, formatId: true, downloadLabel: true },
  });
  const seen = new Set<string>();
  const picked = files.filter((file) => {
    const key = `${file.formatId}:${file.downloadLabel ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const expDays = policy.downloadExpiryDays > 0 ? policy.downloadExpiryDays : null;
  await tx.downloadEntitlement.createMany({
    data: (picked.length ? picked : [{ id: null }]).map((file) => ({
      orderItemId,
      userId,
      productId,
      digitalFileId: file.id,
      remaining: policy.downloadLimit,
      expiresAt: expDays ? new Date(now.getTime() + expDays * 86_400_000) : null,
    })),
  });
}

async function recordNotice(tx: DbClient, notice: ShopierOsbNotice): Promise<{ created: boolean; digital: boolean; number?: string; userId?: string | null }> {
  const inserted = await tx.$queryRaw<{ id: string }[]>`
    INSERT INTO "WebhookEvent" ("id", "provider", "eventId", "payloadHash", "receivedAt")
    VALUES (${randomUUID()}, ${"shopier"}, ${notice.orderId}, ${sha256Hex(notice.orderId)}, now())
    ON CONFLICT ("provider", "eventId") DO NOTHING
    RETURNING "id"`;
  if (inserted.length === 0) return { created: false, digital: false };
  const eventId = inserted[0].id;

  if (notice.currency !== "TRY") {
    await tx.webhookEvent.update({ where: { id: eventId }, data: { processedAt: new Date(), error: "unsupported currency" } });
    return { created: false, digital: false };
  }

  const products = await tx.product.findMany({
    where: { shopierProductId: { in: notice.productIds }, isDemo: false },
  });
  if (products.length !== notice.productIds.length) throw new Retry();

  const byShopierId = new Map(products.map((product) => [product.shopierProductId, product]));
  const ordered = notice.productIds.map((id) => byShopierId.get(id)!);
  const amounts = allocate(ordered.map((product) => product.priceKurus), notice.priceKurus);
  const lines: ReadyLine[] = ordered.map((product, index) => ({
    productId: product.id,
    name: product.name,
    sku: product.sku,
    digital: DIGITAL.has(product.type),
    lineKurus: amounts[index] ?? 0,
  }));
  const user = await tx.user.findUnique({ where: { email: notice.email }, select: { id: true } });
  const now = new Date();
  const policy = await loadPolicy(tx);
  const hasDigital = lines.some((line) => line.digital);
  const hasPhysical = lines.some((line) => !line.digital);
  const note = [
    `Shopier #${notice.orderId}`,
    notice.isTest ? "Test bildirimi" : "",
    [notice.buyerName, notice.buyerSurname].filter(Boolean).join(" "),
    notice.customerNote,
  ].filter(Boolean).join(" — ").slice(0, 500);
  const number = await nextOrderNumber(tx);
  const order = await tx.order.create({
    data: {
      number,
      userId: user?.id ?? null,
      email: notice.email,
      status: "PAID",
      paymentStatus: "PAID",
      digitalFulfillmentStatus: hasDigital ? "FULFILLED" : "NOT_REQUIRED",
      physicalFulfillmentStatus: hasPhysical ? "PENDING" : "NOT_REQUIRED",
      subtotalKurus: notice.priceKurus,
      totalKurus: notice.priceKurus,
      customerNote: note,
      paidAt: now,
    },
  });
  for (const line of lines) {
    const item = await tx.orderItem.create({
      data: {
        orderId: order.id,
        productId: line.productId,
        kind: line.digital ? "DIGITAL" : "PHYSICAL",
        productName: line.name,
        sku: line.sku,
        unitPriceKurus: line.lineKurus,
        quantity: 1,
        lineTotalKurus: line.lineKurus,
        fulfillmentStatus: line.digital ? "FULFILLED" : "PENDING",
      },
    });
    if (line.digital) await grantFiles(tx, item.id, user?.id ?? null, line.productId, now, policy);
  }
  await tx.payment.create({
    data: {
      orderId: order.id,
      provider: "shopier",
      providerPaymentId: `shopier:${notice.orderId}`,
      status: "PAID",
      amountKurus: notice.priceKurus,
      idempotencyKey: `shopier:${notice.orderId}`,
      paidAt: now,
      raw: { shopierOrderId: notice.orderId, productIds: notice.productIds, isTest: notice.isTest, currency: notice.currency },
    },
  });
  await tx.webhookEvent.update({ where: { id: eventId }, data: { processedAt: now } });
  return { created: true, digital: hasDigital, number, userId: user?.id ?? null };
}

/**
 * Verified Shopier OSB notification. Checkout never sets PAID; this handler records an
 * already-paid order only after the OSB signature check, idempotent on the Shopier order id.
 */
export async function handleShopierOsb(fields: { res?: string; hash?: string }): Promise<ShopierOsbResponse> {
  const env = getEnv();
  const username = env.SHOPIER_OSB_USERNAME.trim();
  const key = env.SHOPIER_OSB_KEY;
  if (!username || !key) return { status: 503, body: "unconfigured" };
  const res = fields.res?.trim() ?? "";
  const hash = fields.hash?.trim() ?? "";
  if (!res || !hash) return { status: 400, body: "bad request" };
  if (res.length > 80_000 || hash.length > 128) return { status: 400, body: "bad request" };
  if (!verifyShopierOsb(res, hash, username, key)) return { status: 403, body: "forbidden" };

  let notice: ShopierOsbNotice;
  try {
    notice = parseShopierOsb(res);
  } catch (err) {
    if (err instanceof ShopierOsbError) return { status: 400, body: "bad request" };
    throw err;
  }

  return fulfillShopierNotice(notice, "success");
}

/** Shared by OSB and the REST webhook. Idempotent on the Shopier order id. */
export async function fulfillShopierNotice(notice: ShopierOsbNotice, okBody: ShopierOsbResponse["body"] = "success"): Promise<ShopierOsbResponse> {
  let recorded: Awaited<ReturnType<typeof recordNotice>>;
  try {
    recorded = await db.$transaction((tx) => recordNotice(tx as unknown as DbClient, notice), { timeout: 20_000, maxWait: 10_000 });
  } catch (err) {
    if (err instanceof Retry) return { status: 409, body: "retry" };
    throw err;
  }
  if (recorded.created && recorded.number) {
    const url = recorded.userId ? `/hesabim?tab=siparisler&siparis=${recorded.number}` : `/odeme?siparis=${recorded.number}`;
    await sendEmail("payment_completed", notice.email, { orderNumber: recorded.number, totalKurus: notice.priceKurus, url }, { userId: recorded.userId });
    if (recorded.digital) {
      await sendEmail("downloads_ready", notice.email, { orderNumber: recorded.number, url: "/hesabim?tab=indirmeler" }, { userId: recorded.userId });
    }
  }
  return { status: 200, body: okBody };
}

/**
 * Shopier REST webhook. Signature is HMAC-SHA256 over the raw body with SHOPIER_WEBHOOK_SECRET
 * (the `token` returned once when the subscription is created). 200 is required within 5 seconds.
 */
export async function handleShopierWebhook(input: { rawBody: string; signature: string | null; event: string | null }): Promise<ShopierOsbResponse> {
  const token = getEnv().SHOPIER_WEBHOOK_SECRET;
  if (!token) return { status: 503, body: "unconfigured" };
  if (input.rawBody.length > 100_000) return { status: 400, body: "bad request" };
  if (!verifyShopierWebhook(input.rawBody, input.signature, token)) return { status: 403, body: "forbidden" };
  let body: unknown;
  try {
    body = JSON.parse(input.rawBody);
  } catch {
    return { status: 400, body: "bad request" };
  }
  const decision = decideShopierWebhook(body, input.event);
  if (decision.action === "ignore") return { status: 200, body: "success" };
  if (decision.action === "invalid") return { status: 400, body: "bad request" };
  return fulfillShopierNotice(decision.notice, "success");
}
