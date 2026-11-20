import { route } from "@/server/http";
import { suggestQuery } from "@/server/modules/catalog/schema";
import { getSuggestions } from "@/server/modules/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "none", query: suggestQuery, rateLimit: { name: "suggest", limit: 120, windowSec: 60 } }, async ({ query }) => ({
  suggestions: await getSuggestions(query.q, query.limit),
}));
