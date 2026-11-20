import { z } from "zod";
import { route } from "@/server/http";
import { resetEntitlement } from "@/server/modules/admin-orders/downloads";
import { orderIdParams } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({ auth: { permission: "order:write" }, params: orderIdParams, body: z.strictObject({}) }, async ({ params, user, ip }) => resetEntitlement(params.id, user!.id, ip));
