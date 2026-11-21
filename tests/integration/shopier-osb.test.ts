import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as osb } from "@/app/api/shopier/osb/route";
import { db } from "@/server/db";
import { __resetEnvForTests } from "@/server/env";
import { seedCatalog } from "./catalog-fixtures";
import { sent } from "./helpers";

const USER = "osb-user";
const KEY = "osb-secret-key";
const saved = {
  provider: process.env.PAYMENT_PROVIDER,
  user: process.env.SHOPIER_OSB_USERNAME,
  key: process.env.SHOPIER_OSB_KEY,
};

beforeAll(() => {
  process.env.PAYMENT_PROVIDER = "shopier";
  process.env.SHOPIER_OSB_USERNAME = USER;
  process.env.SHOPIER_OSB_KEY = KEY;
  __resetEnvForTests();
});
afterAll(() => {
  if (saved.provider === undefined) delete process.env.PAYMENT_PROVIDER;
  else process.env.PAYMENT_PROVIDER = saved.provider;
  if (saved.user === undefined) delete process.env.SHOPIER_OSB_USERNAME;
  else process.env.SHOPIER_OSB_USERNAME = saved.user;
  if (saved.key === undefined) delete process.env.SHOPIER_OSB_KEY;
  else process.env.SHOPIER_OSB_KEY = saved.key;
  __resetEnvForTests();
});

function body(payload: Record<string, unknown>) {
  const res = Buffer.from(JSON.stringify(payload)).toString("base64");
  const hash = createHmac("sha256", KEY).update(res + USER).digest("hex");
  return new URLSearchParams({ res, hash }).toString();
}

function post(payload: Record<string, unknown>, hashOverride?: string) {
  const raw = body(payload);
  const params = new URLSearchParams(raw);
  if (hashOverride) params.set("hash", hashOverride);
  return osb(new Request("http://localhost:3000/api/shopier/osb", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": "203.0.113.44" },
    body: hashOverride ? params.toString() : raw,
  }));
}

describe("Shopier OSB callback", () => {
  it("records a paid order, grants the file and ignores the replay", async () => {
    const { rose, fmt } = await seedCatalog();
    await db.product.update({ where: { id: rose.id }, data: { shopierProductId: "555" } });
    await db.digitalFile.create({
      data: { productId: rose.id, formatId: fmt.VP3, storageKey: "private/osb-rose.vp3", originalName: "gul.vp3", sizeBytes: 12, sha256: "ab".repeat(32) },
    });
    await db.user.create({ data: { email: "ali@example.com", passwordHash: "not-used" } });
    const before = sent.length;
    const payload = {
      email: "ali@example.com", orderid: "9001", currency: 0, price: "250.00",
      buyername: "Ali", buyersurname: "Yılmaz", productcount: 1, productid: "555",
      productlist: "", chartdetails: "", customernote: "", istest: 0,
    };
    const first = await post(payload);
    expect(first.status).toBe(200);
    expect(await first.text()).toBe("success");
    const order = await db.order.findFirstOrThrow({ where: { email: "ali@example.com" }, include: { payments: true, items: true } });
    expect(order.status).toBe("PAID");
    expect(order.totalKurus).toBe(25000);
    expect(order.payments[0]).toMatchObject({ provider: "shopier", status: "PAID", amountKurus: 25000 });
    expect(await db.downloadEntitlement.count({ where: { productId: rose.id, userId: order.userId } })).toBe(1);
    expect(sent.slice(before).map((mail) => mail.subject)).toEqual([
      expect.stringContaining("Ödemeniz alındı"),
      expect.stringContaining("indirmeye hazır"),
    ]);

    const again = await post(payload);
    expect(await again.text()).toBe("success");
    expect(await db.order.count()).toBe(1);
    expect(sent.length).toBe(before + 2);
  });

  it("rejects a bad signature and asks Shopier to retry an unknown product", async () => {
    await seedCatalog();
    const bad = await post({
      email: "ali@example.com", orderid: "9002", currency: 0, price: "10.00",
      buyername: "Ali", buyersurname: "Yılmaz", productcount: 1, productid: "555",
      productlist: "", chartdetails: "", customernote: "", istest: 0,
    }, "0".repeat(64));
    expect(bad.status).toBe(403);
    expect(await bad.text()).not.toContain("success");
    expect(await db.order.count()).toBe(0);

    const missing = await post({
      email: "ali@example.com", orderid: "9003", currency: 0, price: "10.00",
      buyername: "Ali", buyersurname: "Yılmaz", productcount: 1, productid: "999",
      productlist: "", chartdetails: "", customernote: "", istest: 0,
    });
    expect(missing.status).toBe(409);
    expect(await missing.text()).toBe("retry");
    expect(await db.webhookEvent.count()).toBe(0);
  });
});
