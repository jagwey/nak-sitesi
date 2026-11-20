import { route } from "@/server/http";
import { orderNumberParams } from "@/server/modules/orders/schema";
import { cancelOrder, getUserOrder } from "@/server/modules/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner cancels their own UNPAID order. */
export const POST = route(
  { auth: "user", params: orderNumberParams, rateLimit: { name: "order-cancel", limit: 10, windowSec: 600 } },
  async ({ user, params, ip }) => {
    const o = await getUserOrder(user!.id, params.number);
    return { order: await cancelOrder(o.id, { userId: user!.id, ownerOnly: true }, ip) };
  }
);
