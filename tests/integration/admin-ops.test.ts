import { beforeAll, describe, expect, it, vi } from "vitest";
import { call, jar, sent } from "./helpers";
import { seedCatalog } from "./catalog-fixtures";
import { __resetEnvForTests } from "@/server/env";
import { sha256Hex } from "@/server/crypto";
import { db } from "@/server/db";
import { hashPassword } from "@/server/modules/auth/password";
import { checkout } from "@/server/modules/orders/checkout";
import { addItem } from "@/server/modules/cart/service";
import { PERMISSIONS } from "@/server/modules/auth/rbac";
import { sendEmail } from "@/server/modules/notifications/email";
import { SITE_DEFAULTS } from "@/server/modules/settings/schema";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { POST as simulate } from "@/app/api/dev/payments/simulate/route";
import { GET as adminOrders } from "@/app/api/admin/orders/route";
import { POST as shipRoute } from "@/app/api/admin/orders/[id]/shipments/route";
import { POST as statusRoute } from "@/app/api/admin/orders/[id]/status/route";
import { POST as cancelRoute } from "@/app/api/admin/orders/[id]/cancel/route";
import { POST as refundRoute } from "@/app/api/admin/orders/[id]/refund/route";
import { PATCH as adminPatch } from "@/app/api/admin/admins/[id]/route";
import { POST as staffInvite } from "@/app/api/admin/admins/route";
import { GET as customOrders } from "@/app/api/admin/custom-orders/route";
import { GET as adminProducts } from "@/app/api/admin/products/route";
import { GET as settingsGet, PUT as settingsPut } from "@/app/api/admin/settings/route";
import { POST as anonymizeRoute } from "@/app/api/admin/customers/[id]/anonymize/route";

const PW = "correct-horse-battery";
const ADDR = { fullName: "Test Kişi", phone: "05550000000", line1: "Deneme Sk. 1", city: "İstanbul", district: "Kadıköy", country: "TR" };
const ROLE_PERMS: Record<string, string[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  ADMIN: PERMISSIONS.filter((p) => p !== "user:write"),
  ORDER_MANAGER: ["order:read", "order:write", "customer:read", "customer:write", "customorder:read", "customorder:write"],
  MODERATOR: ["customorder:read", "customorder:write"],
  CUSTOMER: [],
};

beforeAll(() => {
  process.env.PAYMENT_PROVIDER = "simulated";
  process.env.PAYMENT_SIMULATION_ENABLED = "true";
  __resetEnvForTests();
});

let n = 0;
async function ensureRoles() {
  for (const [code, perms] of Object.entries(ROLE_PERMS)) {
    const role = (await db.role.findUnique({ where: { code } })) ?? (await db.role.create({ data: { code, name: code } }));
    for (const p of perms) {
      const perm = (await db.permission.findUnique({ where: { code: p } })) ?? (await db.permission.create({ data: { code: p } }));
      const has = await db.rolePermission.findFirst({ where: { roleId: role.id, permissionId: perm.id } });
      if (!has) await db.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    }
  }
}
async function mkUser(role: string) {
  await ensureRoles();
  const email = `${role.toLowerCase()}${++n}@example.com`;
  const r = await db.role.findUniqueOrThrow({ where: { code: role } });
  const u = await db.user.create({ data: { email, passwordHash: await hashPassword(PW), status: "ACTIVE", emailVerifiedAt: new Date() } });
  await db.userRole.create({ data: { userId: u.id, roleId: r.id } });
  return { id: u.id, email };
}
async function loginAs(email: string) {
  jar.clear();
  const res = await call(login, "POST", "/api/auth/login", { email, password: PW }, { ip: `198.51.100.${100 + n}` });
  expect(res.status).toBe(200);
}
const idp = (id: string) => ({ params: { id } });

async function physicalOrder(pay = false) {
  const { towel } = await seedCatalog();
  const cust = await mkUser("CUSTOMER");
  await addItem({ userId: cust.id }, { productId: towel.id, quantity: 1 } as never);
  const r = await checkout({ id: cust.id, email: cust.email, phone: null }, { shippingAddress: ADDR });
  if (pay) {
    await loginAs(cust.email);
    expect((await call(simulate, "POST", "/api/dev/payments/simulate", { orderNumber: r.order.number, outcome: "success" })).status).toBe(200);
  }
  return { towel, cust, order: r.order };
}

describe("admin RBAC", () => {
  it("customer gets 403 and anonymous 401 on admin APIs", async () => {
    const cust = await mkUser("CUSTOMER");
    jar.clear();
    expect((await call(adminOrders, "GET", "/api/admin/orders")).status).toBe(401);
    await loginAs(cust.email);
    expect((await call(adminOrders, "GET", "/api/admin/orders")).status).toBe(403);
    expect((await call(settingsGet, "GET", "/api/admin/settings")).status).toBe(403);
  });

  it("Siparis Yoneticisi can ship an order but cannot manage admins", async () => {
    const { order } = await physicalOrder(true);
    const om = await mkUser("ORDER_MANAGER");
    const target = await mkUser("ADMIN");
    await loginAs(om.email);
    const ship = await call(shipRoute, "POST", `/api/admin/orders/${order.id}/shipments`, { carrier: "Yurtiçi", trackingNumber: "TRK123456", markShipped: true }, idp(order.id));
    expect(ship.status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("SHIPPED");
    const res = await call(adminPatch, "PATCH", `/api/admin/admins/${target.id}`, { status: "DISABLED" }, idp(target.id));
    expect(res.status).toBe(403);
    expect((await db.user.findUniqueOrThrow({ where: { id: target.id } })).status).toBe("ACTIVE");
  });

  it("last Super Admin cannot be demoted or disabled", async () => {
    const sa = await mkUser("SUPER_ADMIN");
    await loginAs(sa.email);
    expect((await call(adminPatch, "PATCH", `/api/admin/admins/${sa.id}`, { role: "ADMIN" }, idp(sa.id))).status).toBeGreaterThanOrEqual(400);
    const { changeAdminRole, setAdminStatus } = await import("@/server/modules/admin-orders/admins");
    const actor = { id: "someone-else", roles: ["SUPER_ADMIN"] };
    await expect(changeAdminRole(actor, sa.id, "ADMIN")).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(setAdminStatus(actor, sa.id, "DISABLED")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.userRole.count({ where: { userId: sa.id, role: { code: "SUPER_ADMIN" } } })).toBe(1);
  });

  it("lets only a Super Admin invite a moderator with a private, single-use link without SMTP", async () => {
    vi.stubEnv("EMAIL_TRANSPORT", "console");
    __resetEnvForTests();
    try {
      const regularAdmin = await mkUser("ADMIN");
      await loginAs(regularAdmin.email);
      const invite = { email: "new-moderator@example.com", role: "MODERATOR" };
      expect((await call(staffInvite, "POST", "/api/admin/admins", invite)).status).toBe(403);

      const owner = await mkUser("SUPER_ADMIN");
      await loginAs(owner.email);
      const response = await call(staffInvite, "POST", "/api/admin/admins", invite);
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      const result = await response.json();
      const url = new URL(result.inviteUrl);
      const token = new URLSearchParams(url.hash.slice(1)).get("token")!;
      expect(url.pathname).toBe("/sifre-sifirla");
      expect(url.search).toBe("");
      expect(sent.some((msg) => msg.to === invite.email)).toBe(false);
      expect(await db.verificationToken.findUnique({ where: { tokenHash: sha256Hex(token) } })).toMatchObject({ userId: result.id });

      jar.clear();
      expect((await call(resetPassword, "POST", "/api/auth/reset-password", { token, password: PW })).status).toBe(200);
      expect((await call(resetPassword, "POST", "/api/auth/reset-password", { token, password: PW })).status).toBe(400);
      await loginAs(invite.email);
      expect((await call(customOrders, "GET", "/api/admin/custom-orders")).status).toBe(200);
      expect((await call(adminProducts, "GET", "/api/admin/products")).status).toBe(403);
      expect((await call(adminOrders, "GET", "/api/admin/orders")).status).toBe(403);
      expect((await call(staffInvite, "POST", "/api/admin/admins", invite)).status).toBe(403);
    } finally {
      vi.unstubAllEnvs();
      __resetEnvForTests();
    }
  });
});

describe("admin orders", () => {
  it("rejects an invalid status transition", async () => {
    const { order } = await physicalOrder(false);
    const om = await mkUser("ORDER_MANAGER");
    await loginAs(om.email);
    const res = await call(statusRoute, "POST", `/api/admin/orders/${order.id}/status`, { status: "COMPLETED" }, idp(order.id));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
  });

  it("cancel releases reserved stock and writes an audit row", async () => {
    const { towel, order } = await physicalOrder(false);
    expect((await db.inventory.findUniqueOrThrow({ where: { productId: towel.id } })).reserved).toBe(1);
    const om = await mkUser("ORDER_MANAGER");
    await loginAs(om.email);
    const res = await call(cancelRoute, "POST", `/api/admin/orders/${order.id}/cancel`, {}, idp(order.id));
    expect(res.status).toBe(200);
    expect((await db.inventory.findUniqueOrThrow({ where: { productId: towel.id } })).reserved).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect(await db.auditLog.count()).toBeGreaterThan(0);
  });

  it("refund revokes downloads when the policy is on", async () => {
    const { rose, fmt } = await seedCatalog();
    await db.digitalFile.create({ data: { productId: rose.id, formatId: fmt.VP3, storageKey: "private/x.vp3", originalName: "x.vp3", sizeBytes: 10, sha256: "0".repeat(64) } });
    const cust = await mkUser("CUSTOMER");
    await addItem({ userId: cust.id }, { productId: rose.id, format: "VP3", license: "PERSONAL", quantity: 1 } as never);
    const r = await checkout({ id: cust.id, email: cust.email, phone: null }, {});
    await loginAs(cust.email);
    await call(simulate, "POST", "/api/dev/payments/simulate", { orderNumber: r.order.number, outcome: "success" });
    expect(await db.downloadEntitlement.count({ where: { revokedAt: null } })).toBe(1);
    const om = await mkUser("ORDER_MANAGER");
    await loginAs(om.email);
    const res = await call(refundRoute, "POST", `/api/admin/orders/${r.order.id}/refund`, {}, idp(r.order.id));
    expect(res.status).toBe(200);
    expect(await db.downloadEntitlement.count({ where: { revokedAt: null } })).toBe(0);
  });
});

describe("settings and KVKK", () => {
  it("settings validation rejects a javascript: URL and unknown hosts", async () => {
    const sa = await mkUser("SUPER_ADMIN");
    await loginAs(sa.email);
    expect((await call(settingsPut, "PUT", "/api/admin/settings", { site: { instagramUrl: "javascript:alert(1)" } })).status).toBe(400);
    expect((await call(settingsPut, "PUT", "/api/admin/settings", { site: { announcementLink: "javascript:alert(1)" } })).status).toBe(400);
    expect((await call(settingsPut, "PUT", "/api/admin/settings", { site: { whatsapp: "https://evil.example/x" } })).status).toBe(400);
    expect((await call(settingsPut, "PUT", "/api/admin/settings", { site: { logoUrl: "//example.com/logo.png" } })).status).toBe(400);
    expect((await call(settingsPut, "PUT", "/api/admin/settings", { site: { logoUrl: "/images/../api/logo.png" } })).status).toBe(400);
    expect((await call(settingsPut, "PUT", "/api/admin/settings", { site: { logoUrl: "https://evil.example/logo.png" } })).status).toBe(400);
    expect((await call(settingsPut, "PUT", "/api/admin/settings", { site: { instagramUrl: "https://instagram.com/nakissitesi" } })).status).toBe(200);
  });

  it("loads legacy settings and immediately uses an audited shop name in emails", async () => {
    await db.siteSettings.create({ data: { key: "site", value: { contactEmail: "test-shop@example.com", storeName: "" } } });
    const admin = await mkUser("SUPER_ADMIN");
    await loginAs(admin.email);

    const original = await call(settingsGet, "GET", "/api/admin/settings");
    expect((await original.json()).site).toMatchObject({
      storeName: SITE_DEFAULTS.storeName, contactEmail: "test-shop@example.com", ownerName: "", logoUrl: "",
    });

    const storeName = "Atölye & <Dikiş>";
    const saved = await call(settingsPut, "PUT", "/api/admin/settings", {
      site: { storeName, ownerName: "Test İşletme", logoUrl: "/images/atelier-workbench.webp" },
    });
    expect(saved.status).toBe(200);
    expect((await saved.json()).site).toMatchObject({
      storeName, contactEmail: "test-shop@example.com", ownerName: "Test İşletme", logoUrl: "/images/atelier-workbench.webp",
    });
    expect(await db.auditLog.findFirst({ where: { actorUserId: admin.id, action: "settings.update" } })).not.toBeNull();
    expect(await sendEmail("verify_email", "branding@example.com", { url: "https://example.com/verify" })).toBe(true);
    const email = sent.findLast(({ to }) => to === "branding@example.com");
    expect(email?.fromName).toBe(storeName);
    expect(email?.text).toContain(storeName);
    expect(email?.html).toContain("Atölye &amp; &lt;Dikiş&gt;");
  });

  it("anonymize keeps order totals but removes personal data", async () => {
    const { order, cust } = await physicalOrder(true);
    const sa = await mkUser("SUPER_ADMIN");
    await loginAs(sa.email);
    const res = await call(anonymizeRoute, "POST", `/api/admin/customers/${cust.id}/anonymize`, { confirm: true }, idp(cust.id));
    expect(res.status).toBe(200);
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o.totalKurus).toBe(order.totalKurus);
    expect(o.email).not.toBe(cust.email);
    const u = await db.user.findUniqueOrThrow({ where: { id: cust.id } });
    expect(u.email).not.toBe(cust.email);
    expect(u.status).toBe("DISABLED");
  });
});
