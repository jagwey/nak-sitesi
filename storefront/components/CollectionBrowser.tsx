"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/data/categories";
import { filterAndSortProducts, parseFiltersFromParams } from "@/lib/search";
import type { StorefrontProduct } from "../catalog";
import { CatalogGrid } from "./CatalogGrid";

const fieldClass = "min-h-12 w-full border border-hairline-strong bg-white px-3 text-[0.9375rem] text-ink";

export function CollectionBrowser({ products }: { products: StorefrontProduct[] }) {
  const params = useSearchParams();
  const filters = parseFiltersFromParams(new URLSearchParams(params.toString()));
  const selection = filterAndSortProducts(products, filters);

  return (
    <>
      <form action="/koleksiyon/" method="get" role="search" className="mt-6 grid grid-cols-2 items-end gap-x-2 gap-y-3 sm:gap-x-3 xl:grid-cols-[2fr_1fr_1fr_auto_auto]">
        <label className="col-span-2 xl:col-span-1">
          <span className="mb-1 block text-sm font-medium">Ürün ara</span>
          <input type="search" name="q" maxLength={120} defaultValue={filters.q} placeholder="Örn. gül, havlu veya monogram" className={fieldClass} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Ürün türü</span>
          <select name="tur" defaultValue={filters.tur} className={fieldClass}>
            <option value="all">Tümü</option>
            <option value="digital">Dijital desenler</option>
            <option value="physical">İşlemeli ürünler</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Kategori</span>
          <select name="kategori" defaultValue={filters.kategori} className={fieldClass}>
            <option value="">Tüm kategoriler</option>
            {CATEGORIES.map(({ slug, name }) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        </label>
        <label className="flex min-h-12 items-center gap-2 text-sm">
          <input type="checkbox" name="kisisellestirme" value="true" defaultChecked={filters.kisisellestirme} className="size-4 shrink-0 accent-cocoa" />
          Kişiselleştirilebilir
        </label>
        <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 bg-cocoa px-6 font-medium text-ivory hover:bg-cocoa-hover">
          <Search className="size-4" aria-hidden="true" /> Uygula
        </button>
      </form>
      <div className="mb-6 mt-7 flex items-center justify-between gap-4 border-b border-hairline pb-2 text-sm">
        <p className="tabular-nums text-umber">{selection.length} ürün</p>
        {params.size > 0 && <a href="/koleksiyon/" className="inline-flex min-h-11 items-center font-medium text-cocoa underline underline-offset-4">Filtreleri temizle</a>}
      </div>
      {selection.length > 0
        ? <CatalogGrid products={selection} />
        : <p className="py-8 text-umber">Aramanıza uygun ürün bulunamadı.</p>}
    </>
  );
}
