import { Suspense } from "react";
import type { Metadata } from "next";
import { storefrontProducts, storefrontCatalog } from "../../catalog";
import { CollectionBrowser } from "../../components/CollectionBrowser";
import { CatalogGrid } from "../../components/CatalogGrid";

export const metadata: Metadata = {
  title: "Koleksiyon",
  description: "Makine nakışı desenlerini ve işlemeli tekstilleri arayın ve kategorilere göre inceleyin.",
};

export default function CollectionPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      <div className="border-b border-hairline pb-8">
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.35rem)] leading-tight">Koleksiyon</h1>
        <p className="mt-3 text-umber">
          {storefrontCatalog.products.length === 0
            ? "Bu koleksiyondaki örnekler demo üründür. Satış henüz açılmadı."
            : "Makine nakışı desenlerini ve işlemeli tekstilleri keşfedin."}
        </p>
      </div>
      <Suspense fallback={null}>
        <CollectionBrowser products={storefrontProducts} />
      </Suspense>
      <noscript><div className="mt-8"><CatalogGrid products={storefrontProducts} /></div></noscript>
    </div>
  );
}
