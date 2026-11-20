import { route } from "@/server/http";
import { adminSetStatus, getAdminOrder } from "@/server/modules/admin-orders/service";
import { orderIdParams, statusBody } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({ auth: { permission: "order:write" }, params: orderIdParams, body: statusBody }, async ({ params, body, user, ip }) => {
  await adminSetStatus(params.id, body!.status, user!.id, ip);
  return { order: await getAdminOrder(params.id) };
});
