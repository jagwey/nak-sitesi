import { beforeAll, describe, expect, it, vi } from "vitest";
import { call, jar, sent } from "./helpers";
import { seedCatalog } from "./catalog-fixtures";
import { __resetEnvForTests } from "@/server/env";
import { db } from "@/server/db";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as getCart } from "@/app/api/cart/route";
import { POST as addItemRoute } from "@/app/api/cart/items/route";
import { POST as couponRoute } from "@/app/api/cart/coupon/route";
import { POST as checkoutRoute } from "@/app/api/checkout/route";
import { POST as simulate } from "@/app/api/dev/payments/simulate/route";
import { POST as webhook } from "@/app/api/payments/webhook/[provider]/route";
import { GET as myDownloads } from "@/app/api/me/downloads/route";
import { POST as downloadLink } from "@/app/api/downloads/[entitlementId]/link/route";
import { signSimulatedEvent } from "@/server/modules/payments/provider";
import { createDownloadLink } from "@/server/modules/downloads/service";
import { expireReservations } from "@/server/modules/orders/lifecycle";
import { checkout } from "@/server/modules/orders/checkout";
import { addItem } from "@/server/modules/cart/service";
import { cancelOrder } from "@/server/modules/orders/service";

beforeAll(() => {
  process.env.PAYMENT_PROVIDER = "simulated";
  process.env.PAYMENT_SIMULATION_ENABLED = "true";
  __resetEnvForTests();
});

let n = 0;
async function signup(email = `u${++n}@example.com`) {
  await call(register, "POST", "/api/auth/register", { email, password: "correct-horse-battery" }, { ip: `198.51.100.${n + 10}` });
  return { email, session: new Map(jar) };
}
const as = (s: Map<string, string>) => {
  jar.clear();
  s.forEach((v, k) => jar.set(k, v));
};
const ADDR = { fullName: "Test Kişi", phone: "05550000000", line1: "Deneme Sk. 1", city: "İstanbul", district: "Kadıköy", country: "TR" };

async function seedWithFile() {
  const s = await seedCatalog();
  const fileKey = "private/test-rose.vp3";
  await db.digitalFile.create({
    data: { productId: s.rose.id, formatId: s.fmt.VP3, storageKey: fileKey, originalName: "gul.vp3", sizeBytes: 10, sha256: "0".repeat(64) },
  });
  await db.license.findFirstOrThrow({ where: { code: "PERSONAL" } });
  return s;
}

describe("cart", () => {
  it("adds, prices on the server, rejects client price and bad format", async () => {
    const { rose } = await seedWithFile();
    const ok = await call(addItemRoute, "POST", "/api/cart/items", { productId: rose.id, format: "VP3", license: "PERSONAL", quantity: 2 }); // digital items are always quantity 1
    expect(ok.status).toBe(201);
    const cart = (await ok.json()).cart;
    expect(cart.subtotalKurus).toBe(25000);
    expect(cart.shippingKurus).toBe(0);
    expect(cart.totalKurus).toBe(25000);
    expect((await call(addItemRoute, "POST", "/api/cart/items", { productId: rose.id, format: "VP3", unitPriceKurus: 1 })).status).toBe(400);
    expect((await call(addItemRoute, "POST", "/api/cart/items", { productId: rose.id, format: "DST" })).status).toBe(400);
  });

  it("applies a coupon with server math and shows an error for an unknown one", async () => {
    const { rose } = await seedWithFile();
    await db.coupon.create({ data: { code: "TEST10", type: "PERCENT", value: 10 } });
    await call(addItemRoute, "POST", "/api/cart/items", { productId: rose.id, format: "VP3", license: "PERSONAL" });
    const r = await call(couponRoute, "POST", "/api/cart/coupon", { code: "test10" });
    expect(r.status).toBe(200);
    const cart = (await r.json()).cart;
    expect(cart.discountKurus).toBe(2500);
    expect(cart.totalKurus).toBe(22500);
    expect((await call(couponRoute, "POST", "/api/cart/coupon", { code: "NOPE" })).status).toBeGreaterThanOrEqual(400);
  });

  it("discounts three and five distinct real embroidery designs, without counting duplicate formats or physical items", async () => {
    const { rose, cicek, mono, draft, archived, towel } = await seedWithFile();
    await db.product.updateMany({ where: { id: { in: [draft.id, archived.id] } }, data: { status: "ACTIVE" } });
    const { email } = await signup();
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const add = (productId: string, format?: string) => addItem({ userId: user.id }, { productId, format, quantity: 1 });

    await add(rose.id, "VP3");
    await add(rose.id, "PES");
    expect((await add(cicek.id, "VP3")).discountKurus).toBe(0);
    expect(await add(mono.id, "PES")).toMatchObject({ embroideryDiscountPercent: 10, discountKurus: 10000 });
    await add(draft.id, "VP3");
    await add(towel.id);
    expect(await add(archived.id, "VP3")).toMatchObject({ embroideryDiscountPercent: 20, discountKurus: 24000 });

    await db.coupon.create({ data: { code: "SMALL", type: "FIXED", value: 500 } });
    const response = await call(couponRoute, "POST", "/api/cart/coupon", { code: "SMALL" });
    expect((await response.json()).cart).toMatchObject({ embroideryDiscountPercent: 20, discountKurus: 24000 });
    const order = await checkout(user, { shippingAddress: ADDR });
    expect(order.order.discountKurus).toBe(24000);
    expect(await db.couponRedemption.count()).toBe(0);
  });

  it("merges the guest cart into the account on login", async () => {
    const { rose } = await seedWithFile();
    await call(register, "POST", "/api/auth/register", { email: "m@example.com", password: "correct-horse-battery" }, { ip: "198.51.100.90" });
    jar.clear();
    await call(addItemRoute, "POST", "/api/cart/items", { productId: rose.id, format: "VP3", license: "PERSONAL" });
    const guestCookie = jar.get("tb_cart");
    expect(guestCookie).toBeTruthy();
    await call(login, "POST", "/api/auth/login", { email: "m@example.com", password: "correct-horse-battery" }, { ip: "198.51.100.91" });
    jar.set("tb_cart", guestCookie!);
    const c = (await (await call(getCart, "GET", "/api/cart")).json()).cart;
    expect(c.items.length).toBe(1);
  });
});

async function placeDigitalOrder() {
  const { rose } = await seedWithFile();
  const u = await signup();
  await call(addItemRoute, "POST", "/api/cart/items", { productId: rose.id, format: "VP3", license: "PERSONAL" });
  const res = await call(checkoutRoute, "POST", "/api/checkout", {});
  expect(res.status).toBe(201);
  const body = await res.json();
  return { rose, u, body, number: body.order.number as string };
}

describe("checkout + payments", () => {
  it("keeps demo products in the cart but never creates an order for them in production", async () => {
    const { rose } = await seedWithFile();
    await db.product.update({ where: { id: rose.id }, data: { isDemo: true } });
    const { email } = await signup();
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    await addItem({ userId: user.id }, { productId: rose.id, format: "VP3", license: "PERSONAL", quantity: 1 });

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://nakis.example.com");
    vi.stubEnv("PAYMENT_PROVIDER", "none");
    vi.stubEnv("PAYMENT_SIMULATION_ENABLED", "false");
    __resetEnvForTests();
    try {
      await expect(checkout(user, {})).rejects.toThrow("Demo ürünler siparişe açık değil.");
      expect(await db.order.count()).toBe(0);
      expect(await db.payment.count()).toBe(0);
      expect(await db.cartItem.count()).toBe(1);

      await db.product.update({ where: { id: rose.id }, data: { isDemo: false } });
      await expect(checkout(user, {})).rejects.toThrow("Online ödeme şu anda kapalı.");
      expect(await db.order.count()).toBe(0);
      expect(await db.payment.count()).toBe(0);
      expect(await db.cartItem.count()).toBe(1);
    } finally {
      vi.unstubAllEnvs();
      __resetEnvForTests();
    }
  });

  it("creates a PENDING_PAYMENT order with snapshots; later price change does not alter it", async () => {
    const { rose, body } = await placeDigitalOrder();
    expect(body.order.status).toBe("PENDING_PAYMENT");
    expect(body.order.items[0].unitPriceKurus).toBe(25000);
    expect(body.order.items[0].productName).toBe("Gül Motifi");
    await db.product.update({ where: { id: rose.id }, data: { priceKurus: 99900, name: "Başka" } });
    const o = await db.order.findUniqueOrThrow({ where: { number: body.order.number }, include: { items: true } });
    expect(o.totalKurus).toBe(25000);
    expect(o.items[0].productName).toBe("Gül Motifi");
  });

  it("unpaid order cannot get a download link", async () => {
    const { u } = await placeDigitalOrder();
    expect(await db.downloadEntitlement.count()).toBe(0);
    const files = await (await call(myDownloads, "GET", "/api/me/downloads")).json();
    expect(files.downloads).toEqual([]);
    expect(u.email).toBeTruthy();
  });

  it("simulated paid event creates entitlements; the same event twice has a single effect; link works and IDOR is blocked", async () => {
    const { number, u } = await placeDigitalOrder();
    const sim = await call(simulate, "POST", "/api/dev/payments/simulate", { orderNumber: number, outcome: "success" });
    expect(sim.status).toBe(200);
    const order = await db.order.findUniqueOrThrow({ where: { number }, include: { payments: true } });
    expect(order.status).toBe("PAID");
    expect(await db.downloadEntitlement.count()).toBe(1);

    // replay the exact same signed event
    const raw = JSON.stringify({ eventId: "evt_dup", type: "payment.succeeded", paymentId: order.payments[0].id, amountKurus: order.totalKurus });
    const sig = signSimulatedEvent(raw);
    const req = (sigv: string) =>
      webhook(new Request("http://localhost:3000/api/payments/webhook/simulated", { method: "POST", headers: { "x-signature": sigv, "x-forwarded-for": "203.0.113.5" }, body: raw }), {
        params: Promise.resolve({ provider: "simulated" }),
      });
    const a = await (await req(sig)).json();
    const b = await (await req(sig)).json();
    expect(a.outcome).toBe("processed"); // already PAID by the simulate call: recorded, no second effect
    expect(b.outcome).toBe("duplicate");
    expect(await db.downloadEntitlement.count()).toBe(1);
    expect(await db.webhookEvent.count({ where: { eventId: "evt_dup" } })).toBe(1);

    const list = (await (await call(myDownloads, "GET", "/api/me/downloads")).json()).downloads;
    expect(list[0].available).toBe(true);
    const link = await call(downloadLink, "POST", `/api/downloads/${list[0].id}/link`, undefined, { params: { entitlementId: list[0].id } });
    expect(link.status).toBe(200);
    expect((await link.json()).url).toMatch(/^https?:\/\//);
    expect((await db.downloadEntitlement.findFirstOrThrow()).remaining).toBe(4);

    // IDOR: a different user gets 404 for this entitlement
    const other = await signup();
    as(other.session);
    const stolen = await call(downloadLink, "POST", `/api/downloads/${list[0].id}/link`, undefined, { params: { entitlementId: list[0].id } });
    expect(stolen.status).toBe(404);
    void u;
  });

  it("download link: signed URL, atomic decrement and per-user check with an injected signer", async () => {
    const { number, u } = await placeDigitalOrder();
    await call(simulate, "POST", "/api/dev/payments/simulate", { orderNumber: number, outcome: "success" });
    const ent = await db.downloadEntitlement.findFirstOrThrow();
    const user = await db.user.findFirstOrThrow({ where: { email: u.email } });
    const signer = async (i: { key: string }) => `https://signed.example/${i.key}?sig=1`;
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => createDownloadLink({ id: user.id }, ent.id, "203.0.113.9", "ua", signer)));
    const okCount = results.filter((r) => r.status === "fulfilled").length;
    expect(okCount).toBe(5); // DOWNLOAD_LIMIT_DEFAULT, never overspent
    expect((await db.downloadEntitlement.findUniqueOrThrow({ where: { id: ent.id } })).remaining).toBe(0);
    const log = await db.downloadLog.findFirstOrThrow();
    expect(log.ipHash).not.toContain("203.0.113.9");
  });

  it("failure event leaves order unpaid; unknown/forged signature rejected", async () => {
    const { number } = await placeDigitalOrder();
    await call(simulate, "POST", "/api/dev/payments/simulate", { orderNumber: number, outcome: "failure" });
    const o = await db.order.findUniqueOrThrow({ where: { number } });
    expect(o.status).toBe("PENDING_PAYMENT");
    expect(o.paymentStatus).toBe("FAILED");
    const forged = await webhook(new Request("http://localhost:3000/x", { method: "POST", headers: { "x-signature": "deadbeef" }, body: "{}" }), { params: Promise.resolve({ provider: "simulated" }) });
    expect(forged.status).toBe(403);
  });

  it("webhook and simulate are rejected when simulation is disabled", async () => {
    const { number } = await placeDigitalOrder();
    process.env.PAYMENT_PROVIDER = "none";
    __resetEnvForTests();
    try {
      expect((await call(simulate, "POST", "/api/dev/payments/simulate", { orderNumber: number, outcome: "success" })).status).toBe(404);
      const raw = "{}";
      const res = await webhook(new Request("http://localhost:3000/x", { method: "POST", headers: { "x-signature": signSimulatedEvent(raw) }, body: raw }), { params: Promise.resolve({ provider: "simulated" }) });
      expect(res.status).toBe(404);
    } finally {
      process.env.PAYMENT_PROVIDER = "simulated";
      __resetEnvForTests();
    }
    expect((await db.order.findUniqueOrThrow({ where: { number } })).status).toBe("PENDING_PAYMENT");
  });
});

describe("stock, coupons and reservations", () => {
  it("only one of two concurrent checkouts wins the last unit", async () => {
    const { towel } = await seedCatalog();
    await db.inventory.update({ where: { productId: towel.id }, data: { onHand: 1 } });
    const users = [await signup(), await signup()];
    const ids = await Promise.all(users.map((u) => db.user.findFirstOrThrow({ where: { email: u.email } })));
    // Prepare both carts through the service (cookie jar is shared, so address owners directly).
    for (const u of ids) await addItem({ userId: u.id }, { productId: towel.id, quantity: 1 } as never);
    const results = await Promise.allSettled(ids.map((u) => checkout({ id: u.id, email: u.email, phone: null }, { shippingAddress: ADDR })));
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    const inv = await db.inventory.findUniqueOrThrow({ where: { productId: towel.id } });
    expect(inv.reserved).toBe(1);
  });

  it("coupon usage limit holds under concurrency", async () => {
    const { rose } = await seedWithFile();
    await db.coupon.create({ data: { code: "ONCE", type: "FIXED", value: 1000, usageLimit: 1 } });
    const us = [await signup(), await signup(), await signup()];
    const users = await Promise.all(us.map((u) => db.user.findFirstOrThrow({ where: { email: u.email } })));
    const { applyCartCoupon } = await import("@/server/modules/cart/service");
    for (const u of users) {
      await addItem({ userId: u.id }, { productId: rose.id, format: "VP3", license: "PERSONAL", quantity: 1 } as never);
      await applyCartCoupon({ userId: u.id }, "ONCE").catch(() => undefined);
    }
    const results = await Promise.allSettled(users.map((u) => checkout({ id: u.id, email: u.email, phone: null }, {})));
    const wins = await Promise.all(
      results.map(async (r) => (r.status === "fulfilled" ? (await db.order.findUniqueOrThrow({ where: { number: r.value.order.number } })).discountKurus : -1))
    );
    expect(wins.filter((d) => d === 1000).length).toBeLessThanOrEqual(1);
    expect((await db.coupon.findUniqueOrThrow({ where: { code: "ONCE" } })).usedCount).toBeLessThanOrEqual(1);
  });

  it("expired reservations are released and the order cancelled", async () => {
    const { towel } = await seedCatalog();
    const u = await signup();
    const user = await db.user.findFirstOrThrow({ where: { email: u.email } });
    await addItem({ userId: user.id }, { productId: towel.id, quantity: 2 } as never);
    const r = await checkout({ id: user.id, email: user.email, phone: null }, { shippingAddress: ADDR });
    expect((await db.inventory.findUniqueOrThrow({ where: { productId: towel.id } })).reserved).toBe(2);
    await db.inventoryReservation.updateMany({ data: { expiresAt: new Date(Date.now() - 60_000) } });
    const res = await expireReservations(db);
    expect(res.expiredOrders).toBeGreaterThanOrEqual(1);
    expect((await db.inventory.findUniqueOrThrow({ where: { productId: towel.id } })).reserved).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { number: r.order.number } })).status).toBe("CANCELLED");
  });

  it("cancelling an unpaid order frees stock", async () => {
    const { towel } = await seedCatalog();
    const u = await signup();
    const user = await db.user.findFirstOrThrow({ where: { email: u.email } });
    await addItem({ userId: user.id }, { productId: towel.id, quantity: 1 } as never);
    const r = await checkout({ id: user.id, email: user.email, phone: null }, { shippingAddress: ADDR });
    await cancelOrder(r.order.id, { userId: user.id, ownerOnly: true });
    expect((await db.inventory.findUniqueOrThrow({ where: { productId: towel.id } })).reserved).toBe(0);
    expect(sent.length).toBeGreaterThan(0);
  });
});
