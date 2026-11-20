"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/data/products";
import { ProductCard } from "@/components/catalog/ProductCard";

type ShowcaseTab = "yeni" | "dijital" | "fiziksel" | "kisisel";

const TABS: { id: ShowcaseTab; label: string; href: string }[] = [
  { id: "yeni", label: "Yeni Gelenler", href: "/koleksiyon?sirala=yeni" },
  { id: "dijital", label: "Dijital Nakış Desenleri", href: "/koleksiyon?tur=dijital" },
  { id: "fiziksel", label: "İşlemeli Fiziksel Ürünler", href: "/koleksiyon?tur=fiziksel" },
  {
    id: "kisisel",
    label: "Kişiselleştirilebilir",
    href: "/koleksiyon?kisisellestirme=true",
  },
];

export function HomeShowcaseTabs({
  tabs,
}: {
  tabs: { new: Product[]; digital: Product[]; physical: Product[]; personalizable: Product[] };
}) {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("yeni");

  const products =
    activeTab === "yeni"
      ? tabs.new
      : activeTab === "dijital"
      ? tabs.digital
      : activeTab === "fiziksel"
      ? tabs.physical
      : tabs.personalizable;

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <section
      aria-labelledby="vitrin-baslik"
      className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-10 lg:py-24"
    >
      <div className="flex flex-col gap-6 border-b border-hairline pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2
            id="vitrin-baslik"
            className="font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-[1.08] text-ink"
          >
            Atölyeden seçilmiş parçalar
          </h2>
          <p className="mt-2 max-w-[54ch] text-[1rem] text-umber">
            Özgün makine nakışı desenlerini dikiş önizlemeleri ve dosya formatlarıyla keşfedin.
          </p>
        </div>

        {/* Non-button underline tab switcher */}
        <div
          role="tablist"
          aria-label="Vitrin kategorileri"
          className="flex flex-wrap gap-x-6 gap-y-2"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] border-b-2 pb-2 text-[0.9375rem] font-medium transition-[border-color,color] duration-200 ${
                  active
                    ? "border-gold text-ink"
                    : "border-transparent text-umber hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {products.length === 0 && (activeTab === "fiziksel" || activeTab === "kisisel") && (
        <div className="mt-8 text-[0.9375rem] text-umber">
          <p>İşlemeli tekstil için yüzey, ölçü ve adet bilgisiyle teklif isteyebilirsiniz.</p>
          <Link href="/kisiye-ozel" className="mt-2 inline-block font-medium text-cocoa underline">Kişiye özel teklif iste</Link>
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-10 flex justify-end">
        <Link
          href={currentTab.href}
          className="inline-flex items-center gap-2 text-[0.9375rem] font-medium text-cocoa underline-offset-4 transition-colors duration-200 hover:text-gold-text hover:underline"
        >
          {currentTab.label} bölümünün tamamını gör
          <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
        </Link>
      </div>
    </section>
  );
}
