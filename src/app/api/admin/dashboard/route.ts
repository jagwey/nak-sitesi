import { AppError } from "@/server/errors";
import { route } from "@/server/http";
import { getDashboard } from "@/server/modules/admin-catalog/dashboard";
import { hasAnyAdminPermission } from "@/server/modules/admin-catalog/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "user" }, async ({ user }) => {
  if (!hasAnyAdminPermission(user!)) throw new AppError("FORBIDDEN");
  return getDashboard(new Set(user!.permissions));
});
