import { json, route } from "@/server/http";
import { createCategory, listCategories } from "@/server/modules/admin-catalog/taxonomy";
import { categorySchema } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "product:read" } }, async () => listCategories());

export const POST = route({ auth: { permission: "product:write" }, body: categorySchema }, async ({ body, user, ip }) => {
  const r = await createCategory(body!, { id: user!.id, ip });
  return json(r, { status: 201 });
});
