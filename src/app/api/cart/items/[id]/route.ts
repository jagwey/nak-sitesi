import { route } from "@/server/http";
import { itemParams, updateItemBody } from "@/server/modules/cart/schema";
import { removeItem, updateItemQuantity } from "@/server/modules/cart/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rl = { name: "cart-write", limit: 60, windowSec: 60 };

export const PATCH = route({ auth: "optional", params: itemParams, body: updateItemBody, rateLimit: rl }, async ({ user, params, body }) => ({
  cart: await updateItemQuantity({ userId: user?.id ?? null }, params.id, body.quantity),
}));

export const DELETE = route({ auth: "optional", params: itemParams, rateLimit: rl }, async ({ user, params }) => ({
  cart: await removeItem({ userId: user?.id ?? null }, params.id),
}));
