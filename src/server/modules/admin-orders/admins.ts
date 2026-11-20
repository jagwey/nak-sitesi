import "server-only";
import { ADMIN_CODES, ADMIN_ROLE_LABELS, type AssignableRole } from "@/lib/admin-roles";
import { AppError } from "../../errors";
import { db } from "../../db";
import { writeAudit } from "../../audit";
import { hashPassword } from "../auth/password";
import { deleteUserSessions } from "../auth/session";
import { randomToken, sha256Hex } from "../../crypto";
import { appUrl, sendEmail } from "../notifications/email";
import { getEnv } from "../../env";

export interface Actor {
  id: string;
  roles: string[];
}
function assertSuper(a: Actor) {
  if (!a.roles.includes("SUPER_ADMIN")) throw new AppError("FORBIDDEN", "Bu işlem yalnızca Süper Yönetici içindir.");
}

export async function listAdmins() {
  const rows = await db.user.findMany({
    where: { roles: { some: { role: { code: { in: ADMIN_CODES } } } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, status: true, lastLoginAt: true, createdAt: true, roles: { select: { role: { select: { code: true } } } } },
  });
  return rows.map(({ roles, ...u }) => {
    const role = roles.map((r) => r.role.code).find((c) => ADMIN_CODES.includes(c)) ?? null;
    return { ...u, role, roleLabel: role ? ADMIN_ROLE_LABELS[role] : "" };
  });
}

const activeSupers = (excludeId?: string) =>
  db.user.count({ where: { status: "ACTIVE", roles: { some: { role: { code: "SUPER_ADMIN" } } }, ...(excludeId ? { id: { not: excludeId } } : {}) } });

async function currentRole(userId: string) {
  const rows = await db.userRole.findMany({ where: { userId }, select: { role: { select: { code: true } } } });
  return rows.map((r) => r.role.code).find((c) => ADMIN_CODES.includes(c)) ?? null;
}

export async function inviteAdmin(actor: Actor, input: { email: string; name?: string | null; role: AssignableRole }, ip?: string | null) {
  assertSuper(actor);
  const email = input.email.trim().toLowerCase();
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) throw new AppError("CONFLICT", "Bu e-posta ile kayıtlı bir hesap zaten var.");
  const role = await db.role.findUnique({ where: { code: input.role } });
  if (!role) throw new AppError("VALIDATION", "Rol bulunamadı.");
  const token = randomToken(32);
  // Unusable random password until the invitee sets one through the reset link.
  const passwordHash = await hashPassword(randomToken(24));
  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { email, name: input.name?.trim() || null, passwordHash, status: "ACTIVE" } });
    await tx.userRole.create({ data: { userId: u.id, roleId: role.id } });
    await tx.verificationToken.create({ data: { userId: u.id, purpose: "PASSWORD_RESET", tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    await writeAudit({ actorUserId: actor.id, action: "admin.invite", entity: "User", entityId: u.id, diff: { role: input.role }, ip }, tx);
    return u;
  });
  const inviteUrl = appUrl(`/sifre-sifirla#token=${token}`);
  const sent = getEnv().EMAIL_TRANSPORT === "smtp" && await sendEmail(
    "admin_invite",
    email,
    { name: user.name, roleLabel: ADMIN_ROLE_LABELS[input.role], url: inviteUrl },
    { userId: user.id, logPayload: { purpose: "ADMIN_INVITE" } },
  );
  return sent ? { id: user.id } : { id: user.id, inviteUrl };
}

export async function changeAdminRole(actor: Actor, targetId: string, role: AssignableRole, ip?: string | null) {
  assertSuper(actor);
  const cur = await currentRole(targetId);
  if (!cur) throw new AppError("NOT_FOUND", "Yönetici bulunamadı.");
  if (cur === "SUPER_ADMIN" && (await activeSupers(targetId)) === 0) throw new AppError("CONFLICT", "Son Süper Yönetici rolü değiştirilemez.");
  if (targetId === actor.id) throw new AppError("FORBIDDEN", "Kendi rolünüzü değiştiremezsiniz.");
  const r = await db.role.findUnique({ where: { code: role } });
  if (!r) throw new AppError("VALIDATION", "Rol bulunamadı.");
  await db.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId: targetId, role: { code: { in: ADMIN_CODES } } } });
    await tx.userRole.create({ data: { userId: targetId, roleId: r.id } });
    await writeAudit({ actorUserId: actor.id, action: "admin.role_change", entity: "User", entityId: targetId, diff: { from: cur, to: role }, ip }, tx);
  });
  await deleteUserSessions(targetId); // force a fresh login with the new role
  return { ok: true };
}

export async function setAdminStatus(actor: Actor, targetId: string, status: "ACTIVE" | "DISABLED", ip?: string | null) {
  assertSuper(actor);
  const cur = await currentRole(targetId);
  if (!cur) throw new AppError("NOT_FOUND", "Yönetici bulunamadı.");
  if (status === "DISABLED") {
    if (cur === "SUPER_ADMIN" && (await activeSupers(targetId)) === 0) throw new AppError("CONFLICT", "Son Süper Yönetici devre dışı bırakılamaz.");
    if (targetId === actor.id) throw new AppError("FORBIDDEN", "Kendi hesabınızı devre dışı bırakamazsınız.");
  }
  await db.user.update({ where: { id: targetId }, data: { status } });
  if (status === "DISABLED") await deleteUserSessions(targetId);
  await writeAudit({ actorUserId: actor.id, action: status === "DISABLED" ? "admin.disable" : "admin.enable", entity: "User", entityId: targetId, ip });
  return { ok: true };
}
