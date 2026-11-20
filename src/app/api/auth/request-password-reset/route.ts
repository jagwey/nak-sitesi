import { route } from "@/server/http";
import { requestResetBody } from "@/server/modules/auth/schema";
import { requestPasswordReset } from "@/server/modules/auth/service";

export const runtime = "nodejs";

// Always the same response: never reveals whether the e-mail is registered.
export const POST = route({ body: requestResetBody }, async ({ body, ip }) => {
  await requestPasswordReset(body.email, { ip });
  return { ok: true };
});
