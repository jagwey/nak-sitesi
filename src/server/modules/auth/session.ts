import "server-only";
import { cookies } from "next/headers";
import { db } from "../../db";
import { getEnv } from "../../env";
import { hashIp, randomToken, sha256Hex } from "../../crypto";

export const SESSION_COOKIE = "tb_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, sliding
const SLIDE_AFTER_MS = 60 * 60 * 1000; // refresh expiry at most once per hour

export interface SessionMeta {
  ip?: string | null;
  userAgent?: string | null;
}

/** Create a session row (stores sha256 of the opaque token only) and return the raw token. */
export async function createSession(userId: string, meta: SessionMeta = {}) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: {
      userId,
      tokenHash: sha256Hex(token),
      expiresAt,
      ipHash: hashIp(meta.ip),
      userAgent: meta.userAgent?.slice(0, 200) ?? null,
    },
  });
  return { token, expiresAt };
}

/** Look up a session by raw token; applies sliding expiry. Returns null if missing/expired. */
export async function validateSessionToken(token: string | undefined | null) {
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const session = await db.session.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now || session.user.status !== "ACTIVE") {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (now - session.lastUsedAt.getTime() > SLIDE_AFTER_MS) {
    const expiresAt = new Date(now + SESSION_TTL_MS);
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date(now), expiresAt } });
    session.expiresAt = expiresAt;
  }
  return session;
}

export async function deleteSessionByToken(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: sha256Hex(token) } });
}

/** Delete all sessions of a user, optionally keeping one (by session id). */
export async function deleteUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await db.session.deleteMany({ where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) } });
}

// ── Cookie helpers (Next request scope: route handlers, server components, server actions) ──

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
