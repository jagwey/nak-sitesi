import { route } from "@/server/http";
import { adminStatusBody, idParams } from "@/server/modules/custom-orders/schema";
import { adminSetCustomStatus } from "@/server/modules/custom-orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = route({ auth: { permission: "customorder:write" }, params: idParams, body: adminStatusBody }, async ({ params, body, user, ip }) => adminSetCustomStatus(params.id, body!.status, user!.id, ip));
