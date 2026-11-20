import { route } from "@/server/http";
import { loginBody } from "@/server/modules/auth/schema";
import { login } from "@/server/modules/auth/service";
import { mergeGuestCart } from "@/server/modules/cart/service";

export const runtime = "nodejs";

export const POST = route({ body: loginBody }, async ({ body, req, ip }) => {
  const user = await login(body, { ip, userAgent: req.headers.get("user-agent") });
  // Fold the guest cart (tb_cart cookie) into the account cart; a merge failure must never block login.
  await mergeGuestCart(user.id).catch(() => undefined);
  return { user };
});
