import { z } from "zod";
import { json, route } from "@/server/http";
import { uploadEmbroideryFile } from "@/server/modules/admin-catalog/media";
import { getAdminProduct } from "@/server/modules/admin-catalog/products";
import { idParams } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "file:write" }, params: idParams }, async ({ params }) => (await getAdminProduct(params!.id)).files);

export const POST = route(
  {
    auth: { permission: "file:write" },
    params: idParams,
    maxBodyBytes: 21 * 1024 * 1024,
    body: z.strictObject({ file: z.instanceof(File, { message: "Dosya gerekli." }) }),
  },
  async ({ params, body, user, ip }) => {
    const r = await uploadEmbroideryFile(params!.id, body!.file, { id: user!.id, ip });
    return json(r, { status: r.duplicate ? 200 : 201 });
  }
);
