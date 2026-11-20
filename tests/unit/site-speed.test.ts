import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("site speed guards", () => {
  it("public storefront pages use ISR instead of force-dynamic", () => {
    for (const file of [
      "src/app/layout.tsx",
      "src/app/page.tsx",
      "src/app/koleksiyon/page.tsx",
      "src/app/urun/[slug]/page.tsx",
    ]) {
      const src = read(file);
      expect(src, file).not.toMatch(/export const dynamic = "force-dynamic"/);
      expect(src, file).toMatch(/export const revalidate = \d+/);
    }
  });

  it("defers auth/cart network until idle so first paint stays light", () => {
    const src = read("src/lib/store.tsx");
    expect(src).toContain("requestIdleCallback");
    expect(src).toContain("timeout: 2500");
  });

  it("Caddy marks cookie-less homepage for edge cache via header_down", () => {
    const src = read("deploy/cloudflare/Caddyfile");
    expect(src).toMatch(/header_down \+?X-Nakis-Edge-Cache anonymous-home/);
    expect(src).toContain("@anonymous_home");
  });
});
