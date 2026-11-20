import { route } from "@/server/http";
import { couponBody } from "@/server/modules/cart/schema";
import { applyCartCoupon, removeCartCoupon } from "@/server/modules/cart/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(
  { auth: "optional", body: couponBody, rateLimit: { name: "cart-coupon", limit: 15, windowSec: 60 } },
  async ({ user, body }) => ({ cart: await applyCartCoupon({ userId: user?.id ?? null }, body.code, { email: user?.email }) })
);

export const DELETE = route({ auth: "optional", rateLimit: { name: "cart-coupon", limit: 15, windowSec: 60 } }, async ({ user }) => ({
  cart: await removeCartCoupon({ userId: user?.id ?? null }),
}));
