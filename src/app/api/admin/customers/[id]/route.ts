import { route } from "@/server/http";
import { getCustomer } from "@/server/modules/admin-orders/customers";
import { orderIdParams } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "customer:read" }, params: orderIdParams }, async ({ params }) => ({ customer: await getCustomer(params.id) }));
