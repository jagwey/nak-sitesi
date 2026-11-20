import { z } from "zod";
import { route } from "@/server/http";
import { adminRefund } from "@/server/modules/admin-orders/service";
import { orderIdParams } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({ auth: { permission: "order:write" }, params: orderIdParams, body: z.strictObject({}) }, async ({ params, user, ip }) => ({
  order: await adminRefund(params.id, user!.id, ip),
}));
