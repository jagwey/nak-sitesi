import { route } from "@/server/http";
import { AppError, isAppError } from "@/server/errors";
import { handleShopierOsb } from "@/server/modules/payments/shopier-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

async function readFields(req: Request): Promise<{ res?: string; hash?: string }> {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > 100_000) throw new AppError("PAYLOAD_TOO_LARGE");
  const type = (req.headers.get("content-type") ?? "").toLowerCase();
  if (type.includes("multipart/form-data")) {
    const form = await req.formData();
    const res = form.get("res");
    const hash = form.get("hash");
    return { res: typeof res === "string" ? res : undefined, hash: typeof hash === "string" ? hash : undefined };
  }
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 100_000) throw new AppError("PAYLOAD_TOO_LARGE");
  const params = new URLSearchParams(raw);
  return { res: params.get("res") ?? undefined, hash: params.get("hash") ?? undefined };
}

/** Shopier OSB callback. csrf:false because Shopier posts the form; authenticity is the HMAC. */
export const POST = route(
  { auth: "none", csrf: false, rateLimit: { name: "shopier-osb", limit: 120, windowSec: 60 } },
  async ({ req }) => {
    try {
      const result = await handleShopierOsb(await readFields(req));
      return text(result.body, result.status);
    } catch (err) {
      if (isAppError(err) && err.code === "PAYLOAD_TOO_LARGE") return text("bad request", 413);
      throw err;
    }
  },
);
