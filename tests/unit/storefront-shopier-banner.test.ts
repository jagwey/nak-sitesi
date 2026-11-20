import { describe, expect, it } from "vitest";
import { STOREFRONT_BANNER } from "../../storefront/copy";

describe("Shopier vitrin bandı", () => {
  it("site içi indirimi Shopier’de vaat etmez", () => {
    expect(STOREFRONT_BANNER).toContain("Shopier");
    expect(STOREFRONT_BANNER).toContain("uygulanmaz");
    expect(STOREFRONT_BANNER).not.toMatch(/%\s*\d+/);
    expect(STOREFRONT_BANNER.toLocaleLowerCase("tr")).not.toContain("3 al 2");
  });
});
