import { route } from "@/server/http";
import { adminListQuery } from "@/server/modules/custom-orders/schema";
import { listAdminCustomOrders } from "@/server/modules/custom-orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = route({ auth: { permission: "customorder:read" }, query: adminListQuery }, async ({ query }) => listAdminCustomOrders(query));
