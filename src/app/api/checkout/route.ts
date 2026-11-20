import { route, json } from "@/server/http";
import { checkoutBody } from "@/server/modules/orders/schema";
import { checkout } from "@/server/modules/orders/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(
  { auth: "optional", body: checkoutBody, rateLimit: { name: "checkout", limit: 10, windowSec: 600 } },
  async ({ user, body }) => json(await checkout(user ? { id: user.id, email: user.email, phone: user.phone } : null, body), { status: 201 })
);
