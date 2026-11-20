import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OPEN_LICENSE_CATALOG } from "@/data/open-license-catalog";
import { campaignBannerText, visibleBundleCampaigns } from "@/lib/campaigns";
import { EMBROIDERY_OFFER } from "@/lib/embroidery-offer";
import { designWidthPercent } from "@/lib/fabric-scale";
import { DEFAULT_HERO_TITLE, resolveHeroTitle } from "@/lib/hero";

const root = path.resolve(import.meta.dirname, "../..");

describe("hero ve kampanya", () => {
  it("eski başlığı iki hizmeti söyleyen başlıkla değiştirir", () => {
    expect(resolveHeroTitle("")).toBe(DEFAULT_HERO_TITLE);
    expect(resolveHeroTitle("Nakış makinesi desenleri ve el işi tekstiller")).toContain("Görselden nakışa");
    expect(resolveHeroTitle("Atölyenin özel başlığı")).toBe("Atölyenin özel başlığı");
  });

  it("kapalı paket indirimini vitrinde göstermez", () => {
    expect(visibleBundleCampaigns()).toEqual([]);
    expect(campaignBannerText()).toContain(`%${EMBROIDERY_OFFER.find((tier) => tier.minDesigns === 3)?.percent}`);
    expect(campaignBannerText()).not.toContain("3 al 2 öde");
  });
});

describe("kumaş ölçeği", () => {
  it("milimetre değişince desenin kumaştaki payını değiştirir", () => {
    expect(designWidthPercent(80, 160)).toBe(50);
    expect(designWidthPercent(10, 400)).toBe(12);
    expect(designWidthPercent(300, 280)).toBe(78);
  });
});

describe("açık lisans kataloğu", () => {
  it("her desenin ticari lisansı ve gerçek dikiş dosyası vardır", () => {
    expect(OPEN_LICENSE_CATALOG.filter((design) => design.kind === "monogram")).toHaveLength(26);
    const magic: Record<string, Buffer> = {
      VP3: Buffer.from("%vsm%"),
      PES: Buffer.from("#PES"),
      DST: Buffer.from("LA:"),
      JEF: Buffer.from([0x7c, 0x00, 0x00, 0x00]),
    };
    for (const design of OPEN_LICENSE_CATALOG) {
      expect(design.commercialUse).toBe(true);
      expect(design.resaleAllowed).toBe(true);
      expect(design.licenseId).toBe("original-commercial");
      expect(design.saleStatus).toBe("preview");
      expect(design.physicalProof).toBe(false);
      expect(design.sourceName.length).toBeGreaterThan(3);
      for (const format of design.formats) {
        const bytes = readFileSync(path.join(root, design.files[format]));
        expect(bytes.subarray(0, magic[format].length).equals(magic[format])).toBe(true);
        expect(bytes.subarray(0, 8).toString("utf8")).not.toContain("PNG");
        expect(bytes[0]).not.toBe(0x89);
      }
    }
  });
});
