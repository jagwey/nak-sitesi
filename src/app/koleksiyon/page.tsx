import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogClient } from "@/components/catalog/CatalogClient";
import { parseFiltersFromParams } from "@/lib/search";
import { getAvailableEmbroideryOffers, getSuggestions, searchCatalog } from "@/server/modules/catalog";
import { DEFAULT_PAGE_SIZE } from "@/server/modules/search/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Koleksiyon ve Nakış Kataloğu",
  description:
    "PFAFF VP3 ve çoklu makine uyumlu dijital nakış dosyaları, işlemeli keten ev tekstilleri ve kişiselleştirilebilir ürünleri filtreleyerek keşfedin.",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function KoleksiyonPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseFiltersFromParams(sp);
  const rawPage = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [result, offers] = await Promise.all([
    searchCatalog(filters, { page, pageSize: DEFAULT_PAGE_SIZE, facets: true }),
    filters.tur === "physical" ? [] : getAvailableEmbroideryOffers(),
  ]);
  const emptySuggestions =
    result.total === 0 && filters.q.trim() ? await getSuggestions(filters.q, 6) : [];

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-6 pb-24 pt-[128px]">
          <p className="font-display text-[2rem] text-ink">Koleksiyon yükleniyor...</p>
        </div>
      }
    >
      <CatalogClient
        products={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        facets={result.facets!}
        emptySuggestions={emptySuggestions}
        offers={offers}
      />
    </Suspense>
  );
}
