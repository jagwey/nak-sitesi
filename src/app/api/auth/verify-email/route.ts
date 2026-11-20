import { route } from "@/server/http";
import { tokenBody } from "@/server/modules/auth/schema";
import { requestEmailVerification, verifyEmail } from "@/server/modules/auth/service";

export const runtime = "nodejs";

/** POST { token } verifies the address. */
export const POST = route({ body: tokenBody, rateLimit: { name: "verify-email:ip", limit: 30, windowSec: 3600 } }, async ({ body }) => {
  await verifyEmail(body.token);
  return { ok: true };
});

/** PUT (signed in) re-sends the verification e-mail. */
export const PUT = route({ auth: "user" }, async ({ user, ip }) => {
  await requestEmailVerification(user!.id, { ip });
  return { ok: true };
});
