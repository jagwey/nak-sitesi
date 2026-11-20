import { z } from "zod";
import { route } from "@/server/http";
import { getProductsByIds } from "@/server/modules/catalog/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public product cards by id (ACTIVE only), used for guest/local favorites and recommendations. */
export const GET = route(
  {
    auth: "none",
    query: z.strictObject({ ids: z.string().max(1200).default("") }),
    rateLimit: { name: "fav-products", limit: 90, windowSec: 60 },
  },
  async ({ query }) => {
    const ids = [...new Set(query.ids.split(",").map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_-]{1,40}$/.test(s)))].slice(0, 40);
    return { items: await getProductsByIds(ids) };
  }
);
