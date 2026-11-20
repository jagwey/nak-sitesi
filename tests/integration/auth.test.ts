import { describe, expect, it } from "vitest";
import { call, jar, lastToken, sessionCookie, sent } from "./helpers";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as verifyEmail } from "@/app/api/auth/verify-email/route";
import { POST as requestReset } from "@/app/api/auth/request-password-reset/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { db } from "@/server/db";
import { requirePermission } from "@/server/modules/auth/rbac";

const PW = "correct-horse-battery";
const reg = (email = "ayse@example.com", ip?: string) =>
  call(register, "POST", "/api/auth/register", { email, password: PW, name: "Ayşe" }, { ip });

describe("auth", () => {
  it("registers, lowercases email, sets session cookie, sends verify mail", async () => {
    const res = await reg("Ayse@Example.com");
    expect(res.status).toBe(201);
    expect((await res.json()).user.email).toBe("ayse@example.com");
    expect(sessionCookie()).toBeTruthy();
    expect(sent.some((m) => m.to === "ayse@example.com")).toBe(true);
    const meRes = await call(me, "GET", "/api/auth/me");
    expect((await meRes.json()).user.email).toBe("ayse@example.com");
  });

  it("rejects duplicate, weak password and unknown fields", async () => {
    await reg();
    expect((await reg()).status).toBe(409);
    expect((await call(register, "POST", "/api/auth/register", { email: "b@example.com", password: "short" })).status).toBe(400);
    const mass = await call(register, "POST", "/api/auth/register", { email: "c@example.com", password: PW, roles: ["SUPER_ADMIN"] });
    expect(mass.status).toBe(400);
  });

  it("me returns null user when anonymous; CSRF blocks foreign origin", async () => {
    expect((await (await call(me, "GET", "/api/auth/me")).json()).user).toBeNull();
    const res = await call(login, "POST", "/api/auth/login", { email: "a@b.co", password: "x" }, { headers: { origin: "https://evil.example" } });
    expect(res.status).toBe(403);
  });

  it("login ok, wrong password gives a generic error", async () => {
    await reg();
    jar.clear();
    const bad = await call(login, "POST", "/api/auth/login", { email: "ayse@example.com", password: "wrong-password" });
    expect(bad.status).toBe(401);
    expect((await bad.json()).error.message).toBe("E-posta veya şifre hatalı.");
    const unknown = await call(login, "POST", "/api/auth/login", { email: "nobody@example.com", password: "wrong-password" });
    expect((await unknown.json()).error.message).toBe("E-posta veya şifre hatalı.");
    const ok = await call(login, "POST", "/api/auth/login", { email: "ayse@example.com", password: PW });
    expect(ok.status).toBe(200);
    expect(sessionCookie()).toBeTruthy();
  });

  it("locks after 5 wrong attempts even with the correct password", async () => {
    await reg();
    jar.clear();
    for (let i = 0; i < 5; i++) {
      expect((await call(login, "POST", "/api/auth/login", { email: "ayse@example.com", password: "wrong-password" })).status).toBe(401);
    }
    const locked = await call(login, "POST", "/api/auth/login", { email: "ayse@example.com", password: PW });
    expect(locked.status).toBe(429);
    expect(locked.headers.get("retry-after")).toBeTruthy();
    expect((await locked.json()).error.code).toBe("RATE_LIMITED");
  });

  it("logout invalidates the session server-side", async () => {
    await reg();
    const token = sessionCookie()!;
    expect((await call(logout, "POST", "/api/auth/logout", {})).status).toBe(200);
    expect(sessionCookie()).toBeUndefined();
    jar.set("tb_session", token); // replay the old cookie
    expect((await (await call(me, "GET", "/api/auth/me")).json()).user).toBeNull();
    expect(await db.session.count()).toBe(0);
  });

  it("email verification token is single-use", async () => {
    await reg();
    const token = lastToken("ayse@example.com");
    expect((await call(verifyEmail, "POST", "/api/auth/verify-email", { token })).status).toBe(200);
    const u = await db.user.findUniqueOrThrow({ where: { email: "ayse@example.com" } });
    expect(u.emailVerifiedAt).not.toBeNull();
    expect((await call(verifyEmail, "POST", "/api/auth/verify-email", { token })).status).toBe(400);
    expect((await call(verifyEmail, "POST", "/api/auth/verify-email", { token: "x".repeat(43) })).status).toBe(400);
  });

  it("stores only token hashes and no raw token in notifications", async () => {
    await reg();
    const token = lastToken("ayse@example.com");
    const rows = await db.verificationToken.findMany();
    expect(rows.every((r) => r.tokenHash !== token)).toBe(true);
    expect(JSON.stringify(await db.notification.findMany())).not.toContain(token);
  });

  it("password reset flow: generic response, single use, kills sessions", async () => {
    await reg();
    const unknown = await call(requestReset, "POST", "/api/auth/request-password-reset", { email: "ghost@example.com" });
    expect(unknown.status).toBe(200);
    expect(sent.some((m) => m.to === "ghost@example.com")).toBe(false);

    expect((await call(requestReset, "POST", "/api/auth/request-password-reset", { email: "ayse@example.com" })).status).toBe(200);
    const token = lastToken("ayse@example.com");
    const NEW = "brand-new-password-1";
    expect((await call(resetPassword, "POST", "/api/auth/reset-password", { token, password: NEW })).status).toBe(200);
    expect((await call(resetPassword, "POST", "/api/auth/reset-password", { token, password: NEW })).status).toBe(400);
    expect(await db.session.count()).toBe(0);

    jar.clear();
    expect((await call(login, "POST", "/api/auth/login", { email: "ayse@example.com", password: PW })).status).toBe(401);
    expect((await call(login, "POST", "/api/auth/login", { email: "ayse@example.com", password: NEW })).status).toBe(200);
  });

  it("customer lacks admin permission (FORBIDDEN); anonymous is UNAUTHENTICATED", async () => {
    await expect(requirePermission("product:write")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await reg();
    await expect(requirePermission("product:write")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("a granted permission is honoured", async () => {
    await reg();
    const user = await db.user.findUniqueOrThrow({ where: { email: "ayse@example.com" } });
    const perm = await db.permission.create({ data: { code: "product:write" } });
    const role = await db.role.create({ data: { code: "PRODUCT_MANAGER", name: "PM" } });
    await db.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
    await expect(requirePermission("product:write")).resolves.toMatchObject({ email: "ayse@example.com" });
  });
});
