import { route } from "@/server/http";
import { idParams } from "@/server/modules/custom-orders/schema";
import { getAdminCustomOrder } from "@/server/modules/custom-orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = route({ auth: { permission: "customorder:read" }, params: idParams }, async ({ params }) => getAdminCustomOrder(params.id));
