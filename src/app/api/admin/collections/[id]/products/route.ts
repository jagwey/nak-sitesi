import { route } from "@/server/http";
import { setCollectionProducts } from "@/server/modules/admin-catalog/taxonomy";
import { collectionProductsSchema, idParams } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Replaces the manual product picks; array order is the display order. */
export const PUT = route({ auth: { permission: "product:write" }, params: idParams, body: collectionProductsSchema }, async ({ params, body, user, ip }) =>
  setCollectionProducts(params!.id, body!.productIds, { id: user!.id, ip })
);
