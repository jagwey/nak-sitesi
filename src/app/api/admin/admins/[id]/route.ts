import { z } from "zod";
import { route } from "@/server/http";
import { ASSIGNABLE_ROLES, changeAdminRole, setAdminStatus } from "@/server/modules/admin-orders/admins";
import { orderIdParams } from "@/server/modules/admin-orders/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = route(
  { auth: { permission: "user:write" }, params: orderIdParams, body: z.strictObject({ role: z.enum(ASSIGNABLE_ROLES).optional(), status: z.enum(["ACTIVE", "DISABLED"]).optional() }) },
  async ({ params, body, user, ip }) => {
    const actor = { id: user!.id, roles: user!.roles };
    if (body!.role) await changeAdminRole(actor, params.id, body!.role, ip);
    if (body!.status) await setAdminStatus(actor, params.id, body!.status, ip);
    return { ok: true };
  }
);
