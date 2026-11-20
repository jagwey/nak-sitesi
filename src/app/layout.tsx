import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { ChromeGate } from "@/components/layout/ChromeGate";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { FavoritesDrawer } from "@/components/layout/FavoritesDrawer";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { StoreProvider } from "@/lib/store";
import { isStoreCheckoutOpen } from "@/server/env";
import { siteUrl } from "@/lib/site-url";
import { getSiteSettings } from "@/server/modules/settings/service";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const title = `${site.storeName} | ${site.seoTitle || "Makine Nakışı Desenleri ve İşlemeli Tekstil"}`;
  return {
    metadataBase: siteUrl(),
    title: { default: title, template: `%s | ${site.storeName}` },
    description: site.seoDescription ||
      "PFAFF VP3 ve çoklu makine uyumlu özgün dijital nakış desenleri, doğal keten işlemeli tekstil ürünleri ve kişiye özel monogram tasarımları.",
    openGraph: {
      title,
      siteName: site.storeName,
      description: site.seoDescription ||
        "Özgün nakış desenlerini, özenle hazırlanan tekstil ürünlerini ve size özel tasarımları keşfedin.",
      locale: "tr_TR",
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSiteSettings();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.storeName,
    ...(site.logoUrl && { logo: siteUrl(site.logoUrl).href }),
    description:
      "Makine nakışı desenleri, dijital nakış dosyaları, işlemeli tekstil ürünleri ve kişiye özel nakış atölyesi.",
  };

  return (
    <html
      lang="tr"
      className={`${cormorant.variable} ${manrope.variable}`}
    >
      <body className="min-h-screen bg-ivory font-sans text-ink antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
        />
        <StoreProvider checkoutOpen={isStoreCheckoutOpen()}>
          <ChromeGate>
            <AnnouncementBar site={site} />
            {/* Zero-height sticky anchor: header sits below the (in-flow) announcement bar at the top of the page, then sticks to the viewport top. */}
            <div className="sticky top-0 z-40 h-0">
              <Header storeName={site.storeName} logoUrl={site.logoUrl} />
            </div>
          </ChromeGate>
          <main id="ana-icerik">{children}</main>
          <ChromeGate>
            <Footer site={site} />
            <SearchOverlay />
            <CartDrawer />
            <FavoritesDrawer />
          </ChromeGate>
        </StoreProvider>
      </body>
    </html>
  );
}
