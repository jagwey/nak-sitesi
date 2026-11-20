import { route } from "@/server/http";
import { getCartView } from "@/server/modules/cart/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "optional", rateLimit: { name: "cart-read", limit: 120, windowSec: 60 } }, async ({ user }) => ({
  cart: await getCartView({ userId: user?.id ?? null }, { email: user?.email }),
}));
