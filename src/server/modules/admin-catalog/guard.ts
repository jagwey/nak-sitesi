import "server-only";
import { notFound, redirect } from "next/navigation";
import { getOptionalUser, type AuthUser } from "../auth/rbac";

/** Any permission that makes a user a back-office user. */
export const ADMIN_PERMISSION_PREFIXES = ["product:", "order:", "customer:", "customorder:", "coupon:", "settings:", "user:", "audit:", "file:"];

export const hasAnyAdminPermission = (u: Pick<AuthUser, "permissions">) => u.permissions.some((p) => ADMIN_PERMISSION_PREFIXES.some((x) => p.startsWith(x)));

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
