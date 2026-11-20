import { describe, expect, it } from "vitest";
import { call } from "./helpers";
import { seedCatalog } from "./catalog-fixtures";
import { GET as list } from "@/app/api/products/route";
import { db } from "@/server/db";
import { buildSearchText, reindexProducts } from "@/server/modules/search";

const search = async (q: string) => {
  const j = await (await call(list, "GET", `/api/products?facets=false&q=${encodeURIComponent(q)}`)).json();
  return j.items.map((p: { name: string }) => p.name).sort() as string[];
};

describe("search", () => {
  it("buildSearchText is Turkish-normalized and includes formats and machines", () => {
    const t = buildSearchText({ sku: "X", name: "Çiçek Çelengi", formats: ["VP3"], machineBrands: ["PFAFF"] });
    expect(t).toContain("cicek celengi");
    expect(t).toContain("vp3");
    expect(t).toContain("pfaff");
  });

  it("'cicek vp3' finds VP3 designs in the flower category, not other formats or categories", async () => {
    await seedCatalog();
    // Gül Motifi matches through its category name (Çiçek ve Botanik); Monogram M is neither flower nor VP3.
    expect(await search("cicek vp3")).toEqual(["Gül Motifi", "Çiçek Çelengi"].sort());
    expect(await search("cicek dst")).toEqual([]);
  });

  it("'çıçek' typo still reaches Çiçek via trigram fallback", async () => {
    await seedCatalog();
    expect(await search("çıçek")).toContain("Çiçek Çelengi");
  });

  it("DRAFT/ARCHIVED never appear in search", async () => {
    await seedCatalog();
    expect(await search("cicek")).not.toContain("Taslak Çiçek");
    expect(await search("arsiv")).toEqual([]);
  });

  it("'pfaff 10x10' returns only PFAFF-readable designs that fit a 10x10 hoop", async () => {
    await seedCatalog();
    // Gül (VP3+PES, 80x90) fits; Çelenk (VP3, 150x150) does not; Monogram (PES/DST) is not PFAFF-readable.
    expect(await search("pfaff 10x10")).toEqual(["Gül Motifi"]);
  });

  it("a current uploaded file overrides declared formats", async () => {
    const { rose, fmt } = await seedCatalog();
    await db.digitalFile.create({
      data: {
        productId: rose.id, formatId: fmt.PES, storageKey: "private/x.pes", originalName: "x.pes",
        sizeBytes: 10, sha256: "a".repeat(64), version: 1, isCurrent: true, status: "ACTIVE",
      },
    });
    await reindexProducts(db);
    const j = await (await call(list, "GET", "/api/products?format=VP3&facets=false")).json();
    expect(j.items.map((p: { slug: string }) => p.slug)).not.toContain("gul-motifi"); // VP3 only declared, PES verified
    const rosePage = await (await call(list, "GET", "/api/products?format=PES&facets=false")).json();
    const dto = rosePage.items.find((p: { slug: string }) => p.slug === "gul-motifi");
    expect(dto.embroidery).toMatchObject({ formats: ["PES"], formatsVerified: true });
    expect(JSON.stringify(rosePage)).not.toContain("private/x.pes");
  });
});
