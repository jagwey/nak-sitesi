import { route, json } from "@/server/http";
import { addItemBody } from "@/server/modules/cart/schema";
import { addItem } from "@/server/modules/cart/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(
  { auth: "optional", body: addItemBody, rateLimit: { name: "cart-write", limit: 60, windowSec: 60 } },
  async ({ user, body }) => json({ cart: await addItem({ userId: user?.id ?? null }, body) }, { status: 201 })
);
