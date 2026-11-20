"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Product } from "@/data/products";
import { calculateDiscountPercent, formatTRY } from "@/lib/format";
import { useStore } from "@/lib/store";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useStore();
  const fav = isFavorite(product.id);
  const secondImage = product.images[1];
  const discount = product.compareAtPriceKurus
    ? calculateDiscountPercent(product.compareAtPriceKurus, product.priceKurus)
    : 0;

  const isDigital = product.type === "digital";
  const typeLine = isDigital
    ? "Dijital dosya · indirilir"
    : "Fiziksel ürün · kargo";
  const formats = product.embroidery?.formats ?? [];
  const metaLine =
    isDigital && formats.length > 0
      ? `${formats.slice(0, 3).join(", ")}${formats.length > 3 ? ` +${formats.length - 3}` : ""}`
      : product.personalizable
      ? "Kişiselleştirilebilir"
      : "Atölye üretimi";

  return (
    <article className="group flex min-w-0 flex-col">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-linen">
        <Link
          href={`/urun/${product.slug}`}
          className="block h-full w-full"
          aria-label={product.name}
        >
          <Image
            src={product.images[0].url}
            alt={product.images[0].alt}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.025]"
          />
          {secondImage && (
            <Image
              src={secondImage.url}
              alt={secondImage.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
            />
          )}
        </Link>

        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-label={
            fav
              ? `${product.name} ürününü favorilerden çıkar`
              : `${product.name} ürününü favorilere ekle`
          }
          aria-pressed={fav}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center bg-ivory/88 text-ink backdrop-blur-[2px] transition-[background-color,color,transform] duration-200 hover:bg-ivory hover:text-gold-text active:scale-95"
        >
          <Heart
            className={`h-[18px] w-[18px] ${
              fav ? "fill-cocoa text-cocoa" : "text-ink"
            }`}
            strokeWidth={1.6}
          />
        </button>
      </div>

      <div className="mt-3.5 flex flex-1 flex-col justify-between gap-1.5">
        <div>
          <h3 className="line-clamp-2 min-h-[2lh] break-words font-display text-[1.2rem] leading-snug text-ink sm:line-clamp-none sm:min-h-0">
            <Link
              href={`/urun/${product.slug}`}
              className="transition-colors duration-200 hover:text-gold-text"
            >
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 truncate text-[0.8125rem] font-medium text-cocoa sm:text-[0.875rem]">{typeLine}</p>
          <p className="mt-0.5 truncate text-[0.8125rem] text-umber">{metaLine}</p>
        </div>

        <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="tabular-nums text-[0.9375rem] font-medium text-ink">
            {formatTRY(product.priceKurus)}
          </span>
          {product.compareAtPriceKurus && discount > 0 && (
            <>
              <span className="tabular-nums text-[0.875rem] text-stone line-through">
                {formatTRY(product.compareAtPriceKurus)}
              </span>
              <span className="tabular-nums text-[0.875rem] font-medium text-gold-text">
                %{discount} indirim
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
