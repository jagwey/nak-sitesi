import { route } from "@/server/http";
import { deleteTag, updateTag } from "@/server/modules/admin-catalog/taxonomy";
import { idParams, tagSchema } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PUT = route({ auth: { permission: "product:write" }, params: idParams, body: tagSchema }, async ({ params, body, user, ip }) =>
  updateTag(params!.id, body!, { id: user!.id, ip })
);

export const DELETE = route({ auth: { permission: "product:write" }, params: idParams }, async ({ params, user, ip }) =>
  deleteTag(params!.id, { id: user!.id, ip })
);
