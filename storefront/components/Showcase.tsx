"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { StorefrontProduct } from "../catalog";
import { CatalogGrid } from "./CatalogGrid";

const tabs = [
  { label: "Seçili ürünler", href: "/koleksiyon/", match: () => true },
  { label: "Dijital desenler", href: "/koleksiyon/?tur=dijital", match: (product: StorefrontProduct) => product.type === "digital" },
  { label: "İşlemeli ürünler", href: "/koleksiyon/?tur=fiziksel", match: (product: StorefrontProduct) => product.type === "physical" },
  { label: "Kişiselleştirilebilir", href: "/koleksiyon/?kisisellestirme=true", match: (product: StorefrontProduct) => product.personalizable },
];

export function Showcase({ products, demo }: { products: StorefrontProduct[]; demo: boolean }) {
  const [active, setActive] = useState(0);
  const tab = tabs[active];
  const selection = products.filter(tab.match).slice(0, 4);
  return (
    <section id="koleksiyon" className="scroll-mt-20 border-y border-hairline bg-linen/45" aria-labelledby="vitrin-baslik">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-hairline pb-4">
          <div>
            <h2 id="vitrin-baslik" className="font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-tight">
              Atölyeden seçilmiş parçalar
            </h2>
            {demo && <p className="mt-2 text-umber">Koleksiyondaki demo ürünler incelemeye açıktır.</p>}
          </div>
          <div role="group" aria-label="Vitrin kategorileri" className="flex flex-wrap gap-x-5">
            {tabs.map(({ label }, index) => (
              <button
                key={label}
                type="button"
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                className="min-h-11 border-b-2 border-transparent text-[0.9375rem] font-medium text-umber hover:text-ink aria-pressed:border-gold aria-pressed:text-ink"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-8">
          {selection.length > 0 ? <CatalogGrid products={selection} /> : <p>Bu kategoride henüz ürün yok.</p>}
        </div>
        <div className="mt-6 flex justify-end">
          <a href={tab.href} className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-medium text-cocoa underline-offset-4 hover:underline">
            Koleksiyonu incele <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
