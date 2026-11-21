// Shopier REST webhook (PAT subscriptions). No server-only import.
// Signature: HMAC-SHA256 of the raw body with the create-response token,
// compared to the Shopier-Signature header (hex or base64).
// https://developer.shopier.com/reference/webhook-configuration
import { createHmac, timingSafeEqual } from "node:crypto";
import { parseTlToKurus } from "@/lib/money";
import type { ShopierOsbNotice } from "./osb";

const FULFILL_EVENTS = new Set(["order.created", "order.paid", "order.fulfilled"]);
const UNPAID = new Set(["unpaid", "pending", "failed", "refunded", "cancelled", "canceled"]);

export function verifyShopierWebhook(rawBody: string, signature: string | null, token: string): boolean {
  if (!signature || !token) return false;
  const received = signature.trim();
  const hex = createHmac("sha256", token).update(rawBody).digest("hex");
  const base64 = createHmac("sha256", token).update(rawBody).digest("base64");
  return safeEqual(hex, received.toLowerCase()) || safeEqual(base64, received);
}

function safeEqual(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, max);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function orderRecord(body: unknown): Record<string, unknown> | null {
  if (!isRecord(body)) return null;
  if (isRecord(body.data)) return body.data;
  if (isRecord(body.order)) return body.order;
  return body;
}

function productIds(order: Record<string, unknown>): string[] {
  const lines = order.lineItems ?? order.line_items ?? order.products;
  if (!Array.isArray(lines)) return [];
  const ids: string[] = [];
  for (const line of lines) {
    if (!isRecord(line)) continue;
    const id = text(line.productId ?? line.product_id ?? line.id, 32);
    if (/^[1-9]\d{0,19}$/.test(id) && !ids.includes(id)) ids.push(id);
    if (ids.length >= 20) break;
  }
  return ids;
}

function money(order: Record<string, unknown>): string {
  const totals = isRecord(order.totals) ? order.totals : {};
  return text(totals.total ?? totals.grandTotal ?? order.total ?? order.price, 32);
}

function currencyOf(order: Record<string, unknown>): string {
  const totals = isRecord(order.totals) ? order.totals : {};
  const token = text(order.currency ?? totals.currency, 8).toUpperCase();
  if (token === "0" || token === "TL" || token === "TRY") return "TRY";
  return token;
}

export type ShopierWebhookDecision =
  | { action: "ignore" }
  | { action: "invalid" }
  | { action: "fulfill"; notice: ShopierOsbNotice };

/** Map a verified webhook body to the same notice OSB fulfillment already records. */
export function decideShopierWebhook(body: unknown, eventHeader: string | null): ShopierWebhookDecision {
  const event = (eventHeader?.trim() || (isRecord(body) ? text(body.event ?? body.type, 64) : "")).toLowerCase();
  if (!FULFILL_EVENTS.has(event)) return { action: "ignore" };
  const order = orderRecord(body);
  if (!order) return { action: "invalid" };
  const payment = text(order.paymentStatus ?? order.payment_status, 32).toLowerCase();
  if (payment && UNPAID.has(payment)) return { action: "ignore" };
  const shipping = isRecord(order.shippingInfo) ? order.shippingInfo : isRecord(order.shipping) ? order.shipping : {};
  const email = text(shipping.email ?? order.email, 200).toLowerCase();
  const orderId = text(order.id ?? order.orderId, 64);
  const priceKurus = parseTlToKurus(money(order));
  const ids = productIds(order);
  if (!/^[^\s@]+@[^\s@]+$/.test(email) || !orderId || priceKurus === null || priceKurus <= 0 || ids.length === 0) {
    return { action: "invalid" };
  }
  return {
    action: "fulfill",
    notice: {
      orderId,
      email,
      currency: currencyOf(order) || "TRY",
      priceKurus,
      buyerName: text(shipping.firstName ?? shipping.name, 80),
      buyerSurname: text(shipping.lastName ?? shipping.surname, 80),
      productIds: ids,
      customerNote: text(order.note ?? order.customerNote, 500),
      isTest: order.isTest === true || order.istest === 1,
    },
  };
}
