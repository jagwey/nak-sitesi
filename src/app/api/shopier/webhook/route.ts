import { route } from "@/server/http";
import { handleShopierWebhook } from "@/server/modules/payments/shopier-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

/** Shopier REST webhook. csrf:false; authenticity is Shopier-Signature over the raw body. */
export const POST = route(
  { auth: "none", csrf: false, rateLimit: { name: "shopier-webhook", limit: 120, windowSec: 60 } },
  async ({ req }) => {
    const rawBody = await req.text();
    const result = await handleShopierWebhook({
      rawBody,
      signature: req.headers.get("shopier-signature"),
      event: req.headers.get("shopier-event"),
    });
    return text(result.body, result.status);
  },
);
