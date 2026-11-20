import { route } from "@/server/http";
import { logout } from "@/server/modules/auth/service";

export const runtime = "nodejs";

export const POST = route({}, async () => {
  await logout();
  return { ok: true };
});
