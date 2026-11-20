import { route } from "@/server/http";
import { adminShip } from "@/server/modules/admin-orders/service";
import { orderIdParams, shipBody } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({ auth: { permission: "order:write" }, params: orderIdParams, body: shipBody }, async ({ params, body, user, ip }) => ({
  order: await adminShip(params.id, body!, user!.id, ip),
}));
