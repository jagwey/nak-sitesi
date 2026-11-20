import { z } from "zod";
import { PRODUCTS, type Product } from "../src/data/products";
import { CATEGORIES } from "../src/data/categories";
import { normalizeTurkish } from "../src/lib/search";
import rawCatalog from "./catalog.json";

const shopierUrl = z.url().refine((value) => {
  // Limit redirects to the HTTPS storefront, without user-info or a custom port.
  const url = URL.parse(value);
  return url?.protocol === "https:"
    && ["shopier.com", "www.shopier.com"].includes(url.host)
    && !url.username && !url.password && url.pathname !== "/";
}, "Shopier ürün bağlantısı https://www.shopier.com adresinde olmalıdır.");

export const storefrontCatalogSchema = z.strictObject({
  storeName: z.string().trim().min(1),
  products: z.array(z.strictObject({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    type: z.enum(["digital", "physical"]).optional(),
    categorySlug: z.enum(CATEGORIES.map((category) => category.slug)).optional(),
    personalizable: z.boolean().optional(),
    image: z.string().regex(/^\/products\/[a-z0-9]+(?:[-_][a-z0-9]+)*\.(?:webp|avif|png|jpe?g)$/),
    priceKurus: z.number().int().positive(),
    shopierUrl,
  })),
});

export const storefrontCatalog = storefrontCatalogSchema.parse(rawCatalog);

export type StorefrontProduct = Omit<Product, "type"> & {
  type?: Product["type"];
  shopierUrl?: string;
};

export function buildStorefrontProducts(catalog: z.infer<typeof storefrontCatalogSchema>): StorefrontProduct[] {
  if (catalog.products.length === 0) {
    return PRODUCTS.map((product) => ({ ...product, isDemo: true }));
  }

  const slugs = new Set<string>();
  return catalog.products.map((entry, index) => {
    const slug = entry.slug ?? (normalizeTurkish(entry.name).replaceAll(" ", "-") || `urun-${index + 1}`);
    if (slugs.has(slug)) throw new Error(`Vitrinde yinelenen ürün adresi: ${slug}`);
    slugs.add(slug);

    return {
      ...entry,
      id: slug,
      slug,
      subtitle: "",
      categorySlug: entry.categorySlug ?? "",
      categoryName: CATEGORIES.find((category) => category.slug === entry.categorySlug)?.name ?? "",
      personalizable: entry.personalizable ?? false,
      images: [{ url: entry.image, alt: entry.name, caption: "" }],
      usageAreas: [],
      tags: [],
      highlights: [],
    };
  });
}

export const storefrontProducts = buildStorefrontProducts(storefrontCatalog);
