import { describe, expect, it } from "vitest";
import { buildStorefrontProducts, storefrontCatalogSchema } from "../../storefront/catalog";

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

  it("renders existing samples as demos without a purchase link", () => {
    const samples = buildStorefrontProducts({ storeName: "Nakış Sitesi", products: [] });
    expect(samples).toHaveLength(11);
    expect(samples.every((sample) => sample.isDemo && !sample.shopierUrl)).toBe(true);
  });

  it("replaces demo products when the first purchasable product is configured", () => {
    const products = buildStorefrontProducts({ storeName: "Test", products: [product] });
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      slug: "test-deseni",
      priceKurus: product.priceKurus,
      shopierUrl: product.shopierUrl,
    });
    expect(products[0].isDemo).toBeUndefined();
  });

  it("rejects a product URL shared by two catalog entries", () => {
    expect(() => buildStorefrontProducts({
      storeName: "Test",
      products: [product, { ...product, slug: "test-deseni" }],
    })).toThrow(/test-deseni/);
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
