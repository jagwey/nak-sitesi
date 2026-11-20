import { route } from "@/server/http";
import { couponInput, createCoupon, listCoupons } from "@/server/modules/coupons/service";
import { writeAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "coupon:write" } }, async () => ({ coupons: await listCoupons() }));
export const POST = route({ auth: { permission: "coupon:write" }, body: couponInput }, async ({ body, user, ip }) => {
  const c = await createCoupon(body!);
  await writeAudit({ actorUserId: user!.id, action: "coupon.create", entity: "Coupon", entityId: c.id, diff: { code: c.code, type: c.type, value: c.value }, ip });
  return { coupon: c };
});
