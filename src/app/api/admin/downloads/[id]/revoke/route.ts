import { z } from "zod";
import { route } from "@/server/http";
import { revokeEntitlement } from "@/server/modules/admin-orders/downloads";
import { orderIdParams } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({ auth: { permission: "order:write" }, params: orderIdParams, body: z.strictObject({ reason: z.string().trim().min(3).max(200) }) }, async ({ params, body, user, ip }) =>
  revokeEntitlement(params.id, body!.reason, user!.id, ip)
);
