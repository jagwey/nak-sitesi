import { route } from "@/server/http";
import { runBulk } from "@/server/modules/admin-catalog/bulk";
import { bulkSchema } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({ auth: { permission: "product:write" }, body: bulkSchema }, async ({ body, user, ip }) => runBulk(body!, { id: user!.id, ip }));
