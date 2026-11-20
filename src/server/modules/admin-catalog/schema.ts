import { z } from "zod";

export const PRODUCT_TYPES = ["DIGITAL_EMBROIDERY", "PHYSICAL", "PERSONALIZED", "TEXTILE_PRINT", "DIGITAL_PRINT", "BUNDLE"] as const;
export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

const kurus = z.number().int().min(0).max(2_000_000_000);
const str = (max: number) => z.string().trim().max(max);
const shopierProductUrl = z.string().trim().max(500).transform((value, ctx) => {
  const url = URL.parse(value);
  if (url?.protocol === "https:" && ["shopier.com", "www.shopier.com"].includes(url.host) && !url.username && !url.password) {
    const id = url.pathname.match(/^\/(?:s\/product\/)?([1-9]\d{0,19})\/?$/)?.[1]
      ?? (url.pathname === "/ShowProductNew/products.php" ? url.searchParams.get("id") : null);
    if (id && /^[1-9]\d{0,19}$/.test(id)) return `https://www.shopier.com/${id}`;
  }
  ctx.addIssue({ code: "custom", message: "Geçerli bir HTTPS Shopier ürün bağlantısı girin." });
  return z.NEVER;
});
const strList = (max = 200, n = 30) => z.array(z.string().trim().min(1).max(max)).max(n);

export const optionSchema = z.strictObject({
  key: z.string().trim().regex(/^[a-zA-Z][a-zA-Z0-9]{0,39}$/, "Anahtar harfle başlamalı, yalnızca harf/rakam içermeli."),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["TEXT", "SELECT", "COLOR"]),
  required: z.boolean(),
  minLength: z.number().int().min(0).max(500).nullable(),
  maxLength: z.number().int().min(1).max(500).nullable(),
  choices: strList(80, 50).nullable(),
  priceDeltaKurus: z.number().int().min(-1_000_000).max(1_000_000),
});

export const variantSchema = z.strictObject({
  id: z.string().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(60),
  size: str(80).optional(),
  color: str(80).optional(),
  priceKurus: kurus.nullable(),
  active: z.boolean(),
});

export const embroiderySchema = z.strictObject({
  designWidthMm: z.number().int().min(1).max(5000).nullable(),
  designHeightMm: z.number().int().min(1).max(5000).nullable(),
  stitchCount: z.number().int().min(1).max(5_000_000).nullable(),
  colorCount: z.number().int().min(1).max(200).nullable(),
  colorChanges: z.number().int().min(0).max(5000).nullable(),
  hoopSizeId: z.string().min(1).max(40).nullable(),
  technique: str(120).nullable(),
  fabricRecommendations: str(500).nullable(),
  downloadTerms: str(1000).nullable(),
  usageInstructions: strList(300, 20),
});

export const physicalInfoSchema = z.strictObject({
  colors: strList(60, 30),
  sizes: strList(60, 30),
  material: str(200),
  productionTime: str(120),
  shippingEstimate: str(120),
  stockNote: str(200),
  careInstructions: strList(200, 20),
});

export const productCreateSchema = z.strictObject({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Bağlantı yalnızca küçük harf, rakam ve tire içerebilir.").optional(),
  sku: z.string().trim().min(1).max(60),
  type: z.enum(PRODUCT_TYPES),
  shortDescription: str(300),
  description: str(8000),
  highlights: strList(200, 20),
  usageAreas: strList(80, 20),
  priceKurus: kurus,
  compareAtPriceKurus: kurus.nullable(),
  shopierUrl: shopierProductUrl.nullish(),
  seoTitle: str(120).nullable(),
  seoDescription: str(300).nullable(),
  personalizable: z.boolean(),
  isNew: z.boolean(),
  isFeatured: z.boolean(),
  categoryId: z.string().min(1).max(40).nullable(),
  collectionIds: z.array(z.string().min(1).max(40)).max(50),
  tagIds: z.array(z.string().min(1).max(40)).max(50),
  licenseIds: z.array(z.string().min(1).max(40)).max(10),
  formatCodes: z.array(z.string().regex(/^[A-Z0-9]{2,6}$/)).max(12),
  variants: z.array(variantSchema).max(60),
  options: z.array(optionSchema).max(10),
  embroidery: embroiderySchema.nullable(),
  physicalInfo: physicalInfoSchema.nullable(),
});

export const productUpdateSchema = productCreateSchema.partial().extend({
  status: z.enum(PRODUCT_STATUSES).optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const idParams = z.strictObject({ id: z.string().min(1).max(40) });

export const productListQuery = z.strictObject({
  q: z.string().trim().max(100).optional(),
  type: z.enum(PRODUCT_TYPES).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  categoryId: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export const taxonomyBase = {
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Bağlantı yalnızca küçük harf, rakam ve tire içerebilir.").optional(),
};
export const categorySchema = z.strictObject({
  ...taxonomyBase,
  name: z.string().trim().min(2).max(100),
  description: str(1000).nullable(),
  image: str(500).nullable(),
  imageAlt: str(200).nullable(),
  seoTitle: str(120).nullable().optional(),
  seoDescription: str(300).nullable().optional(),
  featuredType: z.enum(["digital", "physical", "all"]).nullable(),
  parentId: z.string().min(1).max(40).nullable(),
  sort: z.number().int().min(0).max(100000),
  active: z.boolean(),
});
export const collectionSchema = z.strictObject({
  ...taxonomyBase,
  title: z.string().trim().min(2).max(120),
  subtitle: str(300).nullable(),
  image: str(500).nullable(),
  imageAlt: str(200).nullable(),
  sort: z.number().int().min(0).max(100000),
  active: z.boolean(),
});
export const collectionProductsSchema = z.strictObject({ productIds: z.array(z.string().min(1).max(40)).max(500) });
export const tagSchema = z.strictObject({ ...taxonomyBase, name: z.string().trim().min(1).max(60) });

export const inventoryListQuery = z.strictObject({
  q: z.string().trim().max(100).optional(),
  low: z.enum(["1"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(30),
});
export const inventoryUpdateSchema = z.strictObject({
  productId: z.string().min(1).max(40).optional(),
  variantId: z.string().min(1).max(40).optional(),
  onHand: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(100000).optional(),
  reason: z.string().trim().min(3, "Düzeltme nedenini yazın.").max(300),
});

export const bulkSchema = z.strictObject({
  action: z.enum(["price", "category", "publish", "unpublish", "archive"]),
  productIds: z.array(z.string().min(1).max(40)).min(1).max(200),
  mode: z.enum(["set", "increase_percent", "decrease_percent"]).optional(),
  amountKurus: kurus.optional(),
  percent: z.number().gt(0).max(1000).optional(),
  roundToLira: z.boolean().optional(),
  categoryId: z.string().min(1).max(40).nullable().optional(),
});
export type BulkInput = z.infer<typeof bulkSchema>;

export const importBodySchema = z.strictObject({
  csv: z.string().min(1).max(2_000_000),
  mode: z.enum(["all_or_nothing", "valid_only"]).optional(),
});
