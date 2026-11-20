import { route } from "@/server/http";
import { orderNumberParams } from "@/server/modules/orders/schema";
import { getUserOrder } from "@/server/modules/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "user", params: orderNumberParams }, async ({ user, params }) => ({ order: await getUserOrder(user!.id, params.number) }));
