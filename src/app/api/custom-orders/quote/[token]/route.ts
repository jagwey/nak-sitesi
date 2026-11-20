import { route } from "@/server/http";
import { decisionBody, tokenParams } from "@/server/modules/custom-orders/schema";
import { decideByToken, getByToken } from "@/server/modules/custom-orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = route({ auth: "none", params: tokenParams }, async ({ params, ip }) => getByToken(params.token, ip));
export const POST = route({ auth: "none", params: tokenParams, body: decisionBody }, async ({ params, body, ip }) => decideByToken(params.token, body!.decision, ip));
