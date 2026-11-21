import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { publicImageThumbnail } from "@/lib/product-image";
import type {
  EmbroideryMetadata,
  EmbroideryFormat,
  HoopSize,
  MachineBrand,
  PhysicalMetadata,
  Product,
  ThreadColorStop,
  UsageArea,
} from "@/data/products";

/** Everything the DTO needs. DigitalFile rows expose the format code only; storage keys are never selected. */
export const productInclude = {
  category: { select: { slug: true, name: true } },
  tags: { select: { tag: { select: { name: true } } } },
  images: { orderBy: { sort: "asc" }, select: { url: true, storageKey: true, alt: true, caption: true } },
  formats: { select: { format: { select: { code: true, sort: true } } } },
  embroidery: { include: { hoopSize: { select: { label: true } } } },
  digitalFiles: {
    where: { isCurrent: true, status: "ACTIVE" },
    select: { format: { select: { code: true, sort: true } } },
  },
  licenses: { select: { priceDeltaKurus: true, license: { select: { code: true, name: true, priceDeltaKurus: true } } } },
  inventory: { select: { onHand: true, reserved: true } },
  _count: { select: { bundleItems: true } },
} satisfies Prisma.ProductInclude;

export type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** format code -> brand names whose models read it. */
export type BrandsByFormat = Map<string, string[]>;

const DIGITAL_TYPES = new Set(["DIGITAL_EMBROIDERY", "DIGITAL_PRINT", "BUNDLE"]);

function sizeCategory(w: number, h: number): EmbroideryMetadata["patternSizeCategory"] {
  const m = Math.max(w, h);
  return m < 100 ? "Küçük (< 10 cm)" : m <= 180 ? "Orta (10–18 cm)" : "Büyük (> 18 cm)";
}

function threadChart(v: unknown): ThreadColorStop[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t, i) => ({
      step: Number(t.step ?? i + 1),
      name: String(t.name ?? ""),
      code: String(t.code ?? ""),
      hex: String(t.hex ?? "#000000"),
      stitches: Number(t.stitches ?? 0),
    }));
}

/** Vitrin satın alma adresi: kayıtlı bağlantı, yoksa Shopier ürün numarası, o da yoksa (shopier modunda) mağaza. */
export function publicShopierUrl(
  row: { isDemo: boolean; shopierUrl: string | null; shopierProductId?: string | null },
  storeFallback?: string,
): string | undefined {
  if (row.isDemo) return undefined;
  if (row.shopierUrl) return row.shopierUrl;
  if (row.shopierProductId && /^[1-9]\d{0,19}$/.test(row.shopierProductId)) return `https://www.shopier.com/${row.shopierProductId}`;
  return storeFallback;
}

export function toProductDto(row: ProductRow, brandsByFormat: BrandsByFormat, storeFallback?: string): Product {
  const digital = DIGITAL_TYPES.has(row.type);
  const fileFormats = row.digitalFiles.map((d) => d.format);
  const verified = fileFormats.length > 0;
  const fmtSource = verified ? fileFormats : row.formats.map((f) => f.format);
  const formats = [...new Map(fmtSource.map((f) => [f.code, f])).values()]
    .sort((a, b) => a.sort - b.sort)
    .map((f) => f.code as EmbroideryFormat);

  const base: Product = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.shortDescription ?? "",
    type: digital ? "digital" : "physical",
    categorySlug: row.category?.slug ?? "",
    categoryName: row.category?.name ?? "",
    priceKurus: row.priceKurus,
    compareAtPriceKurus: row.compareAtPriceKurus ?? undefined,
    isNew: row.isNew || undefined,
    isFeatured: row.isFeatured || undefined,
    personalizable: row.personalizable,
    usageAreas: row.usageAreas as UsageArea[],
    tags: row.tags.map((t) => t.tag.name).filter((n) => n !== "demo"),
    images: row.images.map((i) => ({
      url: i.url,
      alt: i.alt ?? "",
      caption: i.caption ?? "",
      ...publicImageThumbnail(i.url, i.storageKey),
    })),
    description: row.description ?? "",
    highlights: row.highlights,
    isDemo: row.isDemo,
    shopierUrl: publicShopierUrl(row, storeFallback),
  };

  const em = row.embroidery;
  if (digital && em) {
    const brands = new Set<string>();
    for (const f of formats) for (const b of brandsByFormat.get(f) ?? []) brands.add(b);
    const small = row.licenses.find((l) => l.license.code === "SMALL_BUSINESS");
    const w = em.designWidthMm ?? 0;
    const h = em.designHeightMm ?? 0;
    base.embroidery = {
      formats,
      formatsVerified: verified,
      supportedMachines: [...brands] as MachineBrand[],
      hoopSize: (em.hoopSize?.label ?? "") as HoopSize,
      widthMm: w,
      heightMm: h,
      stitchCount: em.stitchCount ?? 0,
      colorCount: em.colorCount ?? 0,
      colorChanges: em.colorChanges ?? 0,
      patternSizeCategory: sizeCategory(w, h),
      licenses: row.licenses.map((l) => l.license.name) as ("Kişisel Kullanım" | "Küçük İşletme")[],
      commercialPriceDeltaKurus: small ? (small.priceDeltaKurus ?? small.license.priceDeltaKurus) : 0,
      threadChart: threadChart(em.threadColors),
      usageInstructions: em.usageInstructions,
      downloadTerms: em.downloadTerms ?? "",
      isBundle: row.type === "BUNDLE" || row._count.bundleItems > 0 || base.tags.includes("paket") || undefined,
      bundleCount: row._count.bundleItems || undefined,
    };
  }

  if (!digital) {
    const info = (row.physicalInfo ?? {}) as Partial<PhysicalMetadata>;
    const inStock = row.inventory ? row.inventory.onHand - row.inventory.reserved > 0 : !!info.inStock;
    base.physical = {
      inStock,
      stockNote: info.stockNote ?? "",
      colors: info.colors ?? [],
      sizes: info.sizes ?? [],
      material: info.material ?? "",
      productionTime: info.productionTime ?? "",
      shippingEstimate: info.shippingEstimate ?? "",
      careInstructions: info.careInstructions ?? [],
      personalizationPriceKurus: info.personalizationPriceKurus,
      surfaceType: info.surfaceType,
    };
  }
  return base;
}
