import { z } from "zod";
import { route } from "@/server/http";
import { deleteProduct, getAdminProduct, updateProduct } from "@/server/modules/admin-catalog/products";
import { idParams, productUpdateSchema } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "product:read" }, params: idParams }, async ({ params }) => getAdminProduct(params!.id));

export const PATCH = route({ auth: { permission: "product:write" }, params: idParams, body: productUpdateSchema }, async ({ params, body, user, ip }) =>
  updateProduct(params!.id, body!, { id: user!.id, ip })
);

export const DELETE = route(
  { auth: { permission: "product:write" }, params: idParams, query: z.strictObject({ mode: z.enum(["archive", "hard"]).default("archive") }) },
  async ({ params, query, user, ip }) => deleteProduct(params!.id, query!.mode, { id: user!.id, ip })
);
