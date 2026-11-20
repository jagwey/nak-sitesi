"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { useProductsByIds } from "@/lib/useProductsByIds";
import { formatTRY } from "@/lib/format";
import { useStore } from "@/lib/store";

export function FavoritesDrawer() {
  const {
    favorites,
    favoritesOpen,
    setFavoritesOpen,
    toggleFavorite,
    quickAddProduct,
  } = useStore();

  const { products: loaded } = useProductsByIds(favoritesOpen ? favorites : []);

  useEffect(() => {
    if (!favoritesOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFavoritesOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [favoritesOpen, setFavoritesOpen]);

  if (!favoritesOpen) return null;

  const favoriteProducts = loaded.filter((p) => favorites.includes(p.id));

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/35 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Favori ürünleriniz"
      onClick={(e) => {
        if (e.target === e.currentTarget) setFavoritesOpen(false);
      }}
    >
      <div className="flex h-full w-full max-w-[440px] flex-col bg-ivory">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
          <h2 className="font-display text-[1.65rem] leading-none text-ink">
            Favorileriniz
          </h2>
          <button
            type="button"
            onClick={() => setFavoritesOpen(false)}
            aria-label="Favorileri kapat"
            className="flex h-10 w-10 items-center justify-center text-ink transition-colors duration-200 hover:text-gold-text"
          >
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {favoriteProducts.length === 0 ? (
            <div className="flex h-full flex-col items-start justify-center py-12">
              <p className="font-display text-[1.65rem] text-ink">
                Henüz kayıtlı favoriniz yok.
              </p>
              <p className="mt-2 max-w-[32ch] text-[0.9375rem] text-umber">
                Beğendiğiniz nakış desenlerini ve tekstil ürünlerini kalp simgesiyle kaydedip daha sonra kolayca sepete ekleyebilirsiniz.
              </p>
              <Link
                href="/koleksiyon"
                onClick={() => setFavoritesOpen(false)}
                className="mt-6 inline-flex h-11 items-center bg-cocoa px-6 text-[0.875rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
              >
                Ürünleri İncele
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {favoriteProducts.map((product) => (
                <li key={product.id} className="flex gap-4 py-5 first:pt-0">
                  <Link
                    href={`/urun/${product.slug}`}
                    onClick={() => setFavoritesOpen(false)}
                    className="relative h-24 w-[76px] shrink-0 overflow-hidden bg-linen"
                  >
                    <Image
                      src={product.images[0].url}
                      alt={product.images[0].alt}
                      fill
                      sizes="76px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/urun/${product.slug}`}
                          onClick={() => setFavoritesOpen(false)}
                          className="font-display text-[1.15rem] leading-snug text-ink hover:text-gold-text"
                        >
                          {product.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(product.id)}
                          aria-label="Favoriden çıkar"
                          className="p-1 text-stone hover:text-ink"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="tabular-nums mt-1 text-[0.875rem] font-medium text-ink">
                        {formatTRY(product.priceKurus)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFavoritesOpen(false);
                        quickAddProduct(product);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 self-start text-[0.875rem] font-medium text-gold-text transition-colors duration-200 hover:text-cocoa"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Sepete Ekle
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {favoriteProducts.length > 0 && (
          <div className="border-t border-hairline px-6 py-4">
            <Link
              href="/favoriler"
              onClick={() => setFavoritesOpen(false)}
              className="flex h-11 w-full items-center justify-center border border-cocoa text-[0.875rem] font-medium text-cocoa transition-colors duration-200 hover:bg-cocoa hover:text-[#FAF8F3]"
            >
              Tüm Favoriler Sayfasını Aç
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
