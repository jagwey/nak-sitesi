import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { call, jar, ORIGIN } from "./helpers";
import { seedCatalog } from "./catalog-fixtures";
import { __resetEnvForTests } from "@/server/env";
import { db } from "@/server/db";
import { hashPassword } from "@/server/modules/auth/password";
import { PERMISSIONS } from "@/server/modules/auth/rbac";
import { parseTlToKurus } from "@/lib/money";
import { computeBulkPrice } from "@/server/modules/admin-catalog/bulk";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as productsGet, POST as productsPost } from "@/app/api/admin/products/route";
import { PATCH as productPatch } from "@/app/api/admin/products/[id]/route";
import { POST as imagePost } from "@/app/api/admin/products/[id]/images/route";
import { POST as filePost } from "@/app/api/admin/products/[id]/files/route";
import { GET as inventoryGet } from "@/app/api/admin/inventory/route";
import { POST as previewPost } from "@/app/api/admin/import/preview/route";
import { POST as commitPost } from "@/app/api/admin/import/commit/route";
import { POST as bulkPost } from "@/app/api/admin/bulk/route";
import { GET as adminsGet } from "@/app/api/admin/admins/route";
import { GET as publicList } from "@/app/api/products/route";
import { GET as publicDetail } from "@/app/api/products/[slug]/route";

const PW = "correct-horse-battery";
const ROLE_PERMS: Record<string, string[]> = {
  PRODUCT_MANAGER: ["product:read", "product:write", "file:write"],
  SUPER_ADMIN: [...PERMISSIONS],
  CUSTOMER: [],
};

beforeAll(() => {
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
  const res = await call(login, "POST", "/api/auth/login", { email, password: PW }, { ip: `198.51.100.${40 + n}` });
  expect(res.status).toBe(200);
}
const idp = (id: string) => ({ params: { id } });

const baseProduct = (over: Record<string, unknown> = {}) => ({
  name: "Test Deseni", sku: `T-${++n}`, type: "DIGITAL_EMBROIDERY", shortDescription: "", description: "", highlights: [], usageAreas: [],
  priceKurus: 12500, compareAtPriceKurus: null, seoTitle: null, seoDescription: null, personalizable: false, isNew: false, isFeatured: false,
  categoryId: null, collectionIds: [], tagIds: [], licenseIds: [], formatCodes: [], variants: [], options: [], embroidery: null, physicalInfo: null, ...over,
});

const png = () => sharp({ create: { width: 40, height: 40, channels: 3, background: "#B18A49" } }).png().toBuffer();

type Handler = (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>;
function multipart(handler: Handler, path: string, id: string, fields: Record<string, string | File>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return handler(new Request(ORIGIN + path, { method: "POST", headers: { origin: ORIGIN, "x-forwarded-for": "203.0.113.77" }, body: fd }), { params: Promise.resolve({ id }) });
}
const imageFile = async () => new File([new Uint8Array(await png())], "kapak.png", { type: "image/png" });

async function asManager() {
  const u = await mkUser("PRODUCT_MANAGER");
  await loginAs(u.email);
  return u;
}
async function createProduct(over: Record<string, unknown> = {}) {
  const res = await call(productsPost, "POST", "/api/admin/products", baseProduct(over));
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; sku: string };
}

describe("admin access control", () => {
  it("anonymous gets 401 and a customer 403 on admin catalog APIs", async () => {
    jar.clear();
    expect((await call(productsGet, "GET", "/api/admin/products")).status).toBe(401);
    expect((await call(inventoryGet, "GET", "/api/admin/inventory")).status).toBe(401);
    const c = await mkUser("CUSTOMER");
    await loginAs(c.email);
    expect((await call(productsGet, "GET", "/api/admin/products")).status).toBe(403);
    expect((await call(productsPost, "POST", "/api/admin/products", baseProduct())).status).toBe(403);
  });

  it("page guard: anonymous is redirected to login, customer gets notFound, manager passes", async () => {
    jar.clear();
    await expect(requireAdminPage()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    const c = await mkUser("CUSTOMER");
    await loginAs(c.email);
    await expect(requireAdminPage()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404") });
    await asManager();
    await expect(requireAdminPage("product:write")).resolves.toMatchObject({ permissions: expect.arrayContaining(["product:write"]) });
    await expect(requireAdminPage("user:write")).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });

  it("Ürün Yöneticisi can create a product but cannot reach admin-account management", async () => {
    await asManager();
    await createProduct();
    expect((await call(adminsGet, "GET", "/api/admin/admins")).status).toBe(403);
  });
});

describe("publish validation", () => {
  it("fails without image/file and passes with both", async () => {
    await seedCatalog();
    await asManager();
    const p = await createProduct({ formatCodes: ["PES"] });
    const fail = await call(productPatch, "PATCH", `/api/admin/products/${p.id}`, { status: "ACTIVE" }, idp(p.id));
    expect(fail.status).toBe(400);
    expect(JSON.stringify(await fail.json())).toContain("görsel");

    expect((await multipart(imagePost, `/api/admin/products/${p.id}/images`, p.id, { file: await imageFile(), alt: "Gül deseni önizlemesi" })).status).toBe(201);
    const still = await call(productPatch, "PATCH", `/api/admin/products/${p.id}`, { status: "ACTIVE" }, idp(p.id));
    expect(still.status).toBe(400);
    expect(JSON.stringify(await still.json())).toContain("nakış dosyası");

    const bytes = readFileSync(path.resolve(import.meta.dirname, "../fixtures/test-fixture.pes"));
    const up = await multipart(filePost, `/api/admin/products/${p.id}/files`, p.id, { file: new File([new Uint8Array(bytes)], "gul.pes") });
    expect([200, 201]).toContain(up.status);
    const ok = await call(productPatch, "PATCH", `/api/admin/products/${p.id}`, { status: "ACTIVE" }, idp(p.id));
    expect(ok.status).toBe(200);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("ACTIVE");
  });

  it("rejects an embroidery upload whose bytes do not match the extension", async () => {
    await seedCatalog();
    await asManager();
    const p = await createProduct();
    const junk = new File([new Uint8Array(Buffer.from("this is definitely not an embroidery file".repeat(20)))], "sahte.pes");
    const res = await multipart(filePost, `/api/admin/products/${p.id}/files`, p.id, { file: junk });
    expect(res.status).toBe(400);
    expect(await db.digitalFile.count({ where: { productId: p.id } })).toBe(0);
  });
});

describe("Shopier product link", () => {
  it("accepts and exposes only a validated product link and supports clearing it", async () => {
    const { rose, towel } = await seedCatalog();
    await asManager();
    const patch = (id: string, shopierUrl: string | null) =>
      call(productPatch, "PATCH", `/api/admin/products/${id}`, { shopierUrl }, idp(id));
    for (const url of ["https://shopier.com.evil.example/655165", "http://shopier.com/655165", "https://shopier.com/dukkan"]) {
      expect((await patch(rose.id, url)).status).toBe(400);
    }
    expect((await patch(towel.id, "https://shopier.com/655165")).status).toBe(400);
    const link = "https://www.shopier.com/655165";
    const saved = await patch(rose.id, "https://www.shopier.com/ShowProductNew/products.php?id=655165&utm_source=catalog");
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ shopierUrl: link });
    const response = await call(publicDetail, "GET", `/api/products/${rose.slug}`, undefined, { params: { slug: rose.slug } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ product: { shopierUrl: link } });
    expect(await (await patch(rose.id, null)).json()).toMatchObject({ shopierUrl: null });
    await db.product.update({ where: { id: rose.id }, data: { isDemo: true } });
    expect((await patch(rose.id, link)).status).toBe(400);
  });
});

describe("money and bulk math", () => {
  it("parses Turkish TL input to integer kuruş", () => {
    expect(parseTlToKurus("1.234,50")).toBe(123450);
    expect(parseTlToKurus("149,9")).toBe(14990);
    expect(parseTlToKurus("250")).toBe(25000);
    expect(parseTlToKurus("₺99,00")).toBe(9900);
    expect(parseTlToKurus("12,345")).toBeNull();
    expect(parseTlToKurus("abc")).toBeNull();
    expect(parseTlToKurus("")).toBeNull();
  });

  it("bulk percentage math stays integer and rounds on request", () => {
    expect(computeBulkPrice(10000, { mode: "increase_percent", percent: 10 })).toBe(11000);
    expect(computeBulkPrice(9999, { mode: "decrease_percent", percent: 15 })).toBe(8499);
    expect(computeBulkPrice(9999, { mode: "increase_percent", percent: 10, roundToLira: true })).toBe(11000);
    expect(computeBulkPrice(5000, { mode: "set", amountKurus: 7550 })).toBe(7550);
    expect(computeBulkPrice(100, { mode: "decrease_percent", percent: 100 })).toBeNull();
  });

  it("bulk price action updates stored prices", async () => {
    await asManager();
    const a = await createProduct({ priceKurus: 10000 });
    const b = await createProduct({ priceKurus: 20000 });
    const res = await call(bulkPost, "POST", "/api/admin/bulk", { action: "price", productIds: [a.id, b.id], mode: "increase_percent", percent: 10 });
    expect(res.status).toBe(200);
    expect((await db.product.findUniqueOrThrow({ where: { id: a.id } })).priceKurus).toBe(11000);
    expect((await db.product.findUniqueOrThrow({ where: { id: b.id } })).priceKurus).toBe(22000);
  });
});

describe("csv import", () => {
  const H = "sku;ad;tur;fiyat;karsilastirma_fiyati;kategori;kisa_aciklama;aciklama;etiketler;formatlar;stok;genislik_mm;yukseklik_mm;dikis_sayisi;renk_sayisi";
  const csv = [H, "IMP-1;İçe Aktarılan Gül;DIGITAL_EMBROIDERY;149,90;;;;;;PES;;100;100;;", "IMP-2;;DIGITAL_EMBROIDERY;abc;;;;;;;;;;;", "IMP-3;Havlu;PHYSICAL;300;;;;;;;5;;;;"].join("\n");

  it("preview reports row errors and writes nothing", async () => {
    await seedCatalog();
    await asManager();
    const before = await db.product.count();
    const res = await call(previewPost, "POST", "/api/admin/import/preview", { csv });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.totalRows).toBe(3);
    expect(j.createCount).toBe(2);
    expect(j.invalidCount).toBe(1);
    expect(j.errors.some((e: { row: number }) => e.row === 3)).toBe(true);
    expect(await db.product.count()).toBe(before);
  });

  it("commit creates DRAFT products only from valid rows", async () => {
    await seedCatalog();
    await asManager();
    const res = await call(commitPost, "POST", "/api/admin/import/commit", { csv, mode: "valid_only" });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.created).toBe(2);
    expect(j.skipped).toBe(1);
    const rows = await db.product.findMany({ where: { sku: { in: ["IMP-1", "IMP-2", "IMP-3"] } } });
    expect(rows.map((r) => r.sku).sort()).toEqual(["IMP-1", "IMP-3"]);
    expect(rows.every((r) => r.status === "DRAFT")).toBe(true);
    expect(rows.find((r) => r.sku === "IMP-1")!.priceKurus).toBe(14990);
  });

  it("all_or_nothing writes nothing when any row is invalid", async () => {
    await seedCatalog();
    await asManager();
    const before = await db.product.count();
    const res = await call(commitPost, "POST", "/api/admin/import/commit", { csv, mode: "all_or_nothing" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.product.count()).toBe(before);
  });
});

describe("audit and search", () => {
  it("writes an audit log entry when a product is updated", async () => {
    const u = await asManager();
    const p = await createProduct();
    const res = await call(productPatch, "PATCH", `/api/admin/products/${p.id}`, { name: "Yeni Ad Deseni" }, idp(p.id));
    expect(res.status).toBe(200);
    const logs = await db.auditLog.findMany({ where: { entityId: p.id } });
    expect(logs.some((l) => l.action.includes("update") && l.actorUserId === u.id)).toBe(true);
    expect(JSON.stringify(logs)).not.toMatch(/password|token/i);
  });

  it("a newly created and published product is found by search", async () => {
    await seedCatalog();
    await asManager();
    const p = await createProduct({ name: "Zeytin Dalı Motifi", formatCodes: ["PES"] });
    expect((await multipart(imagePost, `/api/admin/products/${p.id}/images`, p.id, { file: await imageFile(), alt: "Zeytin dalı motifi" })).status).toBe(201);
    const bytes = readFileSync(path.resolve(import.meta.dirname, "../fixtures/test-fixture.pes"));
    await multipart(filePost, `/api/admin/products/${p.id}/files`, p.id, { file: new File([new Uint8Array(bytes)], "zeytin.pes") });
    expect((await call(productPatch, "PATCH", `/api/admin/products/${p.id}`, { status: "ACTIVE" }, idp(p.id))).status).toBe(200);
    const j = await (await call(publicList, "GET", `/api/products?facets=false&q=${encodeURIComponent("zeytin")}`)).json();
    expect(j.items.map((x: { name: string }) => x.name)).toContain("Zeytin Dalı Motifi");
  });
});
