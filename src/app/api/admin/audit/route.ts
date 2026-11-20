import { z } from "zod";
import { route } from "@/server/http";
import { listAuditLogs } from "@/server/modules/admin-orders/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.strictObject({
  action: z.string().trim().max(80).optional(), entity: z.string().trim().max(60).optional(), actor: z.string().trim().max(120).optional(),
  from: date.optional(), to: date.optional(),
  page: z.coerce.number().int().min(1).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export const GET = route({ auth: { permission: "audit:read" }, query }, async ({ query }) => listAuditLogs(query));
