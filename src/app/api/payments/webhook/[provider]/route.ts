import { z } from "zod";
import { route, json } from "@/server/http";
import { processWebhook } from "@/server/modules/payments/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Provider -> us. No cookies/CSRF: authenticity comes from the signature over the RAW body. */
export const POST = route(
  { auth: "none", csrf: false, params: z.strictObject({ provider: z.string().min(1).max(30) }), rateLimit: { name: "pay-webhook", limit: 300, windowSec: 60 } },
  async ({ req, params }) => {
    const raw = await req.text();
    if (raw.length > 100_000) return json({ error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413 });
    const r = await processWebhook(params.provider, raw, req.headers.get("x-signature"));
    return json({ ok: true, outcome: r.outcome });
  }
);
