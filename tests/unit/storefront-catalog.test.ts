import { describe, expect, it } from "vitest";
import { storefrontCatalogSchema } from "../../storefront/catalog";

const product = {
  name: "Test deseni",
  description: "Test açıklaması",
  image: "/products/test.webp",
  priceKurus: 25900,
  shopierUrl: "https://www.shopier.com/fixture/123",
};

describe("storefront catalog", () => {
  it("supports opening with an empty catalog", () => {
    expect(storefrontCatalogSchema.parse({ storeName: "Nakış Sitesi", products: [] }).products).toEqual([]);
  });

  it("accepts a local product image, a kuruş price and a Shopier link", () => {
    expect(storefrontCatalogSchema.parse({ storeName: "Test", products: [product] }).products).toEqual([product]);
  });

  it.each([
    "https://shopier.com.example.org/fixture/123",
    "http://www.shopier.com/fixture/123",
    "https://example.org@www.shopier.com/fixture/123",
    "https://www.shopier.com/",
  ])("rejects an invalid purchase link %s", (shopierUrl) => {
    expect(storefrontCatalogSchema.safeParse({
      storeName: "Test",
      products: [{ ...product, shopierUrl }],
    }).success).toBe(false);
  });

  it("rejects private file paths and fractional kuruş", () => {
    for (const invalidProduct of [
      { ...product, image: "/products/../private.zip" },
      { ...product, priceKurus: 259.9 },
    ]) {
      expect(storefrontCatalogSchema.safeParse({
        storeName: "Test",
        products: [invalidProduct],
      }).success).toBe(false);
    }
  });
});
