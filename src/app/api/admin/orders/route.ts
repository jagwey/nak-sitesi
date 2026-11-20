import { route } from "@/server/http";
import { listAdminOrders } from "@/server/modules/admin-orders/service";
import { orderListQuery } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "order:read" }, query: orderListQuery }, async ({ query }) => listAdminOrders(query));
