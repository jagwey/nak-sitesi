import { route } from "@/server/http";
import { deleteCategory, updateCategory } from "@/server/modules/admin-catalog/taxonomy";
import { categorySchema, idParams } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PUT = route({ auth: { permission: "product:write" }, params: idParams, body: categorySchema }, async ({ params, body, user, ip }) =>
  updateCategory(params!.id, body!, { id: user!.id, ip })
);

export const DELETE = route({ auth: { permission: "product:write" }, params: idParams }, async ({ params, user, ip }) =>
  deleteCategory(params!.id, { id: user!.id, ip })
);
