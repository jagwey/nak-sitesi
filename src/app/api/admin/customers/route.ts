import { z } from "zod";
import { route } from "@/server/http";
import { listCustomers } from "@/server/modules/admin-orders/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const query = z.strictObject({ search: z.string().trim().max(120).optional(), page: z.coerce.number().int().min(1).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional() });
export const GET = route({ auth: { permission: "customer:read" }, query }, async ({ query }) => listCustomers(query));
