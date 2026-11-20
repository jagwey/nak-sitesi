import "server-only";
import { db } from "../../db";
import { AppError } from "../../errors";
import { readSessionToken, validateSessionToken } from "./session";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
  sessionId: string;
}

export const PERMISSIONS = [
  "product:read",
  "product:write",
  "order:read",
  "order:write",
  "customer:read",
  "customer:write",
  "customorder:read",
  "customorder:write",
  "coupon:write",
  "settings:read",
  "settings:write",
  "user:read",
  "user:write",
  "audit:read",
  "file:write",
] as const;
export type PermissionCode = (typeof PERMISSIONS)[number];

/** Load the current user (with DB-resolved roles/permissions) or null. Never throws for anonymous. */
export async function getOptionalUser(): Promise<AuthUser | null> {
  const token = await readSessionToken();
  const session = await validateSessionToken(token);
  if (!session) return null;
  const roles = await db.userRole.findMany({
    where: { userId: session.userId },
    select: { role: { select: { code: true, permissions: { select: { permission: { select: { code: true } } } } } } },
  });
  const permissions = new Set<string>();
  for (const r of roles) for (const p of r.role.permissions) permissions.add(p.permission.code);
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    emailVerified: !!u.emailVerifiedAt,
    roles: roles.map((r) => r.role.code),
    permissions: [...permissions],
    sessionId: session.id,
  };
}

/** Throws UNAUTHENTICATED when there is no valid session. Use in API routes and server layouts. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getOptionalUser();
  if (!user) throw new AppError("UNAUTHENTICATED");
  return user;
}

/** Throws UNAUTHENTICATED / FORBIDDEN. Permissions are always read from the DB, never from the client. */
export async function requirePermission(code: PermissionCode | (string & {})): Promise<AuthUser> {
  const user = await requireUser();
  if (!user.permissions.includes(code)) throw new AppError("FORBIDDEN");
  return user;
}

export const hasPermission = (user: AuthUser, code: string) => user.permissions.includes(code);
