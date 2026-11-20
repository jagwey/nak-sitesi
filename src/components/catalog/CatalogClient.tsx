"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Link2, Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { EXAMPLE_SEARCHES } from "@/data/site-content";
import {
  DEFAULT_FILTERS,
  parseFiltersFromParams,
  serializeFiltersToParams,
  type CatalogFilterState,
} from "@/lib/search";
import { useStore } from "@/lib/store";
import type { Product } from "@/data/products";
import type { Facets } from "@/server/modules/search/types";
import type { SearchSuggestion } from "@/lib/search";
import { FilterSidebar } from "./FilterSidebar";
import { ProductCard } from "./ProductCard";

interface CatalogClientProps {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  facets: Facets;
  emptySuggestions: SearchSuggestion[];
}

export function CatalogClient({ products, total, page, pageSize, facets, emptySuggestions }: CatalogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addRecentSearch } = useStore();

  const filters = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams]
  );

  const [searchInput, setSearchInput] = useState(filters.q);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  const sheetRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileFilterOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const opener = openBtnRef.current;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileFilterOpen(false);
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [mobileFilterOpen]);

  const updateFilters = useCallback(
    (patch: Partial<CatalogFilterState>) => {
      const next: CatalogFilterState = { ...filters, ...patch };
      const params = serializeFiltersToParams(next);
      const qs = params.toString();
      router.replace(qs ? `/koleksiyon?${qs}` : "/koleksiyon", { scroll: false });
    },
    [filters, router]
  );

  // Search is server-side now: wait for a pause in typing before navigating.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const scheduleSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const qs = serializeFiltersToParams({ ...filtersRef.current, q }).toString();
        router.replace(qs ? `/koleksiyon?${qs}` : "/koleksiyon", { scroll: false });
      }, 250);
    },
    [router]
  );
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const pageHref = (n: number) => {
    const params = serializeFiltersToParams(filters);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/koleksiyon?${qs}` : "/koleksiyon";
  };

  const resetFilters = useCallback(() => {
    setSearchInput("");
    router.replace("/koleksiyon", { scroll: false });
  }, [router]);

  const activeCategory = CATEGORIES.find((c) => c.slug === filters.kategori);

  const pageTitle = activeCategory
    ? activeCategory.name
    : filters.tur === "digital"
    ? "Dijital Nakış Desenleri"
    : filters.tur === "physical"
    ? "İşlemeli Fiziksel Ürünler"
    : filters.q
    ? `“${filters.q}” için ${total === 0 ? "sonuç yok" : `${total} sonuç`}`
    : "Tüm Koleksiyon";
  const crumbTitle = activeCategory
    ? activeCategory.name
    : filters.q
    ? "Arama sonuçları"
    : pageTitle;

  const pageDescription = activeCategory
    ? activeCategory.shortDescription
    : filters.tur === "digital"
    ? "PFAFF VP3 ve çoklu makine formatlarında hazırlanmış, kasnak ölçüsüne göre filtrelenebilir nakış dosyaları."
    : filters.tur === "physical"
    ? "Doğal Türk keteni, organik pamuk havlu ve ağır kanvas üzerine atölyemizde işlenen tekstil ürünleri."
    : "Makine nakışı dosyaları, işlemeli ev tekstilleri ve kişiselleştirilebilir atölye parçalarını format, kasnak veya kategoriye göre keşfedin.";

  // Build removable active filter controls
  const activeTokens: { label: string; clear: () => void }[] = [];
  if (filters.q) {
    activeTokens.push({
      label: `Arama: ${filters.q}`,
      clear: () => updateFilters({ q: "" }),
    });
  }
  if (filters.tur !== "all") {
    activeTokens.push({
      label: filters.tur === "digital" ? "Dijital dosya" : "Fiziksel ürün",
      clear: () => updateFilters({ tur: "all" }),
    });
  }
  if (activeCategory) {
    activeTokens.push({
      label: activeCategory.name,
      clear: () => updateFilters({ kategori: "" }),
    });
  }
  if (filters.format) {
    activeTokens.push({
      label: `Format: ${filters.format}`,
      clear: () => updateFilters({ format: "" }),
    });
  }
  if (filters.makine) {
    activeTokens.push({
      label: `Makine: ${filters.makine}`,
      clear: () => updateFilters({ makine: "" }),
    });
  }
  if (filters.kasnak) {
    activeTokens.push({
      label: `Kasnak: ${filters.kasnak}`,
      clear: () => updateFilters({ kasnak: "" }),
    });
  }
  if (filters.olcu) {
    activeTokens.push({
      label: filters.olcu,
      clear: () => updateFilters({ olcu: "" }),
    });
  }
  if (filters.renkSayisi) {
    activeTokens.push({
      label: `Renk: ${filters.renkSayisi}`,
      clear: () => updateFilters({ renkSayisi: "" }),
    });
  }
  if (filters.kullanim) {
    activeTokens.push({
      label: filters.kullanim,
      clear: () => updateFilters({ kullanim: "" }),
    });
  }
  if (filters.lisans) {
    activeTokens.push({
      label: `Lisans: ${filters.lisans}`,
      clear: () => updateFilters({ lisans: "" }),
    });
  }
  if (filters.kisisellestirme) {
    activeTokens.push({
      label: "Kişiselleştirilebilir",
      clear: () => updateFilters({ kisisellestirme: false }),
    });
  }
  if (filters.stok) {
    activeTokens.push({
      label: "Stokta hazır",
      clear: () => updateFilters({ stok: false }),
    });
  }
  if (filters.minFiyat || filters.maxFiyat) {
    activeTokens.push({
      label: `Fiyat: ${filters.minFiyat || "0"}–${filters.maxFiyat || "∞"} ₺`,
      clear: () => updateFilters({ minFiyat: "", maxFiyat: "" }),
    });
  }

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2200);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      {/* Header & Inline Live Search */}
      <div className="border-b border-hairline pb-8">
        <nav aria-label="Sayfa yolu" className="mb-4 text-[0.875rem] text-umber">
          <Link href="/" className="hover:text-ink">
            Ana Sayfa
          </Link>
          <span className="mx-2 text-stone">/</span>
          <span className="text-ink">{crumbTitle}</span>
        </nav>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[62ch]">
            <h1 className="font-display text-[clamp(2.2rem,4vw,3.25rem)] leading-[1.06] text-ink">
              {pageTitle}
            </h1>
            <p className="mt-3 text-[1rem] text-umber">{pageDescription}</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addRecentSearch(searchInput);
              updateFilters({ q: searchInput });
            }}
            className="flex min-h-11 w-full max-w-[440px] items-center border-b border-hairline-strong focus-within:border-cocoa"
          >
            <Search className="mr-3 h-4 w-4 shrink-0 text-umber" strokeWidth={1.6} />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                scheduleSearch(e.target.value);
              }}
              placeholder="Örn: VP3 gül nakışı, PFAFF, 10x10, bebek ismi..."
              aria-label="Katalog içinde ara"
              className="w-full bg-transparent text-[0.9375rem] text-ink placeholder:text-stone focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  updateFilters({ q: "" });
                }}
                aria-label="Aramayı temizle"
                className="flex h-11 w-11 items-center justify-center text-stone hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        {/* Example quick search controls */}
        <div className="mt-5">
          <p className="mb-2 text-[0.875rem] text-umber">Hızlı aramalar</p>
          <ul className="flex flex-wrap gap-2">
            {EXAMPLE_SEARCHES.slice(0, 6).map((term) => {
              const active = filters.q.trim().toLowerCase() === term.toLowerCase();
              return (
                <li key={term}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      if (active) {
                        setSearchInput("");
                        updateFilters({ q: "" });
                        return;
                      }
                      setSearchInput(term);
                      addRecentSearch(term);
                      updateFilters({ q: term });
                    }}
                    className={`inline-flex min-h-11 items-center rounded-full border px-4 text-[0.875rem] transition-colors duration-200 ${
                      active
                        ? "border-cocoa bg-cocoa text-[#FAF8F3]"
                        : "border-hairline-strong bg-transparent text-ink hover:border-cocoa hover:bg-linen/60"
                    }`}
                  >
                    {term}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Controls Bar (Mobile filter button, Result count, Share link, Sort) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            ref={openBtnRef}
            onClick={() => setMobileFilterOpen(true)}
            className="inline-flex h-11 items-center gap-2 border border-cocoa px-4 text-[0.875rem] font-medium text-cocoa transition-colors duration-200 hover:bg-cocoa hover:text-[#FAF8F3] lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.6} />
            Filtrele
            <span className="tabular-nums">({activeTokens.length})</span>
          </button>

          <p className="text-[0.875rem] text-umber">
            <span className="tabular-nums font-medium text-ink">
              {total}
            </span>{" "}
            ürün gösteriliyor{" "}
            <span className="text-stone">(Demo katalog)</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          {activeTokens.length > 0 && (
            <button
              type="button"
              onClick={copyShareUrl}
              className="hidden min-h-11 items-center gap-1.5 text-[0.875rem] text-umber transition-colors duration-200 hover:text-ink sm:inline-flex"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-4 w-4 text-gold-text" />
                  Bağlantı kopyalandı
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Filtreyi paylaş
                </>
              )}
            </button>
          )}

          <label htmlFor="catalog-sort" className="inline-flex items-center gap-2 text-[0.875rem] text-umber">
            <span>Sırala:</span>
            <select
              id="catalog-sort"
              value={filters.sirala}
              onChange={(e) =>
                updateFilters({
                  sirala: e.target.value as CatalogFilterState["sirala"],
                })
              }
              className="h-11 max-w-[11rem] border border-hairline bg-surface px-3 text-[0.875rem] text-ink focus:border-cocoa focus:outline-none sm:max-w-none"
            >
              <option value="onerilen">Önerilen sıra</option>
              <option value="yeni">Yeni eklenenler</option>
              <option value="fiyat-artan">Fiyat: Düşükten yükseğe</option>
              <option value="fiyat-azalan">Fiyat: Yüksekten düşüğe</option>
            </select>
          </label>
        </div>
      </div>

      {/* Active Removable Filter Controls */}
      {activeTokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-4">
          {activeTokens.map((token) => (
            <button
              key={token.label}
              type="button"
              onClick={token.clear}
              aria-label={`${token.label} filtresini kaldır`}
              className="inline-flex min-h-11 items-center gap-1.5 border border-hairline-strong bg-linen/70 px-3 text-[0.875rem] text-ink transition-colors duration-200 hover:border-cocoa"
            >
              <span>{token.label}</span>
              <X className="h-3.5 w-3.5 text-umber" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={resetFilters}
            className="ml-1 inline-flex min-h-11 items-center px-2 text-[0.875rem] font-medium text-gold-text underline-offset-4 hover:underline"
          >
            Tümünü temizle
          </button>
        </div>
      )}

      {/* Main Split: Desktop Sticky Filter Sidebar + Product Grid */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-[96px] max-h-[calc(100vh-116px)] overflow-y-auto pr-4">
            <FilterSidebar
              facets={facets}
              filters={filters}
              onChange={updateFilters}
              onReset={resetFilters}
            />
          </div>
        </aside>

        <section aria-label="Ürün listesi" className="lg:col-span-9">
          {total > 0 ? (
            <>
              <div className="grid auto-rows-fr grid-cols-2 gap-x-4 gap-y-10 sm:auto-rows-auto sm:gap-x-6 md:grid-cols-3">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={index < 3}
                  />
                ))}
              </div>
              {total > pageSize && (
                <nav aria-label="Sayfalar" className="mt-12 flex items-center justify-between border-t border-hairline pt-6 text-[0.9375rem]">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)} rel="prev" className="min-h-11 py-2 font-medium text-cocoa underline-offset-4 hover:text-gold-text hover:underline">
                      Önceki
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="tabular-nums text-umber">
                    Sayfa {page} / {Math.ceil(total / pageSize)}
                  </span>
                  {page * pageSize < total ? (
                    <Link href={pageHref(page + 1)} rel="next" className="min-h-11 py-2 font-medium text-cocoa underline-offset-4 hover:text-gold-text hover:underline">
                      Sonraki
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          ) : (
            <div className="border border-hairline bg-surface px-5 py-10 sm:px-8 sm:py-14">
              <h2 className="font-display text-[1.75rem] leading-tight text-ink">
                {filters.q
                  ? `“${filters.q}” için sonuç bulunamadı.`
                  : "Seçtiğiniz filtrelere uyan ürün bulunamadı."}
              </h2>
              <p className="mt-2 max-w-[54ch] text-[1rem] text-umber">
                Bazı filtreleri kaldırabilir, aramayı sadeleştirebilir veya aşağıdaki önerilere göz atabilirsiniz. Aradığınız ölçü ya da makine formatı için atölyeden özel dijitalleştirme de talep edebilirsiniz.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-11 items-center bg-cocoa px-6 text-[0.875rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
                >
                  Filtreleri temizle
                </button>
                <Link
                  href="/kisiye-ozel"
                  className="inline-flex h-11 items-center border border-cocoa px-6 text-[0.875rem] font-medium text-cocoa transition-colors duration-200 hover:bg-cocoa hover:text-[#FAF8F3]"
                >
                  Özel tasarım talep et
                </Link>
              </div>
              <div className="mt-8 border-t border-hairline pt-6">
                <p className="mb-3 text-[0.875rem] font-medium text-umber">Bunları deneyin</p>
                <ul className="flex flex-wrap gap-2">
                  {[
                    ...emptySuggestions.map((sg) => ({ label: sg.label, href: sg.href })),
                    ...(emptySuggestions.length === 0
                      ? EXAMPLE_SEARCHES.slice(0, 4).map((t) => ({
                          label: t,
                          href: `/koleksiyon?q=${encodeURIComponent(t)}`,
                        }))
                      : []),
                    ...CATEGORIES.slice(0, 4).map((c) => ({
                      label: c.name,
                      href: `/koleksiyon?kategori=${c.slug}`,
                    })),
                  ].map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="inline-flex min-h-11 items-center rounded-full border border-hairline-strong px-4 text-[0.875rem] text-ink transition-colors duration-200 hover:border-cocoa hover:bg-linen/60"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mobile full-height filter sheet */}
      {mobileFilterOpen && (
        <div
          ref={sheetRef}
          className="fixed inset-0 z-50 flex flex-col bg-ivory lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filtre paneli"
        >
          <div className="flex items-center justify-between border-b border-hairline px-5 py-2">
            <h2 className="font-display text-[1.5rem] text-ink">Filtreler</h2>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              aria-label="Filtre panelini kapat"
              className="flex h-11 w-11 items-center justify-center text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <FilterSidebar
              facets={facets}
              filters={filters}
              onChange={updateFilters}
              onReset={resetFilters}
            />
          </div>
          <div className="sticky bottom-0 border-t border-hairline bg-surface p-4">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="tabular-nums h-12 w-full bg-cocoa text-[0.9375rem] font-medium text-[#FAF8F3]"
            >
              Sonuçları göster ({total})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
