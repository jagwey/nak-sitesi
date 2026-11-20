import { route } from "@/server/http";
import { relatedQuery, slugParams } from "@/server/modules/catalog/schema";
import { getRelatedProducts } from "@/server/modules/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "none", params: slugParams, query: relatedQuery }, async ({ params, query }) => ({
  items: await getRelatedProducts(params.slug, query.limit),
}));
