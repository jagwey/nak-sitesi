import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as webhook } from "@/app/api/shopier/webhook/route";
import { db } from "@/server/db";
import { __resetEnvForTests } from "@/server/env";
import { seedCatalog } from "./catalog-fixtures";
import { sent } from "./helpers";

const TOKEN = "webhook-secret";
const saved = process.env.SHOPIER_WEBHOOK_SECRET;

beforeAll(() => {
  process.env.SHOPIER_WEBHOOK_SECRET = TOKEN;
  __resetEnvForTests();
});
afterAll(() => {
  if (saved === undefined) delete process.env.SHOPIER_WEBHOOK_SECRET;
  else process.env.SHOPIER_WEBHOOK_SECRET = saved;
  __resetEnvForTests();
});

function post(payload: unknown, signature?: string, event = "order.created") {
  const raw = JSON.stringify(payload);
  const sig = signature ?? createHmac("sha256", TOKEN).update(raw).digest("base64");
  return webhook(new Request("http://localhost:3000/api/shopier/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "shopier-signature": sig,
      "shopier-event": event,
      "x-forwarded-for": "203.0.113.45",
    },
    body: raw,
  }));
}

const order = {
  id: "9101",
  paymentStatus: "paid",
  currency: "TRY",
  totals: { total: "250.00" },
  shippingInfo: { firstName: "Ali", lastName: "Yılmaz", email: "ali@example.com" },
  lineItems: [{ productId: "555", quantity: 1 }],
};

describe("Shopier REST webhook", () => {
  it("records the paid order once and rejects a bad signature", async () => {
    const { rose, fmt } = await seedCatalog();
    await db.product.update({ where: { id: rose.id }, data: { shopierProductId: "555" } });
    await db.digitalFile.create({
      data: { productId: rose.id, formatId: fmt.VP3, storageKey: "private/wh-rose.vp3", originalName: "gul.vp3", sizeBytes: 12, sha256: "cd".repeat(32) },
    });
    await db.user.create({ data: { email: "ali@example.com", passwordHash: "not-used" } });
    const before = sent.length;
    const first = await post(order);
    expect(first.status).toBe(200);
    expect(await first.text()).toBe("success");
    expect(await db.order.count({ where: { email: "ali@example.com", status: "PAID" } })).toBe(1);
    expect(await db.downloadEntitlement.count({ where: { productId: rose.id } })).toBe(1);
    expect(sent.slice(before).some((mail) => mail.subject.includes("indirmeye hazır"))).toBe(true);

    const again = await post(order);
    expect(again.status).toBe(200);
    expect(await db.order.count()).toBe(1);
    expect(sent.length).toBe(before + 2);

    const bad = await post(order, "not-the-signature");
    expect(bad.status).toBe(403);
  });
});
