import "server-only";
import { db } from "../../db";
import { AppError } from "../../errors";
import { randomToken, sha256Hex } from "../../crypto";
import { enforceRateLimit, hitRateLimit, peekRateLimit, resetRateLimit } from "../../rate-limit";
import { writeAudit } from "../../audit";
import { appUrl, sendEmail } from "../notifications/email";
import { hashPassword, verifyDummyPassword, verifyPassword } from "./password";
import {
  clearSessionCookie,
  createSession,
  deleteSessionByToken,
  deleteUserSessions,
  readSessionToken,
  setSessionCookie,
} from "./session";
import type { LoginInput, ProfileInput, RegisterInput } from "./schema";

const LOGIN_EMAIL = { name: "login:email", limit: 5, windowSec: 15 * 60 };
const LOGIN_IP = { name: "login:ip", limit: 30, windowSec: 15 * 60 };
const LOCK_MS = 15 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export interface RequestMeta {
  ip: string;
  userAgent?: string | null;
}

const publicUser = (u: { id: string; email: string; name: string | null; phone: string | null; emailVerifiedAt: Date | null }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  phone: u.phone,
  emailVerified: !!u.emailVerifiedAt,
});

async function issueToken(userId: string, purpose: "EMAIL_VERIFY" | "PASSWORD_RESET", ttlMs: number) {
  const token = randomToken(32);
  // Invalidate older unused tokens of the same purpose.
  await db.verificationToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } });
  await db.verificationToken.create({
    data: { userId, purpose, tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

async function sendVerification(user: { id: string; email: string; name: string | null }) {
  const token = await issueToken(user.id, "EMAIL_VERIFY", VERIFY_TTL_MS);
  await sendEmail(
    "verify_email",
    user.email,
    { name: user.name, url: appUrl(`/e-posta-dogrula?token=${token}`) },
    { userId: user.id, logPayload: { purpose: "EMAIL_VERIFY" } }
  );
}

export async function register(input: RegisterInput, meta: RequestMeta) {
  await enforceRateLimit({ name: "register:ip", id: meta.ip, limit: 10, windowSec: 3600 });
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new AppError("CONFLICT", "Bu e-posta adresiyle zaten bir hesap var.");

  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name ?? null,
      roles: { create: { role: { connectOrCreate: { where: { code: "CUSTOMER" }, create: { code: "CUSTOMER", name: "Müşteri" } } } } },
    },
  });
  await sendVerification(user);
  const s = await createSession(user.id, meta);
  await setSessionCookie(s.token, s.expiresAt);
  return publicUser(user);
}

const GENERIC_LOGIN_FAIL = "E-posta veya şifre hatalı.";

export async function login(input: LoginInput, meta: RequestMeta) {
  await enforceRateLimit({ ...LOGIN_IP, id: meta.ip });
  const emailRule = { ...LOGIN_EMAIL, id: input.email };
  const peek = await peekRateLimit(emailRule);
  if (!peek.allowed) throw new AppError("RATE_LIMITED", undefined, { retryAfterSec: peek.retryAfterSec });

  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user) {
    await verifyDummyPassword(input.password);
    await hitRateLimit(emailRule);
    throw new AppError("UNAUTHENTICATED", GENERIC_LOGIN_FAIL);
  }

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok || user.status !== "ACTIVE") {
    await hitRateLimit(emailRule);
    const failed = user.failedLoginCount + 1;
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: failed, ...(failed >= 5 ? { lockedUntil: new Date(Date.now() + LOCK_MS) } : {}) },
    });
    throw new AppError("UNAUTHENTICATED", GENERIC_LOGIN_FAIL);
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AppError("RATE_LIMITED", undefined, { retryAfterSec: Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000) });
  }

  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await resetRateLimit(emailRule.name, emailRule.id);

  // Session rotation: drop whatever session the browser currently holds.
  await deleteSessionByToken(await readSessionToken());
  const s = await createSession(user.id, meta);
  await setSessionCookie(s.token, s.expiresAt);
  await writeAudit({ actorUserId: user.id, action: "auth.login", entity: "User", entityId: user.id, ip: meta.ip });
  return publicUser(user);
}

export async function logout() {
  await deleteSessionByToken(await readSessionToken());
  await clearSessionCookie();
}

export async function requestEmailVerification(userId: string, meta: RequestMeta) {
  await enforceRateLimit({ name: "verify-request:user", id: userId, limit: 3, windowSec: 3600 });
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("NOT_FOUND");
  if (user.emailVerifiedAt) return;
  await sendVerification(user);
}

export async function verifyEmail(token: string) {
  const now = new Date();
  const row = await db.verificationToken.findUnique({ where: { tokenHash: sha256Hex(token) } });
  if (!row || row.purpose !== "EMAIL_VERIFY" || row.usedAt || row.expiresAt <= now) {
    throw new AppError("VALIDATION", "Doğrulama bağlantısı geçersiz veya süresi dolmuş.");
  }
  // Race-safe single use.
  const claimed = await db.verificationToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
  if (claimed.count !== 1) throw new AppError("VALIDATION", "Doğrulama bağlantısı geçersiz veya süresi dolmuş.");
  await db.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: now } });
}

/** Always resolves; never reveals whether the e-mail exists. */
export async function requestPasswordReset(email: string, meta: RequestMeta) {
  await enforceRateLimit({ name: "reset-request:ip", id: meta.ip, limit: 10, windowSec: 3600 });
  const r = await hitRateLimit({ name: "reset-request:email", id: email, limit: 3, windowSec: 3600 });
  if (!r.allowed) return;
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return;
  const token = await issueToken(user.id, "PASSWORD_RESET", RESET_TTL_MS);
  await sendEmail(
    "password_reset",
    user.email,
    { name: user.name, url: appUrl(`/sifre-sifirla?token=${token}`) },
    { userId: user.id, logPayload: { purpose: "PASSWORD_RESET" } }
  );
}

export async function resetPassword(token: string, newPassword: string, meta: RequestMeta) {
  await enforceRateLimit({ name: "reset:ip", id: meta.ip, limit: 20, windowSec: 3600 });
  const now = new Date();
  const row = await db.verificationToken.findUnique({ where: { tokenHash: sha256Hex(token) } });
  const bad = () => new AppError("VALIDATION", "Sıfırlama bağlantısı geçersiz veya süresi dolmuş.");
  if (!row || row.purpose !== "PASSWORD_RESET" || row.usedAt || row.expiresAt <= now) throw bad();
  const claimed = await db.verificationToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
  if (claimed.count !== 1) throw bad();

  const passwordHash = await hashPassword(newPassword);
  await db.user.update({ where: { id: row.userId }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } });
  await db.verificationToken.updateMany({ where: { userId: row.userId, purpose: "PASSWORD_RESET", usedAt: null }, data: { usedAt: now } });
  await deleteUserSessions(row.userId);
  await writeAudit({ actorUserId: row.userId, action: "auth.password_reset", entity: "User", entityId: row.userId, ip: meta.ip });
}

export async function updateProfile(userId: string, input: ProfileInput) {
  const u = await db.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    },
  });
  return publicUser(u);
}

export async function getProfile(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) throw new AppError("NOT_FOUND");
  return publicUser(u);
}
