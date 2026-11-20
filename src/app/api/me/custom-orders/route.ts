import { route } from "@/server/http";
import { listMyCustomOrders } from "@/server/modules/custom-orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = route({ auth: "user" }, async ({ user }) => listMyCustomOrders(user!.id));
