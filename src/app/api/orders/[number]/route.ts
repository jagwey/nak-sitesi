import { route } from "@/server/http";
import { orderNumberParams, orderLookupQuery } from "@/server/modules/orders/schema";
import { getGuestOrder, getUserOrder } from "@/server/modules/orders/service";
import { AppError } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Signed-in owner, or a guest with the one-time access token returned at checkout. Anything else is a 404. */
export const GET = route(
  { auth: "optional", params: orderNumberParams, query: orderLookupQuery, rateLimit: { name: "order-lookup", limit: 30, windowSec: 600 } },
  async ({ user, params, query }) => {
    if (user) {
      try {
        return { order: await getUserOrder(user.id, params.number) };
      } catch (e) {
        if (!query.guestToken) throw e;
      }
    }
    if (!query.guestToken) throw new AppError("NOT_FOUND", "Sipariş bulunamadı.");
    return { order: await getGuestOrder(params.number, query.guestToken) };
  }
);
