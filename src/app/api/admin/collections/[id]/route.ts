import { route } from "@/server/http";
import { deleteCollection, getCollection, updateCollection } from "@/server/modules/admin-catalog/taxonomy";
import { collectionSchema, idParams } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "product:read" }, params: idParams }, async ({ params }) => getCollection(params!.id));

export const PUT = route({ auth: { permission: "product:write" }, params: idParams, body: collectionSchema }, async ({ params, body, user, ip }) =>
  updateCollection(params!.id, body!, { id: user!.id, ip })
);

export const DELETE = route({ auth: { permission: "product:write" }, params: idParams }, async ({ params, user, ip }) =>
  deleteCollection(params!.id, { id: user!.id, ip })
);
