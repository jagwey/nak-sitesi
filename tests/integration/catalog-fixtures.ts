import { db } from "@/server/db";
import { reindexProducts } from "@/server/modules/search";

/** Seeds a small catalog (tests truncate every table before each test). */
export async function seedCatalog() {
  const fmt: Record<string, string> = {};
  for (const [i, code] of ["VP3", "PES", "DST"].entries()) {
    fmt[code] = (await db.fileFormat.create({ data: { code, extension: code.toLowerCase(), sort: i } })).id;
  }
  const pfaff = await db.machineBrand.create({ data: { slug: "pfaff", name: "PFAFF", sort: 0 } });
  const brother = await db.machineBrand.create({ data: { slug: "brother", name: "Brother", sort: 1 } });
  const pm = await db.machineModel.create({ data: { brandId: pfaff.id, name: "Creative 3.0" } });
  const bm = await db.machineModel.create({ data: { brandId: brother.id, name: "PE800" } });
  await db.machineModelFormat.createMany({
    data: [
      { modelId: pm.id, formatId: fmt.VP3 },
      { modelId: bm.id, formatId: fmt.PES },
      { modelId: bm.id, formatId: fmt.DST },
    ],
  });
  const hoop10 = await db.hoopSize.create({ data: { label: "10x10 cm", widthMm: 100, heightMm: 100 } });
  const hoop20 = await db.hoopSize.create({ data: { label: "20x20 cm", widthMm: 200, heightMm: 200 } });
  const lic = await db.license.create({ data: { code: "PERSONAL", name: "Kişisel Kullanım", priceDeltaKurus: 0, sort: 0 } });
  const catFlower = await db.category.create({ data: { slug: "cicek-ve-botanik", name: "Çiçek ve Botanik", sort: 0 } });
  const catLetter = await db.category.create({ data: { slug: "harf-ve-monogram", name: "Harf ve Monogram", sort: 1 } });

  async function digital(o: {
    slug: string; sku: string; name: string; status?: "ACTIVE" | "DRAFT" | "ARCHIVED"; price: number; cat: string;
    formats: string[]; w: number; h: number; hoop: string; colors?: number; isNew?: boolean;
  }) {
    const p = await db.product.create({
      data: {
        slug: o.slug, sku: o.sku, type: "DIGITAL_EMBROIDERY", status: o.status ?? "ACTIVE", name: o.name,
        priceKurus: o.price, categoryId: o.cat, isNew: !!o.isNew, publishedAt: new Date(), usageAreas: ["Havlu"], searchText: "",
        embroidery: {
          create: {
            designWidthMm: o.w, designHeightMm: o.h, colorCount: o.colors ?? 4, stitchCount: 1000, hoopSizeId: o.hoop,
          },
        },
        formats: { create: o.formats.map((c) => ({ formatId: fmt[c] })) },
        licenses: { create: [{ licenseId: lic.id }] },
      },
    });
    return p;
  }

  const rose = await digital({ slug: "gul-motifi", sku: "D1", name: "Gül Motifi", price: 25000, cat: catFlower.id, formats: ["VP3", "PES"], w: 80, h: 90, hoop: hoop10.id, isNew: true });
  const cicek = await digital({ slug: "cicek-celengi", sku: "D2", name: "Çiçek Çelengi", price: 35000, cat: catFlower.id, formats: ["VP3"], w: 150, h: 150, hoop: hoop20.id, colors: 8 });
  const mono = await digital({ slug: "monogram-m", sku: "D3", name: "Monogram M", price: 15000, cat: catLetter.id, formats: ["PES", "DST"], w: 60, h: 60, hoop: hoop10.id, colors: 2 });
  const draft = await digital({ slug: "taslak-desen", sku: "D4", name: "Taslak Çiçek", status: "DRAFT", price: 10000, cat: catFlower.id, formats: ["VP3"], w: 50, h: 50, hoop: hoop10.id });
  const archived = await digital({ slug: "arsiv-desen", sku: "D5", name: "Arşiv Çiçek", status: "ARCHIVED", price: 10000, cat: catFlower.id, formats: ["VP3"], w: 50, h: 50, hoop: hoop10.id });
  const towel = await db.product.create({
    data: {
      slug: "havlu", sku: "P1", type: "PHYSICAL", status: "ACTIVE", name: "Keten Havlu", priceKurus: 90000, categoryId: catLetter.id,
      publishedAt: new Date(), searchText: "", inventory: { create: { onHand: 3 } },
    },
  });
  await reindexProducts(db);
  return { rose, cicek, mono, draft, archived, towel, fmt };
}
