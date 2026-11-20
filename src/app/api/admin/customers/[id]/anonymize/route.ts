import { z } from "zod";
import { route } from "@/server/http";
import { AppError } from "@/server/errors";
import { anonymizeCustomer } from "@/server/modules/admin-orders/customers";
import { orderIdParams } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** KVKK erasure: Super Admin or Admin only; irreversible. */
export const POST = route({ auth: { permission: "customer:write" }, params: orderIdParams, body: z.strictObject({ confirm: z.literal(true) }) }, async ({ params, user, ip }) => {
  if (!user!.roles.some((r) => r === "SUPER_ADMIN" || r === "ADMIN")) throw new AppError("FORBIDDEN", "Anonimleştirme için yetkiniz yok.");
  return anonymizeCustomer(params.id, user!.id, ip);
});
