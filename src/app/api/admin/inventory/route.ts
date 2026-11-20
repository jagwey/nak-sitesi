import { route } from "@/server/http";
import { adjustStock, listStock } from "@/server/modules/admin-catalog/inventory";
import { inventoryListQuery, inventoryUpdateSchema } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "product:read" }, query: inventoryListQuery }, async ({ query }) => listStock(query!));

/** Absolute onHand set with a mandatory reason (audited). */
export const PUT = route({ auth: { permission: "product:write" }, body: inventoryUpdateSchema }, async ({ body, user, ip }) =>
  adjustStock(body!, { id: user!.id, ip })
);
