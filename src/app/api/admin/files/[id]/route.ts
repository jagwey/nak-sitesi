import { route } from "@/server/http";
import { adminFileDownloadUrl, deleteDigitalFile } from "@/server/modules/admin-catalog/media";
import { idParams } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns a 120 second signed URL (audited). */
export const GET = route({ auth: { permission: "file:write" }, params: idParams }, async ({ params, user, ip }) =>
  adminFileDownloadUrl(params!.id, { id: user!.id, ip })
);

export const DELETE = route({ auth: { permission: "file:write" }, params: idParams }, async ({ params, user, ip }) =>
  deleteDigitalFile(params!.id, { id: user!.id, ip })
);
