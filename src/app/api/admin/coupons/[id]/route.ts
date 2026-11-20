import { route } from "@/server/http";
import { couponInput, deactivateCoupon, updateCoupon } from "@/server/modules/coupons/service";
import { orderIdParams } from "@/server/modules/admin-orders/schema";
import { writeAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = route({ auth: { permission: "coupon:write" }, params: orderIdParams, body: couponInput.partial() }, async ({ params, body, user, ip }) => {
  const c = await updateCoupon(params.id, body!);
  await writeAudit({ actorUserId: user!.id, action: "coupon.update", entity: "Coupon", entityId: c.id, diff: { fields: Object.keys(body!) }, ip });
  return { coupon: c };
});
export const DELETE = route({ auth: { permission: "coupon:write" }, params: orderIdParams }, async ({ params, user, ip }) => {
  const c = await deactivateCoupon(params.id);
  await writeAudit({ actorUserId: user!.id, action: "coupon.deactivate", entity: "Coupon", entityId: c.id, ip });
  return { coupon: c };
});
