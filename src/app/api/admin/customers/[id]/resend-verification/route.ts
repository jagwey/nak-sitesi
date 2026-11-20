import { z } from "zod";
import { route } from "@/server/http";
import { resendVerification } from "@/server/modules/admin-orders/customers";
import { orderIdParams } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({ auth: { permission: "customer:write" }, params: orderIdParams, body: z.strictObject({}) }, async ({ params, user, ip }) => {
  await resendVerification(params.id, user!.id, ip);
  return { ok: true };
});
