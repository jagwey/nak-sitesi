import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { call, jar, sent, ORIGIN } from "./helpers";
import { __resetEnvForTests } from "@/server/env";
import { db } from "@/server/db";
import { hashPassword } from "@/server/modules/auth/password";
import { PERMISSIONS } from "@/server/modules/auth/rbac";
import { __setStorageForTests, type StorageAdapter } from "@/server/modules/storage";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as createRoute } from "@/app/api/custom-orders/route";
import { GET as tokenGet, POST as tokenPost } from "@/app/api/custom-orders/quote/[token]/route";
import { GET as meList } from "@/app/api/me/custom-orders/route";
import { GET as meGet, POST as mePost } from "@/app/api/me/custom-orders/[id]/route";
import { POST as quoteRoute } from "@/app/api/admin/custom-orders/[id]/quote/route";
import { GET as adminList } from "@/app/api/admin/custom-orders/route";

const PW = "correct-horse-battery";
const objects = new Map<string, Buffer>();
const memory: StorageAdapter = {
  async putObject({ key, body }) { objects.set(key, body); },
  async getSignedDownloadUrl({ key }) { return `https://signed.example/${key}`; },
  async deleteObject({ key }) { objects.delete(key); },
  async headObject({ key }) { return { exists: objects.has(key) }; },
  publicUrl: (k) => `https://public.example/${k}`,
};

beforeAll(() => {
  process.env.PAYMENT_PROVIDER = "simulated";
  process.env.PAYMENT_SIMULATION_ENABLED = "true";
  process.env.ADMIN_NOTIFY_EMAIL = "ops@example.com";
  __resetEnvForTests();
  __setStorageForTests(memory);
});
afterAll(() => __setStorageForTests(undefined));

let n = 0;
async function mkUser(role: "ORDER_MANAGER" | "CUSTOMER") {
  const perms = role === "ORDER_MANAGER" ? ["customorder:read", "customorder:write", "order:read"] : [];
  const r = (await db.role.findUnique({ where: { code: role } })) ?? (await db.role.create({ data: { code: role, name: role } }));
  for (const p of perms) {
    const perm = (await db.permission.findUnique({ where: { code: p } })) ?? (await db.permission.create({ data: { code: p } }));
    if (!(await db.rolePermission.findFirst({ where: { roleId: r.id, permissionId: perm.id } }))) await db.rolePermission.create({ data: { roleId: r.id, permissionId: perm.id } });
  }
  const email = `${role.toLowerCase()}${++n}@example.com`;
  const u = await db.user.create({ data: { email, passwordHash: await hashPassword(PW), status: "ACTIVE", emailVerifiedAt: new Date() } });
  await db.userRole.create({ data: { userId: u.id, roleId: r.id } });
  return { id: u.id, email };
}
async function loginAs(email: string) {
  jar.clear();
  const res = await call(login, "POST", "/api/auth/login", { email, password: PW }, { ip: `198.51.100.${150 + n}` });
  expect(res.status).toBe(200);
}
void PERMISSIONS;

const png = () => sharp({ create: { width: 32, height: 32, channels: 3, background: "#B18A49" } }).png().toBuffer();

function form(over: Record<string, string> = {}, files: { name: string; data: Buffer; type: string }[] = []) {
  const fd = new FormData();
  const base: Record<string, string> = {
    name: "Ayşe Yılmaz", email: "ayse@example.com", productType: "İsim ve Monogram İşleme", text: "Havluya isim işlemesi", consent: "true", website: "", ...over,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  for (const f of files) fd.append("files", new File([new Uint8Array(f.data)], f.name, { type: f.type }));
  return fd;
}
function post(handler: (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>, fd: FormData, ip = "203.0.113.20") {
  return handler(new Request(`${ORIGIN}/api/custom-orders`, { method: "POST", headers: { origin: ORIGIN, "x-forwarded-for": ip }, body: fd }));
}
const tomorrow = () => new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);

describe("custom orders", () => {
  it("accepts a valid request with an image, stores a re-encoded private object", async () => {
    const res = await post(createRoute, form({}, [{ name: "ref.png", data: await png(), type: "image/png" }]));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    const { id } = await res.json();
    const att = await db.customOrderAttachment.findMany({ where: { customOrderId: id } });
    expect(att.length).toBe(1);
    expect(objects.has(att[0].storageKey)).toBe(true);
    expect(att[0].storageKey.endsWith(".webp")).toBe(true);
    expect(sent.some((m) => m.to === "ayse@example.com")).toBe(true);
    expect(sent.some((m) => m.to === "ops@example.com" && m.text.includes("/admin/ozel-siparisler/"))).toBe(true);
  });

  it("rejects a non-image file even when it claims image/png", async () => {
    const before = objects.size;
    const res = await post(createRoute, form({}, [{ name: "evil.png", data: Buffer.from("MZ not an image at all"), type: "image/png" }]), "203.0.113.21");
    expect(res.status).toBe(415);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await res.json()).toEqual({
      error: { code: "UNSUPPORTED_MEDIA_TYPE", message: expect.any(String), details: { code: "BAD_MAGIC", file: "evil.png" } },
    });
    expect(await db.customOrder.count()).toBe(0);
    expect(objects.size).toBe(before);
  });

  it("honeypot stores nothing", async () => {
    const res = await post(createRoute, form({ website: "http://spam.example" }), "203.0.113.22");
    expect(res.status).toBe(201);
    expect(await db.customOrder.count()).toBe(0);
  });

  it("requires KVKK consent", async () => {
    const res = await post(createRoute, form({ consent: "false" }), "203.0.113.23");
    expect(res.status).toBe(400);
  });

  it("guest flow: request, quote, accept, order is PENDING_PAYMENT and never paid", async () => {
    const created = await (await post(createRoute, form({ email: "misafir@example.com" }), "203.0.113.24")).json();
    const om = await mkUser("ORDER_MANAGER");
    await loginAs(om.email);
    const list = await call(adminList, "GET", "/api/admin/custom-orders");
    expect(list.status).toBe(200);
    const q = await call(quoteRoute, "POST", `/api/admin/custom-orders/${created.id}/quote`, { priceKurus: 45000, prepDays: 7, note: "Hazırız", validUntil: tomorrow() }, { params: { id: created.id } });
    expect(q.status).toBe(200);
    const mail = [...sent].reverse().find((m) => m.to === "misafir@example.com" && m.text.includes("/kisiye-ozel/teklif/"));
    const token = mail!.text.match(/\/kisiye-ozel\/teklif\/([A-Za-z0-9_-]+)/)![1];
    // Only the hash is stored.
    const stored = await db.customOrder.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored.accessTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.accessTokenHash).not.toBe(token);
    expect(stored.prepDays).toBe(7);
    expect(await db.siteSettings.count({ where: { key: { startsWith: "co." } } })).toBe(0);

    jar.clear();
    const view = await call(tokenGet, "GET", `/api/custom-orders/quote/${token}`, undefined, { params: { token } });
    expect(view.status).toBe(200);
    expect((await view.json()).request.quote.priceKurus).toBe(45000);
    const acc = await call(tokenPost, "POST", `/api/custom-orders/quote/${token}`, { decision: "ACCEPT" }, { params: { token } });
    expect(acc.status).toBe(200);
    const order = await db.order.findFirstOrThrow({ where: { email: "misafir@example.com" }, include: { payments: true } });
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.paymentStatus).not.toBe("PAID");
    expect(order.totalKurus).toBe(45000);
    expect(order.payments.every((p) => p.status !== "PAID")).toBe(true);
    expect((await db.customOrder.findUniqueOrThrow({ where: { id: created.id } })).status).toBe("CONVERTED");
    // Second accept cannot create a second order.
    const again = await call(tokenPost, "POST", `/api/custom-orders/quote/${token}`, { decision: "ACCEPT" }, { params: { token } });
    expect(again.status).toBeGreaterThanOrEqual(400);
    expect(await db.order.count({ where: { email: "misafir@example.com" } })).toBe(1);
  });

  it("IDOR: another user gets 404 for someone else's request and cannot decide on it", async () => {
    const owner = await mkUser("CUSTOMER");
    const other = await mkUser("CUSTOMER");
    await loginAs(owner.email);
    const created = await (await post(createRoute, form({ email: owner.email }), "203.0.113.25")).json();
    const om = await mkUser("ORDER_MANAGER");
    await loginAs(om.email);
    await call(quoteRoute, "POST", `/api/admin/custom-orders/${created.id}/quote`, { priceKurus: 30000, prepDays: 5, validUntil: tomorrow() }, { params: { id: created.id } });

    await loginAs(other.email);
    expect((await call(meGet, "GET", `/api/me/custom-orders/${created.id}`, undefined, { params: { id: created.id } })).status).toBe(404);
    expect((await call(mePost, "POST", `/api/me/custom-orders/${created.id}`, { decision: "ACCEPT" }, { params: { id: created.id } })).status).toBe(404);
    expect((await (await call(meList, "GET", "/api/me/custom-orders")).json()).requests).toEqual([]);
    expect(await db.order.count()).toBe(0);

    await loginAs(owner.email);
    expect((await call(mePost, "POST", `/api/me/custom-orders/${created.id}`, { decision: "ACCEPT" }, { params: { id: created.id } })).status).toBe(200);
    expect((await db.order.findFirstOrThrow()).status).toBe("PENDING_PAYMENT");
  });

  it("customer cannot open the admin custom-order list", async () => {
    const c = await mkUser("CUSTOMER");
    await loginAs(c.email);
    expect((await call(adminList, "GET", "/api/admin/custom-orders")).status).toBe(403);
  });

  it("guest quote token with a wrong value gets 404", async () => {
    jar.clear();
    const token = "x".repeat(40);
    const r = await call(tokenGet, "GET", `/api/custom-orders/quote/${token}`, undefined, { params: { token } });
    expect(r.status).toBe(404);
  });
});
