import { route, json } from "@/server/http";
import { registerBody } from "@/server/modules/auth/schema";
import { register } from "@/server/modules/auth/service";

export const runtime = "nodejs";

export const POST = route({ body: registerBody }, async ({ body, req, ip }) => {
  const user = await register(body, { ip, userAgent: req.headers.get("user-agent") });
  return json({ user }, { status: 201 });
});
