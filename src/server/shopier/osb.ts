// Shopier OSB (Otomatik Sipariş Bildirimi). No server-only import: unit tests and the route share it.
// Signature matches the published PHP sample and the public implementations
// (hash_hmac('sha256', res + username, key) as lowercase hex):
// https://github.com/TheVoll/shopierwebhook and https://github.com/nopeion/shopier
import { createHmac, timingSafeEqual } from "node:crypto";
import { parseTlToKurus } from "@/lib/money";

export interface ShopierOsbNotice {
  orderId: string;
  email: string;
  currency: string;
  priceKurus: number;
  buyerName: string;
  buyerSurname: string;
  productIds: string[];
  customerNote: string;
  isTest: boolean;
}

export class ShopierOsbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShopierOsbError";
  }
}

/** Lowercase hex HMAC-SHA256 of `res + username`, keyed with the OSB password. */
export function shopierOsbHash(res: string, username: string, key: string): string {
  return createHmac("sha256", key).update(`${res}${username}`).digest("hex");
}

export function verifyShopierOsb(res: string, hash: string, username: string, key: string): boolean {
  if (!res || !hash || !username || !key) return false;
  const expected = shopierOsbHash(res, username, key);
  const received = hash.trim().toLowerCase();
  if (expected.length !== received.length || !/^[0-9a-f]+$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function read(raw: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (Object.prototype.hasOwnProperty.call(raw, key)) return raw[key];
  return undefined;
}

function text(value: unknown, max: number): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, max);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/** Numeric Shopier product ids. `productid` wins; productlist/chartdetails are used only when it is empty. */
export function shopierProductIds(raw: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const add = (value: unknown, depth = 0) => {
    if (depth > 4 || ids.size >= 20) return;
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      ids.add(String(value));
      return;
    }
    if (typeof value === "string") {
      for (const part of value.split(/[,|;]/)) {
        const token = part.trim();
        if (/^[1-9]\d{0,19}$/.test(token)) ids.add(token);
      }
      if (value.trim().startsWith("{") || value.trim().startsWith("[")) {
        try {
          add(JSON.parse(value), depth + 1);
        } catch {
          /* product list is often plain text */
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) add(item, depth + 1);
      return;
    }
    const record = asRecord(value);
    if (!record) return;
    for (const key of ["productid", "productId", "id"]) add(record[key], depth + 1);
  };
  add(read(raw, ["productid", "productId"]));
  if (ids.size === 0) {
    add(read(raw, ["productlist", "productList"]));
    add(read(raw, ["chartdetails", "chartDetails"]));
  }
  return [...ids];
}

function currencyLabel(value: unknown): string {
  const token = text(value, 8);
  if (token === "0" || token === "TL" || token === "TRY") return "TRY";
  if (token === "1" || token === "USD") return "USD";
  if (token === "2" || token === "EUR") return "EUR";
  return token || "TRY";
}

export function parseShopierOsb(res: string): ShopierOsbNotice {
  let decoded: string;
  try {
    decoded = Buffer.from(res, "base64").toString("utf8");
  } catch {
    throw new ShopierOsbError("OSB gövdesi çözülemedi.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new ShopierOsbError("OSB gövdesi JSON değil.");
  }
  const raw = asRecord(parsed);
  if (!raw) throw new ShopierOsbError("OSB gövdesi nesne olmalı.");
  const email = text(read(raw, ["email"]), 200).toLowerCase();
  const orderId = text(read(raw, ["orderid", "orderId"]), 64);
  const priceKurus = parseTlToKurus(text(read(raw, ["price"]), 32));
  const productIds = shopierProductIds(raw);
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) throw new ShopierOsbError("OSB e-posta adresi yok.");
  if (!orderId) throw new ShopierOsbError("OSB sipariş numarası yok.");
  if (priceKurus === null || priceKurus <= 0) throw new ShopierOsbError("OSB tutarı geçersiz.");
  if (productIds.length === 0) throw new ShopierOsbError("OSB ürün numarası yok.");
  const isTestRaw = read(raw, ["istest", "isTest"]);
  return {
    orderId,
    email,
    currency: currencyLabel(read(raw, ["currency"])),
    priceKurus,
    buyerName: text(read(raw, ["buyername", "buyerName"]), 80),
    buyerSurname: text(read(raw, ["buyersurname", "buyerSurname"]), 80),
    productIds,
    customerNote: text(read(raw, ["customernote", "customerNote"]), 500),
    isTest: isTestRaw === 1 || isTestRaw === true || isTestRaw === "1",
  };
}
