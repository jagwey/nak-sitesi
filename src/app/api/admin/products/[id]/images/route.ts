import { z } from "zod";
import { json, route } from "@/server/http";
import { addProductImage, reorderProductImages } from "@/server/modules/admin-catalog/media";
import { idParams } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(
  {
    auth: { permission: "product:write" },
    params: idParams,
    maxBodyBytes: 10 * 1024 * 1024,
    body: z.strictObject({
      file: z.instanceof(File, { message: "Görsel dosyası gerekli." }),
      alt: z.string().trim().min(3, "Görsel açıklaması (alt metin) zorunlu.").max(200),
    }),
  },
  async ({ params, body, user, ip }) => {
    const img = await addProductImage(params!.id, body!.file, body!.alt, { id: user!.id, ip });
    return json(img, { status: 201 });
  }
);

/** Body: the complete new order of image ids; the first one is the cover. */
export const PUT = route(
  { auth: { permission: "product:write" }, params: idParams, body: z.strictObject({ ids: z.array(z.string().min(1).max(40)).min(1).max(12) }) },
  async ({ params, body, user, ip }) => reorderProductImages(params!.id, body!.ids, { id: user!.id, ip })
);
