import "server-only";
import { cookies } from "next/headers";
import { AppError } from "../../errors";
import { db, type DbClient } from "../../db";
import { getEnv } from "../../env";
import { randomToken, sha256Hex } from "../../crypto";
import { MAX_CART_LINES, MAX_QTY_PER_LINE } from "../../commerce-config";
import { availableForInventories } from "../inventory/stock";
import { evaluateCoupon, normalizeCode, type CouponLine } from "../coupons/service";
import { computeEmbroideryOffer, computeShipping, computeTotals, getShippingConfig } from "./totals";
import { loadProductByRef, loadProductsByIds, readStored, resolveLine, sameStored, type CatalogProduct, type ResolvedLine } from "./pricing";
import type { AddItemInput } from "./schema";

export const GUEST_CART_COOKIE = "tb_cart";
const GUEST_CART_MAX_AGE = 60 * 60 * 24 * 30;

// ── guest cookie ─────────────────────────────────────────────────────────────────────────────────
async function readGuestToken() {
  return (await cookies()).get(GUEST_CART_COOKIE)?.value;
}
async function setGuestCookie(token: string) {
  (await cookies()).set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_CART_MAX_AGE,
  });
}
async function clearGuestCookie() {
  (await cookies()).set(GUEST_CART_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: getEnv().NODE_ENV === "production", path: "/", maxAge: 0 });
}

export type CartOwner = { userId: string | null };

/** Find (optionally create) the cart for the signed-in user, else the guest cookie's cart. Only a HASH of the guest token is stored. */
export async function findCart(owner: CartOwner, create: boolean) {
  if (owner.userId) {
    const existing = await db.cart.findUnique({ where: { userId: owner.userId } });
    if (existing || !create) return existing;
    try {
      return await db.cart.create({ data: { userId: owner.userId } });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") return db.cart.findUnique({ where: { userId: owner.userId } });
      throw e;
    }
  }
  const token = await readGuestToken();
  if (token) {
    const c = await db.cart.findUnique({ where: { guestTokenHash: sha256Hex(token) } });
    if (c) return c;
  }
  if (!create) return null;
  const fresh = randomToken(32);
  const cart = await db.cart.create({ data: { guestTokenHash: sha256Hex(fresh) } });
  await setGuestCookie(fresh);
  return cart;
}

// ── view ─────────────────────────────────────────────────────────────────────────────────────────
export interface CartLineView {
  id: string;
  productId: string;
  slug: string;
  sku: string;
  name: string;
  type: string;
  kind: "DIGITAL" | "PHYSICAL";
  image: string | null;
  variantId: string | null;
  variantName: string | null;
  formatCode: string | null;
  licenseCode: string | null;
  licenseName: string | null;
  color: string | null;
  size: string | null;
  personalization: Record<string, string> | null;
  unitPriceKurus: number;
  quantity: number;
  lineTotalKurus: number;
  issues: string[];
  blocking: boolean;
}
export interface CartView {
  id: string | null;
  items: CartLineView[];
  couponCode: string | null;
  couponError: string | null;
  subtotalKurus: number;
  discountKurus: number;
  embroideryDiscountPercent: number;
  shippingKurus: number;
  totalKurus: number;
  hasPhysical: boolean;
  hasDigital: boolean;
  itemCount: number;
  blocking: boolean;
  freeShippingThresholdKurus: number;
}

export interface PricedCart {
  view: CartView;
  /** Resolved, still-valid lines (what checkout turns into OrderItems). */
  lines: { itemId: string; resolved: ResolvedLine; quantity: number; lineTotalKurus: number }[];
  couponId: string | null;
}

type CartWithItems = NonNullable<Awaited<ReturnType<typeof loadCartRow>>>;
const loadCartRow = (client: DbClient, id: string) => client.cart.findUnique({ where: { id }, include: { items: { orderBy: { createdAt: "asc" } } } });

const emptyView = (cfg: { freeShippingThresholdKurus: number }): CartView => ({
  id: null, items: [], couponCode: null, couponError: null, subtotalKurus: 0, discountKurus: 0, embroideryDiscountPercent: 0, shippingKurus: 0, totalKurus: 0,
  hasPhysical: false, hasDigital: false, itemCount: 0, blocking: false, freeShippingThresholdKurus: cfg.freeShippingThresholdKurus,
});

/** Re-price every line from the catalog, check stock + coupon, compute totals. Shared by GET /api/cart and checkout. */
export async function priceCart(client: DbClient, cart: CartWithItems | null, who: { userId?: string | null; email?: string | null } = {}): Promise<PricedCart> {
  const cfg = await getShippingConfig(client);
  if (!cart) return { view: emptyView(cfg), lines: [], couponId: null };

  const products = await loadProductsByIds(client, [...new Set(cart.items.map((i) => i.productId))]);
  const invIds = new Set<string>();
  const resolvedByItem = new Map<string, { resolved?: ResolvedLine; error?: string }>();
  for (const it of cart.items) {
    const p = products.get(it.productId);
    if (!p || p.status !== "ACTIVE") {
      resolvedByItem.set(it.id, { error: "Bu ürün artık satışta değil." });
      continue;
    }
    try {
      const stored = readStored(it.personalization);
      const resolved = resolveLine(p, {
        variantId: it.variantId ?? undefined,
        format: it.formatId ? p.formats.find((f) => f.formatId === it.formatId)?.format.code : undefined,
        license: it.licenseId ? p.licenses.find((l) => l.licenseId === it.licenseId)?.license.code : undefined,
        color: stored.color,
        size: stored.size,
        personalization: stored.options ?? undefined,
      });
      resolvedByItem.set(it.id, { resolved });
      if (resolved.inventoryId) invIds.add(resolved.inventoryId);
    } catch (e) {
      resolvedByItem.set(it.id, { error: e instanceof AppError ? e.message : "Bu satır geçersiz." });
    }
  }

  const avail = await availableForInventories(client, [...invIds]);
  const demand = new Map<string, number>();
  for (const it of cart.items) {
    const r = resolvedByItem.get(it.id)?.resolved;
    if (r?.inventoryId) demand.set(r.inventoryId, (demand.get(r.inventoryId) ?? 0) + it.quantity);
  }

  const items: CartLineView[] = [];
  const lines: PricedCart["lines"] = [];
  const couponLines: CouponLine[] = [];
  for (const it of cart.items) {
    const p = products.get(it.productId);
    const entry = resolvedByItem.get(it.id)!;
    const r = entry.resolved;
    const issues: string[] = [];
    let blocking = false;
    if (entry.error) {
      issues.push(entry.error);
      blocking = true;
    }
    if (r) {
      if (r.kind === "PHYSICAL") {
        if (!r.inventoryId) {
          issues.push("Bu ürün şu an stokta yok.");
          blocking = true;
        } else {
          const a = avail.get(r.inventoryId) ?? 0;
          if ((demand.get(r.inventoryId) ?? 0) > a) {
            issues.push(a > 0 ? `Stokta yalnızca ${a} adet var.` : "Bu ürün stokta kalmadı.");
            blocking = true;
          }
        }
      }
    }
    const unit = r?.unitPriceKurus ?? 0;
    const qty = r?.kind === "DIGITAL" ? 1 : it.quantity;
    const total = blocking && !r ? 0 : unit * qty;
    const st = readStored(it.personalization);
    items.push({
      id: it.id,
      productId: it.productId,
      slug: p?.slug ?? "",
      sku: p?.sku ?? "",
      name: p?.name ?? "Ürün",
      type: p?.type ?? "",
      kind: r?.kind ?? "PHYSICAL",
      image: p?.images[0]?.url ?? null,
      variantId: r?.variant?.id ?? null,
      variantName: r?.variant?.name ?? null,
      formatCode: r?.format?.code ?? null,
      licenseCode: r?.license?.code ?? null,
      licenseName: r?.license?.name ?? null,
      color: st.color ?? null,
      size: st.size ?? null,
      personalization: st.options ? (st.options as Record<string, string>) : null,
      unitPriceKurus: unit,
      quantity: qty,
      lineTotalKurus: total,
      issues,
      blocking,
    });
    if (r && !entry.error) {
      lines.push({ itemId: it.id, resolved: r, quantity: qty, lineTotalKurus: total });
      couponLines.push({ productId: it.productId, categoryId: p?.categoryId ?? null, lineTotalKurus: total });
    }
  }

  const subtotalKurus = couponLines.reduce((s, l) => s + l.lineTotalKurus, 0);
  const embroideryOffer = computeEmbroideryOffer(lines
    .filter(({ resolved: { product } }) => product.type === "DIGITAL_EMBROIDERY" && !product.isDemo)
    .map(({ resolved, lineTotalKurus }) => ({ productId: resolved.product.id, lineTotalKurus })));
  let discountKurus = embroideryOffer.discountKurus;
  let embroideryDiscountPercent = embroideryOffer.percent;
  let couponError: string | null = null;
  let couponId: string | null = null;
  if (cart.couponCode) {
    try {
      const ev = await evaluateCoupon(client, cart.couponCode, couponLines, who);
      if (ev.discountKurus > discountKurus) {
        discountKurus = ev.discountKurus;
        couponId = ev.coupon.id;
        embroideryDiscountPercent = 0;
      }
    } catch (e) {
      couponError = e instanceof AppError ? e.message : "Kupon uygulanamadı.";
    }
  }
  const hasPhysical = lines.some((l) => l.resolved.kind === "PHYSICAL");
  const hasDigital = lines.some((l) => l.resolved.kind === "DIGITAL");
  const shippingKurus = computeShipping(cfg, { hasPhysical, subtotalKurus, discountKurus });
  const totals = computeTotals({ subtotalKurus, discountKurus, shippingKurus });
  return {
    lines,
    couponId,
    view: {
      id: cart.id,
      items,
      couponCode: cart.couponCode,
      couponError,
      embroideryDiscountPercent,
      ...totals,
      hasPhysical,
      hasDigital,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      blocking: items.some((i) => i.blocking),
      freeShippingThresholdKurus: cfg.freeShippingThresholdKurus,
    },
  };
}

export async function getCartView(owner: CartOwner, who: { email?: string | null } = {}): Promise<CartView> {
  const cart = await findCart(owner, false);
  const row = cart ? await loadCartRow(db, cart.id) : null;
  return (await priceCart(db, row, { userId: owner.userId, ...who })).view;
}

// ── mutations ────────────────────────────────────────────────────────────────────────────────────
export async function addItem(owner: CartOwner, input: AddItemInput): Promise<CartView> {
  const product = await loadProductByRef(db, input.productId);
  if (!product) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
  const resolved = resolveLine(product, input); // validates everything; price is NOT taken from the client
  const qty = resolved.kind === "DIGITAL" ? 1 : input.quantity;

  const cart = (await findCart(owner, true))!;
  const items = await db.cartItem.findMany({ where: { cartId: cart.id } });
  const match = items.find(
    (i) =>
      i.productId === product.id &&
      (i.variantId ?? null) === (resolved.variant?.id ?? null) &&
      (i.formatId ?? null) === (resolved.format?.id ?? null) &&
      (i.licenseId ?? null) === (resolved.license?.id ?? null) &&
      sameStored(readStored(i.personalization), resolved.stored)
  );
  if (resolved.kind === "PHYSICAL") {
    if (!resolved.inventoryId) throw new AppError("OUT_OF_STOCK", "Bu ürün şu an stokta yok.");
    const avail = (await availableForInventories(db, [resolved.inventoryId])).get(resolved.inventoryId) ?? 0;
    const inCart = items.filter((i) => i.productId === product.id && (i.variantId ?? null) === (resolved.variant?.id ?? null)).reduce((s, i) => s + i.quantity, 0);
    if (inCart + qty > avail) {
      throw new AppError("OUT_OF_STOCK", avail > 0 ? `Stokta yalnızca ${avail} adet var.` : "Bu ürün stokta kalmadı.", { details: { available: avail } });
    }
  }
  if (match) {
    if (resolved.kind === "PHYSICAL") {
      await db.cartItem.update({ where: { id: match.id }, data: { quantity: Math.min(match.quantity + qty, MAX_QTY_PER_LINE) } });
    } // digital: one license per format; adding again is a no-op
  } else {
    if (items.length >= MAX_CART_LINES) throw new AppError("VALIDATION", "Sepet en fazla 50 satır içerebilir.");
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        variantId: resolved.variant?.id ?? null,
        formatId: resolved.format?.id ?? null,
        licenseId: resolved.license?.id ?? null,
        personalization: resolved.kind === "PHYSICAL" ? (resolved.stored as object) : undefined,
        quantity: qty,
      },
    });
  }
  return getCartView(owner);
}

async function ownedItem(owner: CartOwner, itemId: string) {
  const cart = await findCart(owner, false);
  const item = cart ? await db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } }) : null;
  if (!cart || !item) throw new AppError("NOT_FOUND", "Sepet satırı bulunamadı.");
  return { cart, item };
}

export async function updateItemQuantity(owner: CartOwner, itemId: string, quantity: number): Promise<CartView> {
  const { item } = await ownedItem(owner, itemId);
  if (quantity === 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return getCartView(owner);
  }
  const product = (await loadProductsByIds(db, [item.productId])).get(item.productId);
  if (!product) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
  if (product.type === "DIGITAL_EMBROIDERY" || product.type === "DIGITAL_PRINT") {
    if (quantity !== 1) throw new AppError("VALIDATION", "Dijital ürünler için adet her zaman 1'dir.");
  } else {
    const inv = (item.variantId ? product.variants.find((v) => v.id === item.variantId)?.inventory : product.inventory) ?? null;
    if (!inv) throw new AppError("OUT_OF_STOCK", "Bu ürün şu an stokta yok.");
    const avail = (await availableForInventories(db, [inv.id])).get(inv.id) ?? 0;
    const others = (await db.cartItem.findMany({ where: { cartId: item.cartId, productId: item.productId, id: { not: item.id } } }))
      .filter((i) => (i.variantId ?? null) === (item.variantId ?? null))
      .reduce((s, i) => s + i.quantity, 0);
    if (others + quantity > avail) {
      throw new AppError("OUT_OF_STOCK", avail > 0 ? `Stokta yalnızca ${avail} adet var.` : "Bu ürün stokta kalmadı.", { details: { available: avail } });
    }
  }
  await db.cartItem.update({ where: { id: item.id }, data: { quantity } });
  return getCartView(owner);
}

export async function removeItem(owner: CartOwner, itemId: string): Promise<CartView> {
  const { item } = await ownedItem(owner, itemId);
  await db.cartItem.delete({ where: { id: item.id } });
  return getCartView(owner);
}

export async function applyCartCoupon(owner: CartOwner, rawCode: string, who: { email?: string | null } = {}): Promise<CartView> {
  const cart = await findCart(owner, false);
  if (!cart) throw new AppError("VALIDATION", "Sepetiniz boş.");
  const code = normalizeCode(rawCode);
  const row = await loadCartRow(db, cart.id);
  const probe = await priceCart(db, row ? { ...row, couponCode: code } : null, { userId: owner.userId, ...who });
  if (probe.view.couponError) throw new AppError("VALIDATION", probe.view.couponError, { details: { coupon: true } });
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
  return getCartView(owner, who);
}

export async function removeCartCoupon(owner: CartOwner): Promise<CartView> {
  const cart = await findCart(owner, false);
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  return getCartView(owner);
}

/** After login/registration: fold the guest cart (cookie) into the user's cart. Never throws to the caller's flow. */
export async function mergeGuestCart(userId: string): Promise<void> {
  const token = await readGuestToken();
  if (!token) return;
  const guest = await db.cart.findUnique({ where: { guestTokenHash: sha256Hex(token) }, include: { items: true } });
  if (!guest) {
    await clearGuestCookie();
    return;
  }
  const userCart = (await findCart({ userId }, true))!;
  const existing = await db.cartItem.findMany({ where: { cartId: userCart.id } });
  for (const gi of guest.items) {
    const match = existing.find(
      (e) =>
        e.productId === gi.productId &&
        (e.variantId ?? null) === (gi.variantId ?? null) &&
        (e.formatId ?? null) === (gi.formatId ?? null) &&
        (e.licenseId ?? null) === (gi.licenseId ?? null) &&
        sameStored(readStored(e.personalization), readStored(gi.personalization))
    );
    if (match) {
      if (!gi.formatId) await db.cartItem.update({ where: { id: match.id }, data: { quantity: Math.min(match.quantity + gi.quantity, MAX_QTY_PER_LINE) } });
    } else if (existing.length < MAX_CART_LINES) {
      const created = await db.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: gi.productId,
          variantId: gi.variantId,
          formatId: gi.formatId,
          licenseId: gi.licenseId,
          personalization: (gi.personalization ?? undefined) as object | undefined,
          quantity: gi.quantity,
        },
      });
      existing.push(created);
    }
  }
  if (guest.couponCode && !userCart.couponCode) await db.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
  await db.cart.delete({ where: { id: guest.id } });
  await clearGuestCookie();
}

export type { CatalogProduct };
