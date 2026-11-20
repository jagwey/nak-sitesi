import { route } from "@/server/http";
import { listUserOrders } from "@/server/modules/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "user" }, async ({ user }) => ({ orders: await listUserOrders(user!.id) }));
