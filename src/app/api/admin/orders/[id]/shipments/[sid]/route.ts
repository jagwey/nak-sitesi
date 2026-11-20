import { route } from "@/server/http";
import { adminShipmentStatus } from "@/server/modules/admin-orders/service";
import { shipmentParams, shipmentStatusBody } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({ auth: { permission: "order:write" }, params: shipmentParams, body: shipmentStatusBody }, async ({ params, body, user, ip }) => ({
  order: await adminShipmentStatus(params.id, params.sid, body!.status, user!.id, ip),
}));
