import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("site speed guards", () => {
  it("caches homepage catalog data and defers auth/cart until idle", () => {
    const catalog = read("src/server/modules/catalog/service.ts");
    expect(catalog).toContain('unstable_cache(loadHomepageData');
    expect(catalog).toContain("revalidate: 60");
    const store = read("src/lib/store.tsx");
    expect(store).toContain("requestIdleCallback");
    expect(store).toContain("timeout: 2500");
  });

  it("Caddy and Worker keep anonymous home edge-cacheable", () => {
    const caddy = read("deploy/cloudflare/Caddyfile");
    expect(caddy).toMatch(/header_down \+?X-Nakis-Edge-Cache anonymous-home/);
    const proxy = read("deploy/cloudflare/proxy.ts");
    expect(proxy).toContain("optedIn || !response.headers.has(\"x-nakis-edge-cache\")");
  });
});
