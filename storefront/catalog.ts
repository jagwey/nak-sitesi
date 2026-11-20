import { z } from "zod";
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
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    image: z.string().regex(/^\/products\/[a-z0-9]+(?:[-_][a-z0-9]+)*\.(?:webp|avif|png|jpe?g)$/),
    priceKurus: z.number().int().positive(),
    shopierUrl,
  })),
});

export const storefrontCatalog = storefrontCatalogSchema.parse(rawCatalog);
