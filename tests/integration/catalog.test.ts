import { describe, expect, it } from "vitest";
import { call } from "./helpers";
import { seedCatalog } from "./catalog-fixtures";
import { GET as list } from "@/app/api/products/route";
import { GET as one } from "@/app/api/products/[slug]/route";
import { GET as related } from "@/app/api/products/[slug]/related/route";
import { GET as cats } from "@/app/api/categories/route";
import { GET as suggest } from "@/app/api/search/suggest/route";
import { db } from "@/server/db";
import { getAvailableEmbroideryOffers, getHomepageData } from "@/server/modules/catalog";

const names = (j: { items: { name: string }[] }) => j.items.map((p) => p.name).sort();
const get = async (q: string) => (await call(list, "GET", `/api/products${q}`)).json();

describe("catalog API", () => {
  it("uses active, non-demo products for homepage covers, counts, and tabs", async () => {
    const { rose, cicek, draft } = await seedCatalog();
    await db.category.create({
      data: { slug: "dijital-nakis-desenleri", name: "Dijital Nakış Desenleri", sort: -1 },
    });
    await db.product.update({
      where: { id: cicek.id },
      data: { isDemo: true, isFeatured: true, isNew: true },
    });
    await db.productImage.createMany({ data: [
      { productId: rose.id, url: "/rose-detail.webp", sort: 1 },
      { productId: rose.id, url: "/images/products/rose.webp", storageKey: "products/rose.webp", alt: "Gül dikişi", sort: 0 },
      { productId: cicek.id, url: "/demo.webp" },
      { productId: draft.id, url: "/draft.webp" },
    ] });

    const { categories, tabs } = await getHomepageData();
    const cover = { url: "/images/products/rose.webp", thumbnailUrl: "/images/products/rose-t.webp", alt: "Gül dikişi" };
    expect(categories).toEqual([
      { slug: "dijital-nakis-desenleri", name: "Dijital Nakış Desenleri", productCount: 2, image: cover },
      { slug: "cicek-ve-botanik", name: "Çiçek ve Botanik", productCount: 1, image: cover },
    ]);
    expect(names({ items: tabs.new })).toEqual(["Gül Motifi"]);
    expect(tabs.new[0].images).toEqual([
      { ...cover, caption: "" },
      { url: "/rose-detail.webp", alt: "", caption: "" },
    ]);
    expect(names({ items: tabs.digital })).toEqual(["Gül Motifi", "Monogram M"]);
    expect(names({ items: tabs.physical })).toEqual(["Keten Havlu"]);
  });

  it("promotes only tiers supported by purchasable designs in the store checkout", async () => {
    const { rose, cicek, mono, draft, archived, fmt } = await seedCatalog();
    await db.digitalFile.createMany({
      data: [rose, cicek, mono, draft, archived].map(({ id }) => ({
        productId: id, formatId: fmt.VP3, storageKey: `embroidery/${id}.vp3`,
        originalName: "desen.vp3", sizeBytes: 100, sha256: "a".repeat(64),
      })),
    });
    expect(await getAvailableEmbroideryOffers()).toEqual([{ minDesigns: 3, percent: 10 }]);

    await db.product.update({ where: { id: mono.id }, data: { shopierUrl: "https://www.shopier.com/123456" } });
    expect(await getAvailableEmbroideryOffers()).toEqual([]);
  });

  it("lists only ACTIVE products", async () => {
    await seedCatalog();
    const j = await get("");
    expect(j.total).toBe(4);
    expect(names(j)).toEqual(["Gül Motifi", "Keten Havlu", "Monogram M", "Çiçek Çelengi"].sort());
    expect(JSON.stringify(j)).not.toContain("storageKey");
  });

  it("DRAFT and ARCHIVED slugs return 404, ACTIVE returns the Product shape", async () => {
    await seedCatalog();
    for (const slug of ["taslak-desen", "arsiv-desen", "yok"]) {
      expect((await call(one, "GET", `/api/products/${slug}`, undefined, { params: { slug } })).status).toBe(404);
    }
    const res = await call(one, "GET", "/api/products/gul-motifi", undefined, { params: { slug: "gul-motifi" } });
    const { product } = await res.json();
    expect(product).toMatchObject({ slug: "gul-motifi", type: "digital", priceKurus: 25000, categorySlug: "cicek-ve-botanik" });
    expect(product.embroidery).toMatchObject({ widthMm: 80, heightMm: 90, hoopSize: "10x10 cm", formats: ["VP3", "PES"], formatsVerified: false });
    expect(product.embroidery.supportedMachines.sort()).toEqual(["Brother", "PFAFF"]);
  });

  it("filters by category and format", async () => {
    await seedCatalog();
    expect(names(await get("?kategori=cicek-ve-botanik"))).toEqual(["Gül Motifi", "Çiçek Çelengi"].sort());
    expect(names(await get("?format=DST"))).toEqual(["Monogram M"]);
    expect(names(await get("?format=VP3"))).toEqual(["Gül Motifi", "Çiçek Çelengi"].sort());
    expect(names(await get("?tur=physical"))).toEqual(["Keten Havlu"]);
    expect(names(await get("?makine=PFAFF"))).toEqual(["Gül Motifi", "Çiçek Çelengi"].sort());
  });

  it("paginates and sorts", async () => {
    await seedCatalog();
    const p1 = await get("?sirala=fiyat-artan&pageSize=2&page=1");
    const p2 = await get("?sirala=fiyat-artan&pageSize=2&page=2");
    expect(p1.total).toBe(4);
    expect(p1.items.map((p: { priceKurus: number }) => p.priceKurus)).toEqual([15000, 25000]);
    expect(p2.items.map((p: { priceKurus: number }) => p.priceKurus)).toEqual([35000, 90000]);
    const desc = await get("?sirala=fiyat-azalan&pageSize=1");
    expect(desc.items[0].priceKurus).toBe(90000);
  });

  it("returns facet counts that exclude the dimension itself", async () => {
    await seedCatalog();
    const j = await get("?format=VP3");
    expect(j.facets.format.VP3).toBe(2);
    expect(j.facets.format.PES).toBe(2); // format facet ignores the format filter
    expect(j.facets.kategori["cicek-ve-botanik"]).toBe(2);
  });

  it("rejects unknown query params and oversized pages", async () => {
    await seedCatalog();
    expect((await call(list, "GET", "/api/products?evil=1")).status).toBe(400);
    expect((await call(list, "GET", "/api/products?pageSize=9999")).status).toBe(400);
  });

  it("related excludes self and non-active, categories count ACTIVE only", async () => {
    await seedCatalog();
    const r = await (await call(related, "GET", "/api/products/gul-motifi/related", undefined, { params: { slug: "gul-motifi" } })).json();
    expect(r.items.map((p: { slug: string }) => p.slug)).not.toContain("gul-motifi");
    expect(r.items.map((p: { slug: string }) => p.slug)).not.toContain("taslak-desen");
    const c = await (await call(cats, "GET", "/api/categories")).json();
    expect(c.categories.find((x: { slug: string }) => x.slug === "cicek-ve-botanik").productCount).toBe(2);
  });

  it("suggest returns products and categories", async () => {
    await seedCatalog();
    const j = await (await call(suggest, "GET", "/api/search/suggest?q=gul")).json();
    expect(j.suggestions.some((s: { kind: string; label: string }) => s.kind === "urun" && s.label === "Gül Motifi")).toBe(true);
  });
});
