import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { storefrontCatalog } from "../catalog";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
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
  title: `${storefrontCatalog.storeName} | Makine nakışı ve işlemeli tekstil`,
  description: "Makine nakışı desenleri, işlemeli tekstiller ve kişiye özel nakış ürünleri.",
  robots: { index: storefrontCatalog.products.length > 0, follow: true },
};

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${cormorant.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-ivory font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
