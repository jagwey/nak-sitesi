import { z } from "zod";
import { route } from "@/server/http";
import { ASSIGNABLE_ROLES, inviteAdmin, listAdmins } from "@/server/modules/admin-orders/admins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "user:read" } }, async () => ({ admins: await listAdmins() }));
export const POST = route(
  { auth: { permission: "user:write" }, body: z.strictObject({ email: z.email().max(200), name: z.string().trim().max(120).optional(), role: z.enum(ASSIGNABLE_ROLES) }) },
  async ({ body, user, ip }) => inviteAdmin({ id: user!.id, roles: user!.roles }, body!, ip)
);
