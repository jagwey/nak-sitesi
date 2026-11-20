import { z } from "zod";
import { route } from "@/server/http";
import { setCustomerStatus } from "@/server/modules/admin-orders/customers";
import { orderIdParams } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({ auth: { permission: "customer:write" }, params: orderIdParams, body: z.strictObject({ status: z.enum(["ACTIVE", "DISABLED"]) }) }, async ({ params, body, user, ip }) => ({
  customer: await setCustomerStatus(params.id, body!.status, user!.id, ip),
}));
