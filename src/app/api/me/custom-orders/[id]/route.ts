import { route } from "@/server/http";
import { decisionBody, idParams } from "@/server/modules/custom-orders/schema";
import { decideMyCustomOrder, getMyCustomOrder } from "@/server/modules/custom-orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = route({ auth: "user", params: idParams }, async ({ params, user }) => getMyCustomOrder(params.id, user!.id));
export const POST = route({ auth: "user", params: idParams, body: decisionBody }, async ({ params, body, user }) => decideMyCustomOrder(params.id, user!.id, body!.decision));
