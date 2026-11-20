import "server-only";
import { hasAnyAdminPermission } from "@/lib/admin-roles";
import { notFound, redirect } from "next/navigation";
import { getOptionalUser, type AuthUser } from "../auth/rbac";

/**
 * Page-level guard. Call in EVERY admin page (layouts are not re-rendered on client navigation).
 * Anonymous -> /giris?next=/admin ; no admin permission -> 404 (the admin area is not advertised).
 */
export async function requireAdminPage(permission?: string): Promise<AuthUser> {
  const user = await getOptionalUser();
  if (!user) redirect("/giris?next=/admin");
  if (!hasAnyAdminPermission(user)) notFound();
  if (permission && !user.permissions.includes(permission)) notFound();
  return user;
}
