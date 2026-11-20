"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, Search, X } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { EXAMPLE_SEARCHES } from "@/data/site-content";
import { formatTRY } from "@/lib/format";
import type { SearchSuggestion } from "@/lib/search";
import type { Product } from "@/data/products";
import { useStore } from "@/lib/store";

export function SearchOverlay() {
  const router = useRouter();
  const {
    searchOpen,
    setSearchOpen,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  } = useStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchOpen, setSearchOpen]);

  const [activeIndex, setActiveIndex] = useState(-1);

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [productsBySlug, setProductsBySlug] = useState<Map<string, Product>>(new Map());

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setTotalResults(0);
      setProductsBySlug(new Map());
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const enc = encodeURIComponent(q);
        const [sRes, pRes] = await Promise.all([
          fetch(`/api/search/suggest?q=${enc}&limit=10`, { signal: ctrl.signal }),
          fetch(`/api/products?q=${enc}&pageSize=12&facets=false`, { signal: ctrl.signal }),
        ]);
        if (sRes.ok) {
          const d = (await sRes.json()) as { suggestions: SearchSuggestion[] };
          setSuggestions(d.suggestions);
        }
        if (pRes.ok) {
          const d = (await pRes.json()) as { items: Product[]; total: number };
          setTotalResults(d.total);
          setProductsBySlug(new Map(d.items.map((p) => [p.slug, p])));
        }
      } catch {
        /* aborted or offline: keep previous results */
      }
    }, 200);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const groups = useMemo(() => {
    const defs: { kind: SearchSuggestion["kind"]; title: string }[] = [
      { kind: "kategori", title: "Kategori" },
      { kind: "filtre", title: "Filtre" },
      { kind: "urun", title: "Ürün" },
    ];
    return defs
      .map((d) => ({ ...d, items: suggestions.filter((sg) => sg.kind === d.kind) }))
      .filter((g) => g.items.length > 0);
  }, [suggestions]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  if (!searchOpen) return null;

  const submitSearch = (term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    addRecentSearch(cleaned);
    setSearchOpen(false);
    router.push(`/koleksiyon?q=${encodeURIComponent(cleaned)}`);
  };

  const goTo = (href: string) => {
    addRecentSearch(query);
    setSearchOpen(false);
    router.push(href);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && flat[activeIndex]) {
      e.preventDefault();
      goTo(flat[activeIndex].href);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ivory/98 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Mağazada ara"
    >
      <div className="border-b border-hairline transition-colors duration-200 focus-within:border-gold">
        <div className="mx-auto flex h-[84px] max-w-[1200px] items-center gap-4 px-4 sm:px-8">
          <Search className="h-5 w-5 shrink-0 text-umber" strokeWidth={1.6} aria-hidden="true" />
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(query);
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={onInputKeyDown}
              role="combobox"
              aria-expanded={flat.length > 0}
              aria-controls="search-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? `search-opt-${activeIndex}` : undefined}
              placeholder="Desen, VP3 formatı, kasnak ölçüsü (10x10) veya ürün adı yazın..."
              aria-label="Arama terimi"
              style={{ outline: "none" }}
              className="w-full bg-transparent text-[1.125rem] text-ink placeholder:text-stone focus:outline-none focus-visible:outline-none"
            />
          </form>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="min-h-11 px-2 text-[0.875rem] text-umber transition-colors duration-200 hover:text-ink"
            >
              Temizle
            </button>
          )}
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Aramayı kapat"
            className="flex h-11 w-11 items-center justify-center text-ink transition-colors duration-200 hover:text-gold-text"
          >
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
          {query.trim() ? (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 border-b border-hairline pb-3">
                <p className="text-[0.875rem] text-umber" aria-live="polite">
                  &ldquo;{query}&rdquo; için{" "}
                  <span className="tabular-nums font-medium text-ink">{totalResults}</span>{" "}
                  sonuç
                </p>
                <button
                  type="button"
                  onClick={() => submitSearch(query)}
                  className="inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] font-medium text-gold-text transition-colors duration-200 hover:text-cocoa"
                >
                  Tüm sonuçları gör
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {flat.length > 0 ? (
                <div id="search-suggestions" role="listbox" aria-label="Arama önerileri" className="space-y-6">
                  {groups.map((group) => (
                    <div key={group.kind} role="group" aria-label={group.title}>
                      <p className="mb-1 text-[0.875rem] font-medium text-umber">{group.title}</p>
                      <ul>
                        {group.items.map((sg) => {
                          const idx = flat.indexOf(sg);
                          const active = idx === activeIndex;
                          const product =
                            sg.kind === "urun"
                              ? productsBySlug.get(sg.href.replace("/urun/", ""))
                              : undefined;
                          return (
                            <li key={sg.href + sg.label} role="presentation">
                              <Link
                                id={`search-opt-${idx}`}
                                role="option"
                                aria-selected={active}
                                href={sg.href}
                                onClick={() => {
                                  addRecentSearch(query);
                                  setSearchOpen(false);
                                }}
                                onMouseEnter={() => setActiveIndex(idx)}
                                className={`flex min-h-11 items-center gap-4 border-b border-hairline px-2 py-2 transition-colors duration-200 ${
                                  active ? "bg-linen/70" : ""
                                }`}
                              >
                                {product && (
                                  <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-linen">
                                    <Image
                                      src={product.images[0].url}
                                      alt=""
                                      fill
                                      sizes="44px"
                                      className="object-cover"
                                    />
                                  </span>
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="block font-display text-[1.1rem] leading-snug text-ink">
                                    {sg.label}
                                  </span>
                                  {product && (
                                    <span className="block text-[0.8125rem] text-umber">
                                      {product.type === "digital"
                                        ? "Dijital dosya"
                                        : "Fiziksel ürün"}
                                    </span>
                                  )}
                                </span>
                                {product && (
                                  <span className="tabular-nums shrink-0 text-[0.9375rem] font-medium text-ink">
                                    {formatTRY(product.priceKurus)}
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12">
                  <p className="font-display text-[1.75rem] text-ink">
                    Doğrudan eşleşen ürün bulunamadı.
                  </p>
                  <p className="mt-2 max-w-[52ch] text-[1rem] text-umber">
                    Format adı (örneğin VP3, PES), kasnak ölçüsü (10x10) veya daha genel bir motif adı deneyebilir ya da kişiye özel desen talep edebilirsiniz.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link
                      href="/kisiye-ozel"
                      onClick={() => setSearchOpen(false)}
                      className="inline-flex h-11 items-center bg-cocoa px-6 text-[0.875rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
                    >
                      Kişiye Özel Desen Talep Et
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="space-y-8 lg:col-span-5">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[0.875rem] font-medium text-umber">
                        Son aramalarınız
                      </p>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-[0.875rem] text-stone transition-colors duration-200 hover:text-ink"
                      >
                        Temizle
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {recentSearches.map((term) => (
                        <li key={term}>
                          <button
                            type="button"
                            onClick={() => submitSearch(term)}
                            className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] text-ink transition-colors duration-200 hover:text-gold-text"
                          >
                            <Clock className="h-3.5 w-3.5 text-stone" aria-hidden="true" />
                            {term}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="mb-3 text-[0.875rem] font-medium text-umber">
                    Örnek aramalar
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_SEARCHES.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="min-h-11 rounded-full border border-hairline-strong px-4 text-[0.875rem] text-ink transition-[border-color,background-color] duration-200 hover:border-cocoa hover:bg-linen/60"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <p className="mb-4 text-[0.875rem] font-medium text-umber">
                  Kategorilerde gezinin
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/koleksiyon?kategori=${cat.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className="group space-y-2"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-linen">
                        <Image
                          src={cat.image}
                          alt={cat.imageAlt}
                          fill
                          sizes="160px"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                      <p className="text-[0.875rem] font-medium text-ink transition-colors duration-200 group-hover:text-gold-text">
                        {cat.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
