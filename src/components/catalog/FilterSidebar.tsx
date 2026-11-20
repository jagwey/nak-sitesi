"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import {
  ALL_FORMATS,
  ALL_HOOP_SIZES,
  ALL_MACHINES,
  ALL_USAGE_AREAS,
  type EmbroideryFormat,
  type HoopSize,
  type LicenseType,
  type MachineBrand,
  type UsageArea,
} from "@/data/products";
import type { CatalogFilterState } from "@/lib/search";
import type { Facets } from "@/server/modules/search/types";

interface FilterSidebarProps {
  filters: CatalogFilterState;
  onChange: (patch: Partial<CatalogFilterState>) => void;
  onReset: () => void;
  /** Server-computed counts (each dimension ignores its own filter). */
  facets: Facets;
}

function FilterGroup({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-hairline py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between text-left text-[0.9375rem] font-medium text-ink"
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-umber transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={1.6}
        />
      </button>
      {open && <div className="mt-3.5">{children}</div>}
    </div>
  );
}

export function FilterSidebar({
  filters,
  onChange,
  onReset,
  facets,
}: FilterSidebarProps) {
  const counts = useMemo(() => {
    const m = (r: Record<string, number>) => new Map(Object.entries(r));
    return {
      tur: m(facets.tur),
      kategori: m(facets.kategori),
      format: m(facets.format),
      makine: m(facets.makine),
      kasnak: m(facets.kasnak),
    };
  }, [facets]);
  const rowClass = (count: number, selected: boolean) =>
    `flex min-h-11 cursor-pointer items-center gap-2.5 py-1 ${
      count === 0 && !selected ? "cursor-not-allowed opacity-50" : ""
    }`;
  return (
    <div className="text-[0.875rem]">
      {/* Product Type segmented selector */}
      <div className="border-b border-hairline pb-5">
        <p className="mb-3 text-[0.9375rem] font-medium text-ink">Ürün türü</p>
        <div
          role="radiogroup"
          aria-label="Ürün türü"
          className="grid grid-cols-3 border border-hairline"
        >
          {(
            [
              { value: "all", label: "Tümü" },
              { value: "digital", label: "Dijital" },
              { value: "physical", label: "Fiziksel" },
            ] as const
          ).map((opt) => {
            const active = filters.tur === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ tur: opt.value })}
                className={`h-11 text-[0.875rem] font-medium transition-colors duration-200 ${
                  active
                    ? "bg-cocoa text-[#FAF8F3]"
                    : "bg-transparent text-umber hover:bg-linen/60 hover:text-ink"
                }`}
              >
                {opt.label}{" "}
                <span className="tabular-nums text-[0.8125rem] opacity-75">
                  ({counts.tur.get(opt.value) ?? 0})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category */}
      <FilterGroup title="Kategori" defaultOpen>
        <ul>
          {[{ slug: "", name: "Tüm kategoriler" }, ...CATEGORIES].map((cat) => {
            const n = counts.kategori.get(cat.slug) ?? 0;
            const selected = filters.kategori === cat.slug;
            const disabled = n === 0 && !selected;
            return (
              <li key={cat.slug || "all"}>
                <label className={`${rowClass(n, selected)} ${selected ? "text-ink" : "text-umber hover:text-ink"}`}>
                  <input
                    type="radio"
                    name="kategori"
                    disabled={disabled}
                    checked={selected}
                    onChange={() => onChange({ kategori: cat.slug })}
                    className="h-4 w-4 accent-[#4A372C]"
                  />
                  <span className={`flex-1 ${selected ? "font-medium" : ""}`}>{cat.name}</span>
                  <span className="tabular-nums text-stone">{n}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      {/* Price Range */}
      <FilterGroup title="Fiyat aralığı (₺)" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-stone">En az</span>
            <input
              type="number"
              min={0}
              placeholder="100"
              value={filters.minFiyat}
              onChange={(e) => onChange({ minFiyat: e.target.value })}
              className="tabular-nums h-11 w-full border border-hairline bg-surface px-3 text-ink focus:border-cocoa focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-stone">En çok</span>
            <input
              type="number"
              min={0}
              placeholder="2000"
              value={filters.maxFiyat}
              onChange={(e) => onChange({ maxFiyat: e.target.value })}
              className="tabular-nums h-11 w-full border border-hairline bg-surface px-3 text-ink focus:border-cocoa focus:outline-none"
            />
          </label>
        </div>
      </FilterGroup>

      {/* Embroidery File Format */}
      <FilterGroup title="Nakış dosyası formatı" defaultOpen>
        <label className="sr-only" htmlFor="filter-format">
          Dosya formatı seçin
        </label>
        <select
          id="filter-format"
          value={filters.format}
          onChange={(e) =>
            onChange({ format: e.target.value as EmbroideryFormat | "" })
          }
          className="h-11 w-full border border-hairline bg-surface px-3 text-ink focus:border-cocoa focus:outline-none"
        >
          <option value="">Tüm formatlar</option>
          {ALL_FORMATS.map((fmt) => {
            const n = counts.format.get(fmt) ?? 0;
            return (
              <option key={fmt} value={fmt} disabled={n === 0 && filters.format !== fmt}>
                {fmt} ({n})
              </option>
            );
          })}
        </select>
      </FilterGroup>

      {/* Machine Brand */}
      <FilterGroup title="Makine markası" defaultOpen>
        <label className="sr-only" htmlFor="filter-machine">
          Makine markası seçin
        </label>
        <select
          id="filter-machine"
          value={filters.makine}
          onChange={(e) =>
            onChange({ makine: e.target.value as MachineBrand | "" })
          }
          className="h-11 w-full border border-hairline bg-surface px-3 text-ink focus:border-cocoa focus:outline-none"
        >
          <option value="">Tüm makineler</option>
          {ALL_MACHINES.map((brand) => {
            const n = counts.makine.get(brand) ?? 0;
            return (
              <option key={brand} value={brand} disabled={n === 0 && filters.makine !== brand}>
                {brand} ({n})
              </option>
            );
          })}
        </select>
      </FilterGroup>

      {/* Hoop Size: "fits my hoop" (rotation included) */}
      <FilterGroup title="Kasnağıma sığanlar" defaultOpen>
        <p className="mb-2 text-[0.8125rem] text-umber">
          Seçtiğiniz kasnağa sığan desenler (döndürme dahil)
        </p>
        <ul>
          {[{ v: "" as const, label: "Tümü" }, ...ALL_HOOP_SIZES.map((h) => ({ v: h as HoopSize, label: h as string }))].map((opt) => {
            const n = counts.kasnak.get(opt.v) ?? 0;
            const selected = filters.kasnak === opt.v;
            return (
              <li key={opt.v || "all"}>
                <label className={`${rowClass(n, selected)} ${selected ? "text-ink" : "text-umber hover:text-ink"}`}>
                  <input
                    type="radio"
                    name="kasnak"
                    disabled={n === 0 && !selected}
                    checked={selected}
                    onChange={() => onChange({ kasnak: opt.v })}
                    className="h-4 w-4 accent-[#4A372C]"
                  />
                  <span className={`flex-1 tabular-nums ${selected ? "font-medium" : ""}`}>{opt.label}</span>
                  <span className="tabular-nums text-stone">{n}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      {/* Pattern Size */}
      <FilterGroup title="Desen ölçüsü" defaultOpen={false}>
        <select
          aria-label="Desen ölçüsü"
          value={filters.olcu}
          onChange={(e) =>
            onChange({
              olcu: e.target.value as CatalogFilterState["olcu"],
            })
          }
          className="h-11 w-full border border-hairline bg-surface px-3 text-ink focus:border-cocoa focus:outline-none"
        >
          <option value="">Tüm ölçüler</option>
          <option value="Küçük (< 10 cm)">Küçük (10 cm altı)</option>
          <option value="Orta (10–18 cm)">Orta (10–18 cm)</option>
          <option value="Büyük (> 18 cm)">Büyük (18 cm üzeri)</option>
        </select>
      </FilterGroup>

      {/* Thread Color Count */}
      <FilterGroup title="İplik renk sayısı" defaultOpen={false}>
        <select
          aria-label="İplik renk sayısı"
          value={filters.renkSayisi}
          onChange={(e) =>
            onChange({
              renkSayisi: e.target.value as CatalogFilterState["renkSayisi"],
            })
          }
          className="h-11 w-full border border-hairline bg-surface px-3 text-ink focus:border-cocoa focus:outline-none"
        >
          <option value="">Fark etmez</option>
          <option value="1-3">1–3 renk (Sade)</option>
          <option value="4-6">4–6 renk (Detaylı)</option>
          <option value="7+">7 ve üzeri renk</option>
        </select>
      </FilterGroup>

      {/* Usage Area */}
      <FilterGroup title="Kullanım alanı" defaultOpen={false}>
        <select
          aria-label="Kullanım alanı"
          value={filters.kullanim}
          onChange={(e) =>
            onChange({ kullanim: e.target.value as UsageArea | "" })
          }
          className="h-11 w-full border border-hairline bg-surface px-3 text-ink focus:border-cocoa focus:outline-none"
        >
          <option value="">Tüm kullanım alanları</option>
          {ALL_USAGE_AREAS.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </FilterGroup>

      {/* License Type */}
      <FilterGroup title="Lisans türü" defaultOpen={false}>
        <select
          aria-label="Lisans türü"
          value={filters.lisans}
          onChange={(e) =>
            onChange({ lisans: e.target.value as LicenseType | "" })
          }
          className="h-11 w-full border border-hairline bg-surface px-3 text-ink focus:border-cocoa focus:outline-none"
        >
          <option value="">Tüm lisanslar</option>
          <option value="Kişisel Kullanım">Kişisel Kullanım</option>
          <option value="Küçük İşletme">Küçük İşletme</option>
        </select>
      </FilterGroup>

      {/* Personalization & Stock toggles */}
      <div className="border-b border-hairline py-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-ink">
          <input
            type="checkbox"
            checked={filters.kisisellestirme}
            onChange={(e) => onChange({ kisisellestirme: e.target.checked })}
            className="h-4 w-4 accent-[#4A372C]"
          />
          <span>Yalnızca kişiselleştirilebilir ürünler</span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-ink">
          <input
            type="checkbox"
            checked={filters.stok}
            onChange={(e) => onChange({ stok: e.target.checked })}
            className="h-4 w-4 accent-[#4A372C]"
          />
          <span>Yalnızca stokta ve hazır ürünler</span>
        </label>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 min-h-11 w-full border border-hairline py-2.5 text-[0.875rem] font-medium text-umber transition-colors duration-200 hover:border-cocoa hover:text-ink"
      >
        Tüm filtreleri sıfırla
      </button>
    </div>
  );
}
