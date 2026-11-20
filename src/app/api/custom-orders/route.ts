import { route } from "@/server/http";
import { createCustomOrderBody } from "@/server/modules/custom-orders/schema";
import { createCustomOrder } from "@/server/modules/custom-orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = route({ auth: "optional", body: createCustomOrderBody, maxBodyBytes: 45 * 1024 * 1024 }, async ({ body, user, ip }) => {
  const r = await createCustomOrder(body!, user ? { id: user.id } : null, ip);
  return Response.json(r, { status: 201 });
});
