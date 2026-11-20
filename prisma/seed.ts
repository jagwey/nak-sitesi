// Idempotent seed: reference data + the 11 DEMO catalog products (isDemo = true).
// No users, orders, payments or DigitalFile rows are created here.
import { createScriptClient } from "./script-client";
import { PRODUCTS } from "../src/data/products";
import { CATEGORIES, CURATED_COLLECTIONS } from "../src/data/categories";
import { MACHINE_FORMAT_GUIDE, STUDIO_SETTINGS } from "../src/data/site-content";
import { normalizeTurkish } from "../src/lib/search";

const db = createScriptClient();
const referenceOnly = process.argv.includes("--reference-only");

const PERMISSIONS: Record<string, string> = {
  "product:read": "Ürünleri görüntüle",
  "product:write": "Ürün oluştur / düzenle",
  "order:read": "Siparişleri görüntüle",
  "order:write": "Sipariş durumunu yönet",
  "customer:read": "Müşterileri görüntüle",
  "customer:write": "Müşteri durumunu / KVKK işlemlerini yönet",
  "customorder:read": "Kişiye özel talepleri görüntüle",
  "customorder:write": "Kişiye özel talepleri yönet",
  "coupon:write": "Kupon yönet",
  "settings:read": "Ayarları görüntüle",
  "settings:write": "Ayarları düzenle",
  "user:read": "Kullanıcıları görüntüle",
  "user:write": "Kullanıcıları yönet",
  "audit:read": "Denetim kayıtlarını görüntüle",
  "file:write": "Dosya yükle / yönet",
};

const ALL = Object.keys(PERMISSIONS);
const ROLES: { code: string; name: string; permissions: string[] }[] = [
  { code: "SUPER_ADMIN", name: "Süper Yönetici", permissions: ALL },
  { code: "ADMIN", name: "Yönetici", permissions: ALL.filter((p) => p !== "user:write") },
  { code: "PRODUCT_MANAGER", name: "Ürün Yöneticisi", permissions: ["product:read", "product:write", "file:write"] },
  {
    code: "ORDER_MANAGER",
    name: "Sipariş Yöneticisi",
    permissions: ["order:read", "order:write", "customer:read", "customer:write", "customorder:read", "customorder:write"],
  },
  { code: "MODERATOR", name: "Moderatör", permissions: ["customorder:read", "customorder:write"] },
  { code: "CUSTOMER", name: "Müşteri", permissions: [] },
];

const FORMATS = ["VP3", "PES", "DST", "JEF", "HUS", "EXP", "XXX", "VIP", "PEC", "PCS", "SEW", "ART"];

// Only publicly well-known model names. Format links come from the site's own MACHINE_FORMAT_GUIDE
// (brand-level); no hoop compatibility is asserted per model.
const BRANDS: { name: string; slug: string; models: string[] }[] = [
  { name: "PFAFF", slug: "pfaff", models: ["Creative 3.0", "Creative 4.5", "Creative Icon 2"] },
  { name: "Husqvarna Viking", slug: "husqvarna-viking", models: ["Designer Epic 2", "Designer Ruby 90"] },
  { name: "Brother", slug: "brother", models: ["Innov-is NV1800Q", "PR680W"] },
  { name: "Janome", slug: "janome", models: ["Memory Craft 500E", "Memory Craft 14000"] },
  { name: "Bernina", slug: "bernina", models: ["590E"] },
  { name: "Singer", slug: "singer", models: ["Futura XL-580"] },
  { name: "Tajima", slug: "tajima", models: [] },
];

const slugify = (s: string) => normalizeTurkish(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  // Permissions / roles
  for (const [code, description] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({ where: { code }, update: { description }, create: { code, description } });
  }
  const permRows = await db.permission.findMany();
  const permId = new Map(permRows.map((p) => [p.code, p.id]));
  for (const r of ROLES) {
    const role = await db.role.upsert({ where: { code: r.code }, update: { name: r.name }, create: { code: r.code, name: r.name } });
    await db.rolePermission.createMany({
      data: r.permissions.map((c) => ({ roleId: role.id, permissionId: permId.get(c)! })),
      skipDuplicates: true,
    });
  }

  // File formats
  for (const [i, code] of FORMATS.entries()) {
    await db.fileFormat.upsert({
      where: { code },
      update: { sort: i },
      create: { code, name: code, extension: code.toLowerCase(), sort: i },
    });
  }
  const formatRows = await db.fileFormat.findMany();
  const formatId = new Map(formatRows.map((f) => [f.code, f.id]));

  // Machine brands / models
  for (const [i, b] of BRANDS.entries()) {
    const brand = await db.machineBrand.upsert({ where: { slug: b.slug }, update: { sort: i }, create: { slug: b.slug, name: b.name, sort: i } });
    const guide = MACHINE_FORMAT_GUIDE[b.name]?.formats ?? [];
    for (const name of b.models) {
      const model = await db.machineModel.upsert({
        where: { brandId_name: { brandId: brand.id, name } },
        update: {},
        create: { brandId: brand.id, name },
      });
      await db.machineModelFormat.createMany({
        data: guide.filter((c) => formatId.has(c)).map((c, idx) => ({ modelId: model.id, formatId: formatId.get(c)!, preferred: idx === 0 })),
        skipDuplicates: true,
      });
    }
  }

  // Hoops
  const hoopId = new Map<string, string>();
  for (const label of ["10x10 cm", "13x18 cm", "16x26 cm", "20x20 cm", "20x36 cm"]) {
    const [w, h] = label.replace(" cm", "").split("x").map((n) => Number(n) * 10);
    const row = await db.hoopSize.upsert({ where: { label }, update: {}, create: { label, widthMm: w, heightMm: h } });
    hoopId.set(label, row.id);
  }

  // Licenses
  const maxDelta = referenceOnly ? 0 : Math.max(0, ...PRODUCTS.map((p) => p.embroidery?.commercialPriceDeltaKurus ?? 0));
  const lic = {
    PERSONAL: await db.license.upsert({
      where: { code: "PERSONAL" },
      update: {},
      create: { code: "PERSONAL", name: "Kişisel Kullanım", description: "Kişisel ve hobi amaçlı kullanım.", sort: 0 },
    }),
    SMALL_BUSINESS: await db.license.upsert({
      where: { code: "SMALL_BUSINESS" },
      update: {},
      create: { code: "SMALL_BUSINESS", name: "Küçük İşletme", description: "Küçük ölçekli ticari kullanım.", priceDeltaKurus: maxDelta, sort: 1 },
    }),
  };

  // Categories + collections
  const catId = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const data = { name: c.name, description: c.shortDescription, image: c.image, imageAlt: c.imageAlt, featuredType: c.featuredType ?? null, sort: i };
    const row = await db.category.upsert({ where: { slug: c.slug }, update: data, create: { slug: c.slug, ...data } });
    catId.set(c.slug, row.id);
  }
  for (const [i, c] of CURATED_COLLECTIONS.entries()) {
    const data = { title: c.title, subtitle: c.subtitle, filterQuery: c.filterQuery, image: c.image, imageAlt: c.imageAlt, sort: i };
    await db.collection.upsert({ where: { slug: c.slug }, update: data, create: { slug: c.slug, ...data } });
  }

  if (referenceOnly) {
    console.log(`Reference seed OK: ${CATEGORIES.length} categories, ${ROLES.length} roles.`);
    return;
  }

  // Demo products
  const demoTag = await db.tag.upsert({ where: { slug: "demo" }, update: {}, create: { slug: "demo", name: "demo" } });
  for (const p of PRODUCTS) {
    const searchText = normalizeTurkish([p.name, p.subtitle, p.categoryName, p.description, ...p.tags, ...p.usageAreas].join(" "));
    const data = {
      type: p.type === "digital" ? ("DIGITAL_EMBROIDERY" as const) : ("PHYSICAL" as const),
      status: "ACTIVE" as const,
      name: p.name,
      shortDescription: p.subtitle,
      description: p.description,
      highlights: p.highlights,
      usageAreas: p.usageAreas,
      priceKurus: p.priceKurus,
      compareAtPriceKurus: p.compareAtPriceKurus ?? null,
      personalizable: p.personalizable,
      isNew: !!p.isNew,
      isFeatured: !!p.isFeatured,
      isDemo: true,
      physicalInfo: p.physical ? (p.physical as object) : undefined,
      searchText,
      categoryId: catId.get(p.categorySlug) ?? null,
    };
    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, sku: p.id.toUpperCase(), publishedAt: new Date(), ...data },
    });

    await db.productImage.deleteMany({ where: { productId: product.id } });
    await db.productImage.createMany({
      data: p.images.map((im, sort) => ({ productId: product.id, url: im.url, alt: im.alt, caption: im.caption, sort })),
    });

    const tagSlugs = [...p.tags];
    await db.productTag.deleteMany({ where: { productId: product.id } });
    for (const t of tagSlugs) {
      const slug = slugify(t);
      if (!slug) continue;
      const tag = await db.tag.upsert({ where: { slug }, update: {}, create: { slug, name: t } });
      await db.productTag.createMany({ data: [{ productId: product.id, tagId: tag.id }], skipDuplicates: true });
    }
    await db.productTag.createMany({ data: [{ productId: product.id, tagId: demoTag.id }], skipDuplicates: true });

    if (p.embroidery) {
      const e = p.embroidery;
      const meta = {
        designWidthMm: e.widthMm,
        designHeightMm: e.heightMm,
        stitchCount: e.stitchCount,
        colorCount: e.colorCount,
        colorChanges: e.colorChanges,
        threadColors: e.threadChart as object[],
        usageInstructions: e.usageInstructions,
        downloadTerms: e.downloadTerms,
        hoopSizeId: hoopId.get(e.hoopSize) ?? null,
        metadataSource: "MANUAL" as const,
        verified: false,
      };
      await db.embroideryMetadata.upsert({ where: { productId: product.id }, update: meta, create: { productId: product.id, ...meta } });
      await db.productFormat.createMany({
        data: e.formats.filter((c) => formatId.has(c)).map((c) => ({ productId: product.id, formatId: formatId.get(c)! })),
        skipDuplicates: true,
      });
      await db.productLicense.createMany({
        data: [
          { productId: product.id, licenseId: lic.PERSONAL.id, priceDeltaKurus: 0 },
          ...(e.licenses.includes("Küçük İşletme")
            ? [{ productId: product.id, licenseId: lic.SMALL_BUSINESS.id, priceDeltaKurus: e.commercialPriceDeltaKurus }]
            : []),
        ],
        skipDuplicates: true,
      });
    }

    if (p.physical) {
      // Demo quantity only (data has an in-stock flag, not a count).
      const onHand = p.physical.inStock ? 10 : 0;
      await db.inventory.upsert({ where: { productId: product.id }, update: {}, create: { productId: product.id, onHand } });
    }
  }

  // Site settings (demo values; real contact data is configured in the admin panel)
  await db.siteSettings.upsert({
    where: { key: "studio" },
    update: {},
    create: { key: "studio", value: { ...STUDIO_SETTINGS, isDemo: true } },
  });

  console.log(`Seed OK: ${PRODUCTS.length} demo products, ${CATEGORIES.length} categories, ${ROLES.length} roles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
