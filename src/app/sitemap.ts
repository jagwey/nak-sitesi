import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/server/modules/catalog";
import { INFO_PAGES } from "@/data/site-content";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "/",
    "/koleksiyon",
    "/kisiye-ozel",
    "/hakkimizda",
  ].map((path) => ({
    url: siteUrl(path).href,
  }));

  const productRoutes = (await getSitemapEntries()).map((p) => ({
    url: siteUrl(`/urun/${encodeURIComponent(p.slug)}`).href,
    lastModified: p.updatedAt,
  }));

  const infoRoutes = Object.keys(INFO_PAGES).map((slug) => ({
    url: siteUrl(`/bilgi/${slug}`).href,
  }));

  return [...staticRoutes, ...productRoutes, ...infoRoutes];
}
