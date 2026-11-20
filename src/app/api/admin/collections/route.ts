import { route } from "@/server/http";
import { createCollection, listCollections } from "@/server/modules/admin-catalog/taxonomy";
import { collectionSchema } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "product:read" } }, async () => listCollections());

export const POST = route({ auth: { permission: "product:write" }, body: collectionSchema }, async ({ body, user, ip }) => {
  const r = await createCollection(body!, { id: user!.id, ip });
  return Response.json(r, { status: 201, headers: { "cache-control": "no-store" } });
});
