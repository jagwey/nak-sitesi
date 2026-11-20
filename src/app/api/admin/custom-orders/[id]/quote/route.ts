import { route } from "@/server/http";
import { idParams, quoteBody } from "@/server/modules/custom-orders/schema";
import { sendQuote } from "@/server/modules/custom-orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = route({ auth: { permission: "customorder:write" }, params: idParams, body: quoteBody }, async ({ params, body, user, ip }) => sendQuote(params.id, body!, user!.id, ip));
