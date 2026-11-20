import { route } from "@/server/http";
import { createTag, listTags } from "@/server/modules/admin-catalog/taxonomy";
import { tagSchema } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "product:read" } }, async () => listTags());

export const POST = route({ auth: { permission: "product:write" }, body: tagSchema }, async ({ body, user, ip }) => {
  const r = await createTag(body!, { id: user!.id, ip });
  return Response.json(r, { status: 201, headers: { "cache-control": "no-store" } });
});
