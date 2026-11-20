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

export const metadata: Metadata = {
  metadataBase: new URL("https://tulaybirer.com"),
  title: {
    default: "Tülay Birer | Makine Nakışı Desenleri ve İşlemeli Tekstil Atölyesi",
    template: "%s | Tülay Birer",
  },
  description:
    "PFAFF VP3 ve çoklu makine uyumlu özgün dijital nakış desenleri, doğal keten işlemeli tekstil ürünleri ve kişiye özel monogram tasarımları.",
  openGraph: {
    title: "Tülay Birer | Makine Nakışı Desenleri ve İşlemeli Tekstil",
    description:
      "Özgün nakış desenlerini, özenle hazırlanan tekstil ürünlerini ve size özel tasarımları keşfedin.",
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tülay Birer",
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <StoreProvider>
          <ChromeGate>
            <AnnouncementBar />
            {/* Zero-height sticky anchor: header sits below the (in-flow) announcement bar at the top of the page, then sticks to the viewport top. */}
            <div className="sticky top-0 z-40 h-0">
              <Header />
            </div>
          </ChromeGate>
          <main id="ana-icerik">{children}</main>
          <ChromeGate>
            <Footer />
            <SearchOverlay />
            <CartDrawer />
            <FavoritesDrawer />
          </ChromeGate>
        </StoreProvider>
      </body>
    </html>
  );
}
