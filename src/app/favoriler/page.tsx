"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useProductsByIds } from "@/lib/useProductsByIds";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/catalog/ProductCard";

export default function FavorilerPage() {
  const { favorites, quickAddProduct } = useStore();
  const { products: loaded } = useProductsByIds(favorites);
  const favoriteProducts = loaded.filter((p) => favorites.includes(p.id));

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      <div className="border-b border-hairline pb-7">
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.2rem)] leading-tight text-ink">
          Favorilerim
        </h1>
        <p className="mt-2 text-[1rem] text-umber">
          Beğendiğiniz nakış desenlerini ve atölye ürünlerini karşılaştırın, dilediğinizde tek tıkla sepetinize aktarın.
        </p>
      </div>

      {favoriteProducts.length === 0 ? (
        <div className="py-16">
          <p className="font-display text-[1.85rem] text-ink">
            Listenizde henüz kayıtlı ürün yok.
          </p>
          <p className="mt-2 max-w-[46ch] text-[1rem] text-umber">
            Koleksiyonda gezinirken ürünlerin sağ üst köşesindeki kalp simgesine dokunarak favorilerinize ekleyebilirsiniz.
          </p>
          <Link
            href="/koleksiyon"
            className="mt-6 inline-flex h-12 items-center bg-cocoa px-7 text-[0.9375rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
          >
            Koleksiyonu Keşfet
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
          {favoriteProducts.map((product) => (
            <div key={product.id} className="flex flex-col">
              <ProductCard product={product} />
              <button
                type="button"
                onClick={() => quickAddProduct(product)}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 border border-cocoa text-[0.875rem] font-medium text-cocoa transition-colors duration-200 hover:bg-cocoa hover:text-[#FAF8F3]"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Sepete Ekle
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
