import { z } from "zod";
import { route } from "@/server/http";
import { listDownloadLogs } from "@/server/modules/admin-orders/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.strictObject({
  userId: z.string().max(64).optional(), productId: z.string().max(64).optional(), from: date.optional(), to: date.optional(),
  page: z.coerce.number().int().min(1).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export const GET = route({ auth: { permission: "order:read" }, query }, async ({ query }) => listDownloadLogs(query));
