import { route } from "@/server/http";
import { parseFiltersFromParams } from "@/lib/search";
import { productListQuery } from "@/server/modules/catalog/schema";
import { searchCatalog } from "@/server/modules/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "none", query: productListQuery, rateLimit: { name: "catalog", limit: 120, windowSec: 60 } }, async ({ query }) => {
  const { page, pageSize, facets, ...rest } = query;
  const filters = parseFiltersFromParams(rest as Record<string, string | undefined>);
  const res = await searchCatalog(filters, { page, pageSize, facets: facets !== "false" });
  return { items: res.items, total: res.total, page: res.page, pageSize: res.pageSize, facets: res.facets };
});
