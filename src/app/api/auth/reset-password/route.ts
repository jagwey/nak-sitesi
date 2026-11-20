import { route } from "@/server/http";
import { resetPasswordBody } from "@/server/modules/auth/schema";
import { resetPassword } from "@/server/modules/auth/service";

export const runtime = "nodejs";

export const POST = route({ body: resetPasswordBody }, async ({ body, ip }) => {
  await resetPassword(body.token, body.password, { ip });
  return { ok: true };
});
