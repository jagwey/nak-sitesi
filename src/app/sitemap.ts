import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/server/modules/catalog";
import { INFO_PAGES } from "@/data/site-content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

  const staticRoutes = [
    "",
    "/koleksiyon",
    "/kisiye-ozel",
    "/hakkimizda",
    "/favoriler",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));

  const productRoutes = (await getSitemapEntries()).map((p) => ({
    url: `${baseUrl}/urun/${p.slug}`,
    lastModified: p.updatedAt,
  }));

  const infoRoutes = Object.keys(INFO_PAGES).map((slug) => ({
    url: `${baseUrl}/bilgi/${slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...productRoutes, ...infoRoutes];
}
