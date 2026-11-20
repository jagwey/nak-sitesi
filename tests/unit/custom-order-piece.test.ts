import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRODUCT_TYPES, createCustomOrderBody } from "@/server/modules/custom-orders/schema";

describe("isteğe özel parça talebi", () => {
  it("product types include piece requests", () => {
    expect(PRODUCT_TYPES).toContain("İsteğe özel parça");
  });

  it("accepts piece request payload without files", () => {
    const parsed = createCustomOrderBody.parse({
      name: "Ali Demir",
      email: "ali@example.com",
      productType: "İsteğe özel parça",
      text: "Havluya 12 cm lacivert monogram",
      size: "13 × 18 cm",
      threadColor: "Lacivert",
      notes: "Hizmet: İsteğe özel parça\nAdet: 2",
      consent: "true",
      website: "",
    });
    expect(parsed.productType).toBe("İsteğe özel parça");
    expect(parsed.notes).toContain("İsteğe özel parça");
  });

  it("piece and visual studio modes skip LiveMonogramPreview", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/custom/CustomOrderStudio.tsx"),
      "utf8",
    );
    expect(src).toContain('const pieceMode = hizmet === "parca"');
    expect(src).toContain('const visualMode = hizmet === "gorsel"');
    expect(src).toContain("const lightMode = pieceMode || visualMode");
    expect(src).toMatch(/lightMode \? \(/);
    expect(src).toContain("Yüklediğiniz görseller");
    expect(src).toContain("İsteğe bağlı ayrıntılar");
  });
});
