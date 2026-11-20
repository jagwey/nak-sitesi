import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "../../errors";
import { db, type DbClient } from "../../db";
import { getEnv } from "../../env";
import { randomToken, sha256Hex } from "../../crypto";
import { findCart, priceCart } from "../cart/service";
import { reserveStock } from "../inventory/stock";
import { redeemCoupon } from "../coupons/service";
import { getPaymentProvider, type InitiateResult } from "../payments/provider";
import { sendEmail } from "../notifications/email";
import { nextOrderNumber } from "./numbering";
import { orderView, orderInclude } from "./service";
import type { AddressSnapshot, CheckoutInput } from "./schema";

export interface CheckoutResult {
  order: ReturnType<typeof orderView>;
  payment: { provider: string; status: string; canSimulate: boolean; message: string; redirectUrl?: string };
  /** Guest physical orders only: shown ONCE; only its hash is stored. */
  guestAccessToken?: string;
}

async function resolveAddress(client: DbClient, userId: string | null, input: CheckoutInput): Promise<AddressSnapshot> {
  if (input.addressId) {
    if (!userId) throw new AppError("VALIDATION", "Kayıtlı adres için giriş yapmalısınız.");
    const a = await client.address.findFirst({ where: { id: input.addressId, userId } }); // IDOR-safe: scoped to the user
    if (!a) throw new AppError("NOT_FOUND", "Adres bulunamadı.");
    return { fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? undefined, city: a.city, district: a.district, postalCode: a.postalCode ?? undefined, country: a.country };
  }
  if (!input.shippingAddress) throw new AppError("VALIDATION", "Fiziksel ürünler için teslimat adresi gerekli.", { details: { field: "shippingAddress" } });
  return input.shippingAddress;
}

/**
 * ONE transaction: lock cart -> re-price from the catalog -> reserve stock (atomic) -> redeem coupon (atomic)
 * -> order (PENDING_PAYMENT) + item snapshots -> Payment(PENDING) -> clear cart. Never marks anything paid.
 */
export async function checkout(user: { id: string; email: string; phone?: string | null } | null, input: CheckoutInput): Promise<CheckoutResult> {
  const email = (user?.email ?? input.email)?.toLowerCase();
  if (!email) throw new AppError("VALIDATION", "Sipariş için e-posta adresi gerekli.", { details: { field: "email" } });
  const cart0 = await findCart({ userId: user?.id ?? null }, false);
  if (!cart0) throw new AppError("VALIDATION", "Sepetiniz boş.");
  const env = getEnv();
  const providerName = env.PAYMENT_PROVIDER;
  const provider = getPaymentProvider(providerName);
  const expiresAt = new Date(Date.now() + env.RESERVATION_TTL_MINUTES * 60_000);
  const guestToken = !user ? randomToken(32) : undefined;

  const created = await db.$transaction(
    async (rawTx) => {
      const tx = rawTx as unknown as DbClient;
      await tx.$queryRaw`SELECT "id" FROM "Cart" WHERE "id" = ${cart0.id} FOR UPDATE`; // serialize double-submits
      const row = await tx.cart.findUnique({ where: { id: cart0.id }, include: { items: { orderBy: { createdAt: "asc" } } } });
      const priced = await priceCart(tx, row, { userId: user?.id, email });
      const v = priced.view;
      if (v.items.length === 0) throw new AppError("VALIDATION", "Sepetiniz boş.");
      if (v.blocking) {
        const issue = v.items.find((i) => i.blocking)!;
        const stock = issue.issues.some((m) => /stok/i.test(m));
        throw new AppError(stock ? "OUT_OF_STOCK" : "VALIDATION", `${issue.name}: ${issue.issues[0]}`, {
          details: { issues: v.items.filter((i) => i.blocking).map((i) => ({ id: i.id, issues: i.issues })) },
        });
      }
      // Digital deliveries are bound to an account (entitlement + re-download), so guests cannot buy them.
      if (v.hasDigital && !user) {
        throw new AppError("VALIDATION", "Dijital ürünler için giriş yapmalı veya hesap oluşturmalısınız.", { details: { requiresAccount: true } });
      }
      const shippingAddress = v.hasPhysical ? await resolveAddress(tx, user?.id ?? null, input) : null;
      if (v.couponCode && v.couponError) throw new AppError("VALIDATION", v.couponError, { details: { coupon: true } });

      const number = await nextOrderNumber(tx);
      const order = await tx.order.create({
        data: {
          number,
          userId: user?.id ?? null,
          email,
          phone: input.phone ?? user?.phone ?? shippingAddress?.phone ?? null,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          digitalFulfillmentStatus: v.hasDigital ? "PENDING" : "NOT_REQUIRED",
          physicalFulfillmentStatus: v.hasPhysical ? "PENDING" : "NOT_REQUIRED",
          subtotalKurus: v.subtotalKurus,
          discountKurus: v.discountKurus,
          shippingKurus: v.shippingKurus,
          totalKurus: v.totalKurus,
          couponCode: v.discountKurus > 0 ? v.couponCode : null,
          shippingAddress: shippingAddress ?? undefined,
          customerNote: input.customerNote ?? null,
          guestAccessTokenHash: guestToken && v.hasPhysical ? sha256Hex(guestToken) : null,
          items: {
            create: priced.lines.map((l) => ({
              productId: l.resolved.product.id,
              variantId: l.resolved.variant?.id ?? null,
              kind: l.resolved.kind,
              productName: l.resolved.product.name,
              sku: l.resolved.variant?.sku ?? l.resolved.product.sku,
              variantName: l.resolved.variant?.name ?? null,
              format: l.resolved.format?.code ?? null,
              license: l.resolved.license?.name ?? null,
              unitPriceKurus: l.resolved.unitPriceKurus,
              quantity: l.quantity,
              lineTotalKurus: l.lineTotalKurus,
              personalization: l.resolved.kind === "PHYSICAL" ? (l.resolved.stored as object) : undefined,
              fulfillmentStatus: "PENDING" as const,
            })),
          },
        },
      });

      const stock = priced.lines.filter((l) => l.resolved.inventoryId).map((l) => ({ inventoryId: l.resolved.inventoryId!, quantity: l.quantity }));
      if (stock.length) await reserveStock(tx, stock, { orderId: order.id, expiresAt });

      if (priced.couponId && v.discountKurus > 0) {
        await redeemCoupon(tx, priced.couponId, { orderId: order.id, discountKurus: v.discountKurus, userId: user?.id ?? null, email });
      }

      const payment = await tx.payment.create({
        data: { orderId: order.id, provider: providerName, status: "PENDING", amountKurus: order.totalKurus, idempotencyKey: randomUUID() },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart0.id } });
      await tx.cart.update({ where: { id: cart0.id }, data: { couponCode: null } });
      return { orderId: order.id, paymentId: payment.id };
    },
    { timeout: 20_000, maxWait: 10_000 }
  );

  const full = await db.order.findUniqueOrThrow({ where: { id: created.orderId }, include: orderInclude });
  let init: InitiateResult;
  try {
    init = await provider.initiate({ paymentId: created.paymentId, orderNumber: full.number, amountKurus: full.totalKurus, currency: full.currency, email });
  } catch {
    init = { status: "awaiting_payment", message: "Siparişiniz oluşturuldu — ödeme başlatılamadı, ödeme bekleniyor." };
  }
  if (init.providerPaymentId) await db.payment.update({ where: { id: created.paymentId }, data: { providerPaymentId: init.providerPaymentId } });

  const link = user ? `/hesabim?tab=siparisler&siparis=${full.number}` : `/odeme?siparis=${full.number}`;
  await sendEmail("order_created", email, { orderNumber: full.number, totalKurus: full.totalKurus, url: link });

  return {
    order: orderView(full),
    payment: { provider: providerName, status: "PENDING", canSimulate: providerName === "simulated", message: init.message, redirectUrl: init.redirectUrl },
    guestAccessToken: guestToken && full.guestAccessTokenHash ? guestToken : undefined,
  };
}
