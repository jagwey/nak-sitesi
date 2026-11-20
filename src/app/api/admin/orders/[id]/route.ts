import { route } from "@/server/http";
import { getAdminOrder } from "@/server/modules/admin-orders/service";
import { orderIdParams } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "order:read" }, params: orderIdParams }, async ({ params }) => ({ order: await getAdminOrder(params.id) }));
