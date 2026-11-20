import { expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

it("returns a non-cacheable readiness response when PostgreSQL is reachable", async () => {
  const response = await GET(new Request("http://localhost:3000/api/health"));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ ok: true });
});

it("lists canonical public URLs based on the runtime site URL", async () => {
  const base = new URL(process.env.APP_URL!);
  expect(robots().sitemap).toBe(new URL("/sitemap.xml", base).href);
  const entries = await sitemap();
  expect(entries.some(({ url }) => url === new URL("/", base).href)).toBe(true);
  expect(entries.every(({ url }) => new URL(url).origin === base.origin)).toBe(true);
  expect(entries.some(({ url }) => new URL(url).pathname === "/favoriler")).toBe(false);
});
