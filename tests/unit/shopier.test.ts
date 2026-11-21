import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { __resetEnvForTests, isStoreCheckoutOpen } from "@/server/env";
import { publicShopierUrl } from "@/server/modules/catalog/dto";
import { buildShopierProduct, createPayload, kurusToShopierPrice, planShopierSync, shopierUrlOf, type SyncProduct } from "@/server/shopier/catalog";
import { parseShopierOsb, shopierOsbHash, verifyShopierOsb } from "@/server/shopier/osb";

const USER = "jagnakis";
const KEY = "osb-secret";

function notice(overrides: Record<string, unknown> = {}) {
  const payload = {
    email: "Ali@Example.com",
    orderid: "1001",
    currency: 0,
    price: "250,00",
    buyername: "Ali",
    buyersurname: "Yılmaz",
    productcount: 1,
    productid: "555",
    productlist: "555",
    chartdetails: "",
    customernote: "",
    istest: 0,
    ...overrides,
  };
  const res = Buffer.from(JSON.stringify(payload)).toString("base64");
  return { res, hash: shopierOsbHash(res, USER, KEY), payload };
}

describe("Shopier OSB", () => {
  it("accepts HMAC-SHA256(res + username) and reads the official fields", () => {
    const { res, hash } = notice();
    expect(verifyShopierOsb(res, hash, USER, KEY)).toBe(true);
    expect(verifyShopierOsb(res, hash, USER, "wrong")).toBe(false);
    expect(verifyShopierOsb(res + "x", hash, USER, KEY)).toBe(false);
    const parsed = parseShopierOsb(res);
    expect(parsed).toMatchObject({
      orderId: "1001",
      email: "ali@example.com",
      currency: "TRY",
      priceKurus: 25000,
      productIds: ["555"],
      isTest: false,
    });
  });

  it("reads several product ids and a TRY decimal price", () => {
    const { res } = notice({ productid: "555,556", price: "10.50", currency: "TL" });
    expect(parseShopierOsb(res).productIds).toEqual(["555", "556"]);
    expect(parseShopierOsb(res).priceKurus).toBe(1050);
  });

  it("rejects a tampered hash with a different length", () => {
    const { res } = notice();
    expect(verifyShopierOsb(res, "abcd", USER, KEY)).toBe(false);
    expect(createHmac("sha256", KEY).update(`${notice().res}${USER}`).digest("hex")).toHaveLength(64);
  });
});

describe("Shopier catalog mapping", () => {
  const product: SyncProduct = {
    id: "p1", sku: "D1", name: "Gül & Motif", description: "Açıklama", shortDescription: "Kısa",
    priceKurus: 25000, type: "DIGITAL_EMBROIDERY", status: "ACTIVE", isDemo: false,
    shopierProductId: null, imageUrl: "/images/gul.webp", stock: null,
  };

  it("formats kuruş as a Shopier TRY string and marks embroidery digital", () => {
    expect(kurusToShopierPrice(25000)).toBe("250.00");
    const body = buildShopierProduct(product, "https://cdn.example/gul.webp");
    expect(body?.title).toBe("Gül ve Motif");
    expect(body?.type).toBe("digital");
    expect(body?.stockQuantity).toBe(999);
    expect(createPayload(body!).priceData).toEqual({ currency: "TRY", price: "250.00" });
  });

  it("plans a create when there is no remote id and an update when the note matches", () => {
    const plans = planShopierSync([product], new Map([["nakis:D1", "555"]]), "https://nakis.example");
    expect(plans[0]).toMatchObject({ action: "update", shopierProductId: "555" });
    expect(shopierUrlOf({ url: "https://www.shopier.com/ShowProductNew/products.php?id=555" }, "555")).toBe("https://www.shopier.com/555");
  });
});

describe("storefront Shopier link", () => {
  it("uses the product url, then the Shopier id, then the store only as fallback", () => {
    expect(publicShopierUrl({ isDemo: false, shopierUrl: "https://www.shopier.com/9", shopierProductId: "8" })).toBe("https://www.shopier.com/9");
    expect(publicShopierUrl({ isDemo: false, shopierUrl: null, shopierProductId: "8" })).toBe("https://www.shopier.com/8");
    expect(publicShopierUrl({ isDemo: true, shopierUrl: "https://www.shopier.com/9", shopierProductId: "8" }, "https://www.shopier.com/Jagnakis")).toBeUndefined();
    expect(publicShopierUrl({ isDemo: false, shopierUrl: null, shopierProductId: null }, "https://www.shopier.com/Jagnakis")).toBe("https://www.shopier.com/Jagnakis");
  });

  it("keeps local checkout closed while Shopier is the provider", () => {
    const prev = {
      provider: process.env.PAYMENT_PROVIDER,
      user: process.env.SHOPIER_OSB_USERNAME,
      key: process.env.SHOPIER_OSB_KEY,
    };
    process.env.PAYMENT_PROVIDER = "shopier";
    process.env.SHOPIER_OSB_USERNAME = "jagnakis";
    process.env.SHOPIER_OSB_KEY = "osb-secret";
    __resetEnvForTests();
    try {
      expect(isStoreCheckoutOpen()).toBe(false);
    } finally {
      if (prev.provider === undefined) delete process.env.PAYMENT_PROVIDER;
      else process.env.PAYMENT_PROVIDER = prev.provider;
      if (prev.user === undefined) delete process.env.SHOPIER_OSB_USERNAME;
      else process.env.SHOPIER_OSB_USERNAME = prev.user;
      if (prev.key === undefined) delete process.env.SHOPIER_OSB_KEY;
      else process.env.SHOPIER_OSB_KEY = prev.key;
      __resetEnvForTests();
    }
  });
});
