import { route } from "@/server/http";
import { slugParams } from "@/server/modules/catalog/schema";
import { getPublicProductBySlug } from "@/server/modules/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "none", params: slugParams }, async ({ params }) => ({
  product: await getPublicProductBySlug(params.slug),
}));
