import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma, CustomOrderStatus } from "@/generated/prisma/client";
import { AppError } from "../../errors";
import { db, type DbClient } from "../../db";
import { getEnv } from "../../env";
import { writeAudit } from "../../audit";
import { randomToken, sha256Hex } from "../../crypto";
import { enforceRateLimit } from "../../rate-limit";
import { getStorage, newObjectKey, safeDownloadName } from "../storage";
import { processImageUpload } from "../uploads/validators";
import { appUrl, sendEmail } from "../notifications/email";
import { nextOrderNumber } from "../orders/numbering";
import { getPaymentProvider } from "../payments/provider";
import { MAX_FILES, type CreateCustomOrderInput } from "./schema";

const SUMMARY_MAX = 160;

// ───────────────────────── Storefront: create ─────────────────────────

export async function createCustomOrder(input: CreateCustomOrderInput, user: { id: string } | null, ip: string) {
  if (input.website) {
    // Honeypot: pretend success, store nothing.
    return { id: "ok", received: true };
  }
  await enforceRateLimit({ name: "custom-order:ip", id: ip, limit: 5, windowSec: 3600 });
  const email = input.email.trim().toLowerCase();
  await enforceRateLimit({ name: "custom-order:email", id: email, limit: 5, windowSec: 86400 });

  const files = input.files ?? [];
  if (files.length > MAX_FILES) throw new AppError("VALIDATION", `En fazla ${MAX_FILES} görsel yükleyebilirsiniz.`);

  // Validate ALL files before storing anything (magic bytes, re-encode; client MIME never consulted).
  const processed: { name: string; buf: Buffer }[] = [];
  for (const f of files) {
    const raw = Buffer.from(await f.arrayBuffer());
    const r = await processImageUpload(raw);
    if (!r.ok) throw new AppError("UNSUPPORTED_MEDIA_TYPE", r.message, { details: { code: r.code, file: safeDownloadName(f.name) } });
    processed.push({ name: safeDownloadName(f.name || "gorsel"), buf: r.main });
  }

  const storage = getStorage();
  const stored: { key: string; name: string; size: number }[] = [];
  try {
    for (const p of processed) {
      const key = newObjectKey("webp", "custom-orders");
      await storage.putObject({ bucket: "private", key, body: p.buf, contentType: "image/webp" });
      stored.push({ key, name: p.name, size: p.buf.length });
    }
    const created = await db.$transaction(async (rawTx) => {
      const tx = rawTx as unknown as DbClient;
      const co = await tx.customOrder.create({
        data: {
          userId: user?.id ?? null,
          name: input.name,
          email,
          phone: input.phone ?? null,
          text: input.text,
          threadColor: input.threadColor ?? null,
          size: input.size ?? null,
          machineModel: input.machineModel ?? null,
          format: input.format ?? null,
          notes: input.notes ?? null,
          productType: input.productType,
          deadline: input.deadline ?? null,
          budgetKurus: input.budgetTl !== undefined ? Math.round(input.budgetTl * 100) : null,
          consentAt: new Date(),
          initials: input.initials ?? null,
          status: "NEW",
          attachments: { create: stored.map((s) => ({ storageKey: s.key, originalName: s.name, mimeType: "image/webp", sizeBytes: s.size })) },
        },
      });
      return co;
    });
    await sendEmail(
      "custom_request_received",
      email,
      { customerName: input.name, summary: `${input.productType}: ${input.text.slice(0, SUMMARY_MAX)}`, url: user ? appUrl("/hesabim?tab=ozel") : null },
      { userId: user?.id, logPayload: { customOrderId: created.id } }
    );
    const adminTo = getEnv().ADMIN_NOTIFY_EMAIL;
    if (adminTo) {
      await sendEmail(
        "new_custom_order",
        adminTo,
        { customOrderId: created.id, customerName: input.name, customerEmail: email, summary: `${input.productType}: ${input.text.slice(0, SUMMARY_MAX)}`, url: appUrl(`/admin/ozel-siparisler/${created.id}`) },
        { logPayload: { customOrderId: created.id } }
      );
    }
    return { id: created.id, received: true };
  } catch (e) {
    // Roll back orphan objects if the DB write failed.
    await Promise.all(stored.map((s) => storage.deleteObject({ bucket: "private", key: s.key }).catch(() => undefined)));
    throw e;
  }
}

// ───────────────────────── Views ─────────────────────────

const viewInclude = { attachments: true, messages: { orderBy: { createdAt: "asc" as const } }, order: { select: { number: true, status: true } } } satisfies Prisma.CustomOrderInclude;
type Full = Prisma.CustomOrderGetPayload<{ include: typeof viewInclude }>;

function customerView(co: Full) {
  return {
    id: co.id,
    createdAt: co.createdAt,
    status: co.status,
    productType: co.productType ?? null,
    text: co.text,
    size: co.size,
    threadColor: co.threadColor,
    deadline: co.deadline ?? null,
    attachmentCount: co.attachments.length,
    quote:
      co.quoteKurus != null && (co.status === "QUOTED" || co.status === "CONVERTED" || co.status === "ACCEPTED")
        ? { priceKurus: co.quoteKurus, prepDays: co.prepDays ?? null, note: co.quoteNote, validUntil: co.quoteValidUntil ?? null, quotedAt: co.quotedAt }
        : null,
    orderNumber: co.order?.number ?? null,
  };
}

export async function listMyCustomOrders(userId: string) {
  const rows = await db.customOrder.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: viewInclude, take: 50 });
  const out = [];
  for (const r of rows) out.push(customerView(r));
  return { requests: out };
}

/** IDOR-safe: scoped to the owner; anything else is a 404 (never 403). */
async function ownedOrThrow(id: string, userId: string) {
  const co = await db.customOrder.findFirst({ where: { id, userId }, include: viewInclude });
  if (!co) throw new AppError("NOT_FOUND", "Talep bulunamadı.");
  return co;
}

export async function getMyCustomOrder(id: string, userId: string) {
  const co = await ownedOrThrow(id, userId);
  return { request: customerView(co) };
}

// ───────────────────────── Admin ─────────────────────────

export async function listAdminCustomOrders(f: { status?: CustomOrderStatus; search?: string; page?: number; pageSize?: number }) {
  const pageSize = f.pageSize ?? 25;
  const page = f.page ?? 1;
  const q = f.search?.trim();
  const where: Prisma.CustomOrderWhereInput = {
    ...(f.status ? { status: f.status } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { text: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    db.customOrder.count({ where }),
    db.customOrder.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { _count: { select: { attachments: true } } } }),
  ]);
  const requests = [];
  for (const r of rows) {
    const m = r;
    requests.push({ id: r.id, createdAt: r.createdAt, name: r.name, email: r.email, status: r.status, productType: m.productType ?? null, deadline: m.deadline ?? null, quoteKurus: r.quoteKurus, attachmentCount: r._count.attachments, linkedUser: !!r.userId });
  }
  return { total, page, pageSize, requests };
}

export async function getAdminCustomOrder(id: string) {
  const co = await db.customOrder.findUnique({ where: { id }, include: viewInclude });
  if (!co) throw new AppError("NOT_FOUND", "Talep bulunamadı.");
  const storage = getStorage();
  const attachments = [];
  for (const a of co.attachments) {
    attachments.push({
      id: a.id,
      name: a.originalName,
      sizeBytes: a.sizeBytes,
      mimeType: a.mimeType,
      url: await storage.getSignedDownloadUrl({ key: a.storageKey, ttlSeconds: 600, filename: a.originalName }),
    });
  }
  return {
    request: {
      id: co.id, createdAt: co.createdAt, status: co.status, name: co.name, email: co.email, phone: co.phone, userId: co.userId,
      text: co.text, size: co.size, threadColor: co.threadColor, machineModel: co.machineModel, format: co.format, notes: co.notes,
      quoteKurus: co.quoteKurus, quoteNote: co.quoteNote, quotedAt: co.quotedAt,
      productType: co.productType ?? null, deadline: co.deadline ?? null, budgetKurus: co.budgetKurus ?? null,
      prepDays: co.prepDays ?? null, validUntil: co.quoteValidUntil ?? null, initials: co.initials ?? null,
      orderNumber: co.order?.number ?? null,
      attachments,
      messages: co.messages.map((m) => ({ id: m.id, authorType: m.authorType, body: m.body, createdAt: m.createdAt })),
    },
  };
}

const ADMIN_FLOW: Record<string, CustomOrderStatus[]> = {
  NEW: ["REVIEWING", "REJECTED", "CANCELLED"],
  REVIEWING: ["REJECTED", "CANCELLED"],
  QUOTED: ["REVIEWING", "REJECTED", "CANCELLED"],
};

export async function adminSetCustomStatus(id: string, to: "REVIEWING" | "REJECTED" | "CANCELLED", actorId: string, ip?: string | null) {
  const co = await db.customOrder.findUnique({ where: { id } });
  if (!co) throw new AppError("NOT_FOUND", "Talep bulunamadı.");
  if (!ADMIN_FLOW[co.status]?.includes(to)) throw new AppError("CONFLICT", `Durum ${co.status} → ${to} geçişi yapılamaz.`);
  await db.$transaction(async (tx) => {
    await tx.customOrder.update({ where: { id }, data: { status: to } });
    await writeAudit({ actorUserId: actorId, action: "customorder.status", entity: "CustomOrder", entityId: id, diff: { from: co.status, to }, ip }, tx);
  });
  return getAdminCustomOrder(id);
}

export async function sendQuote(
  id: string,
  q: { priceKurus: number; prepDays: number; note?: string; validUntil: string },
  actorId: string,
  ip?: string | null
) {
  const co = await db.customOrder.findUnique({ where: { id } });
  if (!co) throw new AppError("NOT_FOUND", "Talep bulunamadı.");
  if (!["NEW", "REVIEWING", "QUOTED"].includes(co.status)) throw new AppError("CONFLICT", "Bu talep için teklif verilemez.");
  const validEnd = new Date(`${q.validUntil}T23:59:59.999Z`);
  if (validEnd.getTime() < Date.now()) throw new AppError("VALIDATION", "Geçerlilik tarihi geçmişte olamaz.", { details: { field: "validUntil" } });

  let token: string | null = null;
  await db.$transaction(async (rawTx) => {
    const tx = rawTx as unknown as DbClient;
    await tx.customOrder.update({ where: { id }, data: { status: "QUOTED", quoteKurus: q.priceKurus, quoteNote: q.note ?? null, quotedAt: new Date(), prepDays: q.prepDays, quoteValidUntil: q.validUntil } });
    await tx.customOrderMessage.create({ data: { customOrderId: id, authorType: "ADMIN", authorUserId: actorId, body: q.note ?? "Teklif gönderildi." } });
    if (!co.userId) {
      token = randomToken(32);
      await tx.customOrder.update({ where: { id }, data: { accessTokenHash: sha256Hex(token), accessTokenExpiresAt: validEnd } });
    }
    await writeAudit({ actorUserId: actorId, action: "customorder.quote", entity: "CustomOrder", entityId: id, diff: { priceKurus: q.priceKurus, prepDays: q.prepDays, validUntil: q.validUntil }, ip }, tx);
  });
  const url = co.userId ? appUrl("/hesabim?tab=ozel") : appUrl(`/kisiye-ozel/teklif/${token}`);
  await sendEmail("quote_sent", co.email, { customerName: co.name, quoteKurus: q.priceKurus, note: q.note ?? null, url, prepDays: q.prepDays, validUntil: q.validUntil }, { userId: co.userId ?? undefined, logPayload: { customOrderId: id } });
  return getAdminCustomOrder(id);
}

// ───────────────────────── Customer / guest decision ─────────────────────────

async function decide(co: Full, decision: "ACCEPT" | "REJECT", guest: boolean) {
  if (co.status !== "QUOTED" || co.quoteKurus == null) throw new AppError("CONFLICT", "Bu talep için bekleyen bir teklif yok.");
  if (decision === "REJECT") {
    await db.$transaction(async (tx) => {
      await tx.customOrder.update({ where: { id: co.id }, data: { status: "REJECTED" } });
      await tx.customOrderMessage.create({ data: { customOrderId: co.id, authorType: "CUSTOMER", authorUserId: co.userId, body: "Teklif reddedildi." } });
    });
    return { status: "REJECTED" as const };
  }
  if (co.quoteValidUntil && new Date(`${co.quoteValidUntil}T23:59:59.999Z`).getTime() < Date.now()) {
    throw new AppError("CONFLICT", "Teklifin geçerlilik süresi dolmuş. Lütfen yeni bir teklif isteyin.");
  }
  const env = getEnv();
  const providerName = env.PAYMENT_PROVIDER;
  const guestToken = guest ? randomToken(32) : null;
  const price = co.quoteKurus;
  const created = await db.$transaction(async (rawTx) => {
    const tx = rawTx as unknown as DbClient;
    // Atomic claim: only one concurrent accept wins.
    const claimed = await tx.customOrder.updateMany({ where: { id: co.id, status: "QUOTED" }, data: { status: "ACCEPTED" } });
    if (claimed.count !== 1) throw new AppError("CONFLICT", "Bu teklif zaten yanıtlanmış.");
    const number = await nextOrderNumber(tx);
    const order = await tx.order.create({
      data: {
        number, userId: co.userId, email: co.email, phone: co.phone,
        status: "PENDING_PAYMENT", paymentStatus: "PENDING",
        digitalFulfillmentStatus: "NOT_REQUIRED", physicalFulfillmentStatus: "PENDING",
        subtotalKurus: price, discountKurus: 0, shippingKurus: 0, totalKurus: price,
        customerNote: `Kişiye özel talep ${co.id}`,
        guestAccessTokenHash: guestToken ? sha256Hex(guestToken) : null,
        items: {
          create: [{
            productId: null, kind: "PHYSICAL", productName: `Kişiye özel: ${co.productType ?? "Nakış"}`,
            sku: `OZEL-${co.id.slice(-8).toUpperCase()}`, unitPriceKurus: price, quantity: 1, lineTotalKurus: price,
            personalization: { customOrderId: co.id, text: co.text, size: co.size, threadColor: co.threadColor, initials: co.initials ?? null },
            fulfillmentStatus: "PENDING" as const,
          }],
        },
      },
    });
    const payment = await tx.payment.create({
      data: { orderId: order.id, provider: providerName, status: "PENDING", amountKurus: price, idempotencyKey: randomUUID() },
    });
    await tx.customOrder.update({ where: { id: co.id }, data: { status: "CONVERTED", orderId: order.id } });
    await tx.customOrderMessage.create({ data: { customOrderId: co.id, authorType: "CUSTOMER", authorUserId: co.userId, body: "Teklif kabul edildi." } });
    return { orderId: order.id, number, paymentId: payment.id };
  });

  let init: { message: string; redirectUrl?: string; providerPaymentId?: string };
  try {
    init = await getPaymentProvider(providerName).initiate({ paymentId: created.paymentId, orderNumber: created.number, amountKurus: price, currency: "TRY", email: co.email });
  } catch {
    init = { message: "Siparişiniz oluşturuldu — ödeme başlatılamadı, ödeme bekleniyor." };
  }
  if (init.providerPaymentId) await db.payment.update({ where: { id: created.paymentId }, data: { providerPaymentId: init.providerPaymentId } });
  await sendEmail("order_created", co.email, { orderNumber: created.number, totalKurus: price, url: co.userId ? `/hesabim?tab=siparisler&siparis=${created.number}` : `/odeme?siparis=${created.number}` }, { userId: co.userId ?? undefined });
  return {
    status: "CONVERTED" as const,
    orderNumber: created.number,
    payment: { provider: providerName, status: "PENDING", canSimulate: providerName === "simulated", message: init.message, redirectUrl: init.redirectUrl },
    guestAccessToken: guestToken ?? undefined,
  };
}

export async function decideMyCustomOrder(id: string, userId: string, decision: "ACCEPT" | "REJECT") {
  const co = await ownedOrThrow(id, userId);
  return decide(co, decision, false);
}

async function byToken(token: string) {
  const co = await db.customOrder.findUnique({ where: { accessTokenHash: sha256Hex(token) }, include: viewInclude });
  if (!co || !co.accessTokenExpiresAt || co.accessTokenExpiresAt.getTime() < Date.now()) throw new AppError("NOT_FOUND", "Bağlantı geçersiz veya süresi dolmuş.");
  return co;
}

export async function getByToken(token: string, ip: string) {
  await enforceRateLimit({ name: "custom-order:token", id: ip, limit: 30, windowSec: 600 });
  const co = await byToken(token);
  return { request: customerView(co) };
}

export async function decideByToken(token: string, decision: "ACCEPT" | "REJECT", ip: string) {
  await enforceRateLimit({ name: "custom-order:token", id: ip, limit: 30, windowSec: 600 });
  const co = await byToken(token);
  return decide(co, decision, !co.userId);
}
