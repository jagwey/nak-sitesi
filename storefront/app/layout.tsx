import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { STOREFRONT_BANNER } from "../copy";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { storefrontCatalog } from "../catalog";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-inter",
  display: "swap",
});

const navigation = [
  { label: "Görselden nakışa", href: "/kisiye-ozel/#gorsel" },
  { label: "İsteğe özel parça", href: "/kisiye-ozel/#parca" },
  { label: "Nakış Desenleri", href: "/koleksiyon/?tur=dijital" },
  { label: "Hakkımızda", href: "/hakkimizda/" },
];

export const metadata: Metadata = {
  title: {
    default: `${storefrontCatalog.storeName} | Makine nakışı ve işlemeli tekstil`,
    template: `%s | ${storefrontCatalog.storeName}`,
  },
  description: "Fotoğraf veya logoyu nakış dosyasına çevirme, isteğe özel parça ve Pfaff VP3 desenleri. Ödeme Shopier üzerinden yapılır.",
  robots: { index: storefrontCatalog.products.length > 0, follow: true },
};

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  const { storeName } = storefrontCatalog;
  return (
    <html lang="tr" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col bg-ivory font-sans text-ink antialiased">
        <div className="sticky top-0 z-40 h-0">
          <header className="absolute inset-x-0 top-0 border-b border-hairline bg-ivory/95 backdrop-blur-md">
            <a href="#ana-icerik" className="sr-only z-10 bg-ivory p-3 focus:not-sr-only focus:absolute">
              İçeriğe geç
            </a>
            <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-5 px-4 sm:px-6 lg:h-[80px] lg:px-10">
              <a href="/" className="font-display text-3xl font-medium leading-tight text-ink">{storeName}</a>
              <nav aria-label="Ana menü" className="hidden items-center gap-5 text-[0.9375rem] font-medium lg:flex xl:gap-8">
                {navigation.map(({ label, href }) => (
                  <a key={href} href={href} className="inline-flex min-h-11 items-center hover:text-gold-text">{label}</a>
                ))}
              </nav>
              <details className="lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-2 text-[0.9375rem] font-medium [&::-webkit-details-marker]:hidden">
                  <Menu className="size-5" aria-hidden="true" />
                  Menü
                </summary>
                <nav aria-label="Mobil menü" className="absolute inset-x-0 top-full grid divide-y divide-hairline border-b border-hairline bg-ivory px-4 py-2 shadow-md sm:px-6">
                  {navigation.map(({ label, href }) => (
                    <a key={href} href={href} className="flex min-h-12 items-center font-medium hover:text-gold-text">{label}</a>
                  ))}
                </nav>
              </details>
            </div>
          </header>
        </div>
        <main id="ana-icerik" className="flex-1" tabIndex={-1}>{children}</main>
        <footer className="bg-espresso text-ivory">
          <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-10">
            <div>
              <a href="/" className="font-display text-3xl">{storeName}</a>
              <p className="mt-3 max-w-[42ch] text-[1.0625rem] leading-relaxed text-[#CBBFA9]">{STOREFRONT_BANNER}</p>
            </div>
            <nav aria-label="Alt menü" className="flex flex-col text-[1.0625rem]">
              <a href="/kisiye-ozel/#gorsel" className="inline-flex min-h-12 items-center hover:underline">Görselden nakışa çevirme</a>
              <a href="/kisiye-ozel/#parca" className="inline-flex min-h-12 items-center hover:underline">İsteğe özel parça</a>
              <a href="/onizleme/" className="inline-flex min-h-12 items-center hover:underline">Önizleme desenleri</a>
              <a href="/#sss" className="inline-flex min-h-12 items-center hover:underline">Sık sorulan sorular</a>
              <a href="/koleksiyon/" className="inline-flex min-h-12 items-center hover:underline">Koleksiyon</a>
              <a href="/hakkimizda/" className="inline-flex min-h-12 items-center hover:underline">Hakkımızda</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
