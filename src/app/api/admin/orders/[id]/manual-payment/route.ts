import { route } from "@/server/http";
import { AppError } from "@/server/errors";
import { recordManualPayment } from "@/server/modules/admin-orders/service";
import { manualPaymentBody, orderIdParams } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Documented exception: only Super Admin / Sipariş Yöneticisi, mandatory reference, audited. */
export const POST = route({ auth: { permission: "order:write" }, params: orderIdParams, body: manualPaymentBody }, async ({ params, body, user, ip }) => {
  if (!user!.roles.some((r) => r === "SUPER_ADMIN" || r === "ORDER_MANAGER")) throw new AppError("FORBIDDEN", "Manuel ödeme kaydı için yetkiniz yok.");
  return { order: await recordManualPayment(params.id, body!.reference, user!.id, ip) };
});
