import { z } from "zod";
import { route } from "@/server/http";
import { deleteProductImage, updateImageAlt } from "@/server/modules/admin-catalog/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const params = z.strictObject({ id: z.string().min(1).max(40), imageId: z.string().min(1).max(40) });

export const PATCH = route(
  { auth: { permission: "product:write" }, params, body: z.strictObject({ alt: z.string().trim().min(3, "Görsel açıklaması (alt metin) zorunlu.").max(200) }) },
  async ({ params, body, user, ip }) => updateImageAlt(params!.id, params!.imageId, body!.alt, { id: user!.id, ip })
);

export const DELETE = route({ auth: { permission: "product:write" }, params }, async ({ params, user, ip }) =>
  deleteProductImage(params!.id, params!.imageId, { id: user!.id, ip })
);
