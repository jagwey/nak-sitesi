import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decideShopierWebhook, verifyShopierWebhook } from "@/server/shopier/webhook";

const TOKEN = "webhook-token";

function sign(body: string) {
  return createHmac("sha256", TOKEN).update(body).digest("base64");
}

describe("Shopier webhook signature", () => {
  it("accepts the base64 HMAC of the raw body and rejects a different body", () => {
    const body = JSON.stringify({ id: "1" });
    expect(verifyShopierWebhook(body, sign(body), TOKEN)).toBe(true);
    expect(verifyShopierWebhook(body, createHmac("sha256", TOKEN).update(body).digest("hex"), TOKEN)).toBe(true);
    expect(verifyShopierWebhook(body + " ", sign(body), TOKEN)).toBe(false);
  });
});

describe("Shopier webhook order mapping", () => {
  it("turns order.created into the shared paid notice", () => {
    const decision = decideShopierWebhook({
      id: "9001",
      paymentStatus: "paid",
      currency: "TRY",
      totals: { total: "250.00" },
      shippingInfo: { firstName: "Ali", lastName: "Yılmaz", email: "Ali@Example.com" },
      lineItems: [{ productId: "555", quantity: 1 }],
    }, "order.created");
    expect(decision).toMatchObject({
      action: "fulfill",
      notice: { orderId: "9001", email: "ali@example.com", priceKurus: 25000, productIds: ["555"], currency: "TRY" },
    });
  });

  it("ignores unpaid and non-order events", () => {
    expect(decideShopierWebhook({ id: "1", paymentStatus: "unpaid", totals: { total: "10.00" }, shippingInfo: { email: "a@b.co" }, lineItems: [{ productId: "5" }] }, "order.created").action).toBe("ignore");
    expect(decideShopierWebhook({ id: "1" }, "product.updated").action).toBe("ignore");
  });
});

describe("tools image and health wait", () => {
  it("ships the Shopier scripts and waits 90s before failing the web healthcheck", () => {
    const ignore = readFileSync(".dockerignore", "utf8");
    expect(ignore).toContain("!scripts/shopier-sync.ts");
    expect(ignore).toContain("!scripts/shopier-webhook.ts");
    expect(readFileSync("Dockerfile", "utf8")).toContain("--start-period=90s");
    expect(readFileSync("scripts/deploy-oracle.ps1", "utf8")).toContain("90 saniye");
  });
});
