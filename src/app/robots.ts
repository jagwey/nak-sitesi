import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin", "/api/", "/hesabim", "/sepet", "/odeme", "/favoriler",
        "/giris", "/kayit", "/sifremi-unuttum", "/sifre-sifirla", "/e-posta-dogrula",
        "/kisiye-ozel/teklif/",
      ],
    },
    sitemap: siteUrl("/sitemap.xml").href,
  };
}
