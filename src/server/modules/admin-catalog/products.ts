import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db, type DbClient, type Tx } from "@/server/db";
import { AppError } from "@/server/errors";
import { writeAudit } from "@/server/audit";
import { normalizeTurkish } from "@/lib/search";
import { slugifyTr } from "@/lib/slug";
import { reindexProducts } from "../search";
import type { ProductCreateInput, ProductUpdateInput } from "./schema";

export interface Actor {
  id: string;
  ip?: string | null;
}

const DIGITAL_FILE_TYPES = new Set(["DIGITAL_EMBROIDERY"]);
const NEEDS_INVENTORY = new Set(["PHYSICAL", "PERSONALIZED", "TEXTILE_PRINT"]);

/** Turkish list of what blocks publishing (empty = publishable). */
export async function publishIssues(client: DbClient, productId: string): Promise<string[]> {
  const p = await client.product.findUnique({
    where: { id: productId },
    select: { priceKurus: true, type: true, _count: { select: { images: true } } },
  });
  if (!p) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
  const issues: string[] = [];
  if (p.priceKurus <= 0) issues.push("Fiyat 0'dan büyük olmalı.");
  if (p._count.images < 1) issues.push("En az bir ürün görseli ekleyin.");
  if (DIGITAL_FILE_TYPES.has(p.type)) {
    const n = await client.digitalFile.count({ where: { productId, isCurrent: true, status: "ACTIVE" } });
    if (n < 1) issues.push("Dijital ürün için en az bir güncel nakış dosyası yükleyin.");
  }
  return issues;
}

export function publishError(issues: string[]): AppError {
  return new AppError("VALIDATION", `Ürün yayınlanamaz. Eksikler: ${issues.join(" ")}`, {
    details: issues.map((message) => ({ path: "status", message })),
  });
}

export async function uniqueProductSlug(client: DbClient, base: string, excludeId?: string): Promise<string> {
  const root = base || "urun";
  for (let i = 0; i < 200; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await client.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!hit || hit.id === excludeId) return candidate;
  }
  throw new AppError("CONFLICT", "Benzersiz bağlantı üretilemedi.");
}

async function assertSkuFree(client: DbClient, sku: string, excludeProductId?: string) {
  const hit = await client.product.findUnique({ where: { sku }, select: { id: true } });
  if (hit && hit.id !== excludeProductId) {
    throw new AppError("CONFLICT", `"${sku}" SKU'su başka bir üründe kullanılıyor.`, { details: [{ path: "sku", message: "Bu SKU kullanılıyor." }] });
  }
}

async function ensureInventory(tx: Tx, target: { productId: string } | { variantId: string }) {
  const hit = await tx.inventory.findFirst({ where: target, select: { id: true } });
  if (!hit) await tx.inventory.create({ data: target });
}

export async function syncRelations(tx: Tx, productId: string, type: string, input: ProductUpdateInput) {
  if (input.collectionIds) {
    const keep = new Set(input.collectionIds);
    const cur = await tx.productCollection.findMany({ where: { productId } });
    await tx.productCollection.deleteMany({ where: { productId, collectionId: { notIn: [...keep] } } });
    for (const cid of keep) {
      if (cur.some((c) => c.collectionId === cid)) continue;
      const last = await tx.productCollection.aggregate({ where: { collectionId: cid }, _max: { sort: true } });
      await tx.productCollection.create({ data: { productId, collectionId: cid, sort: (last._max.sort ?? -1) + 1 } });
    }
  }
  if (input.tagIds) {
    await tx.productTag.deleteMany({ where: { productId } });
    if (input.tagIds.length) await tx.productTag.createMany({ data: [...new Set(input.tagIds)].map((tagId) => ({ productId, tagId })) });
  }
  if (input.licenseIds) {
    await tx.productLicense.deleteMany({ where: { productId } });
    if (input.licenseIds.length) await tx.productLicense.createMany({ data: [...new Set(input.licenseIds)].map((licenseId) => ({ productId, licenseId })) });
  }
  if (input.formatCodes) {
    const formats = await tx.fileFormat.findMany({ where: { code: { in: input.formatCodes } } });
    if (formats.length !== new Set(input.formatCodes).size) throw new AppError("VALIDATION", "Bilinmeyen dosya biçimi seçildi.");
    // Formats that have a real current file stay declared whatever the form says.
    const withFiles = await tx.digitalFile.findMany({ where: { productId, isCurrent: true, status: "ACTIVE" }, select: { formatId: true } });
    const ids = new Set([...formats.map((f) => f.id), ...withFiles.map((f) => f.formatId)]);
    await tx.productFormat.deleteMany({ where: { productId, formatId: { notIn: [...ids] } } });
    await tx.productFormat.createMany({ data: [...ids].map((formatId) => ({ productId, formatId })), skipDuplicates: true });
  }
  if (input.options) {
    const keys = input.options.map((o) => o.key);
    if (new Set(keys).size !== keys.length) throw new AppError("VALIDATION", "Kişiselleştirme anahtarları benzersiz olmalı.");
    await tx.productOption.deleteMany({ where: { productId, key: { notIn: keys } } });
    for (const [i, o] of input.options.entries()) {
      const choices = o.choices === null ? Prisma.DbNull : o.choices;
      const data = {
        label: o.label, type: o.type, required: o.required, minLength: o.minLength, maxLength: o.maxLength,
        choices, priceDeltaKurus: o.priceDeltaKurus, sort: i,
      };
      await tx.productOption.upsert({ where: { productId_key: { productId, key: o.key } }, create: { productId, key: o.key, ...data }, update: data });
    }
  }
  if (input.variants) {
    const skus = input.variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) throw new AppError("VALIDATION", "Varyant SKU'ları benzersiz olmalı.");
    const existing = await tx.productVariant.findMany({ where: { productId }, select: { id: true, _count: { select: { orderItems: true } } } });
    const keepIds = new Set(input.variants.map((v) => v.id).filter((x): x is string => !!x));
    for (const e of existing) {
      if (keepIds.has(e.id)) continue;
      if (e._count.orderItems > 0) await tx.productVariant.update({ where: { id: e.id }, data: { active: false } });
      else await tx.productVariant.delete({ where: { id: e.id } });
    }
    for (const [i, v] of input.variants.entries()) {
      const clash = await tx.productVariant.findUnique({ where: { sku: v.sku }, select: { id: true } });
      if (clash && clash.id !== v.id) {
        throw new AppError("CONFLICT", `"${v.sku}" varyant SKU'su kullanılıyor.`, { details: [{ path: "variants", message: "Varyant SKU'su kullanılıyor." }] });
      }
      const options: Record<string, string> = {};
      if (v.size) options.size = v.size;
      if (v.color) options.color = v.color;
      const data = { name: v.name, sku: v.sku, options, priceKurus: v.priceKurus, active: v.active, sort: i };
      let id = v.id;
      if (id && existing.some((e) => e.id === id)) await tx.productVariant.update({ where: { id }, data });
      else id = (await tx.productVariant.create({ data: { productId, ...data } })).id;
      if (NEEDS_INVENTORY.has(type)) await ensureInventory(tx, { variantId: id });
    }
  }
  if (input.embroidery !== undefined) {
    if (input.embroidery === null) await tx.embroideryMetadata.deleteMany({ where: { productId } });
    else {
      const e = input.embroidery;
      const cur = await tx.embroideryMetadata.findUnique({ where: { productId } });
      // Stays PARSED only while the admin has not changed the parsed numbers.
      const changed = !cur || (["designWidthMm", "designHeightMm", "stitchCount", "colorCount", "colorChanges"] as const).some((k) => cur[k] !== e[k]);
      if (cur) await tx.embroideryMetadata.update({ where: { productId }, data: { ...e, ...(changed ? { metadataSource: "MANUAL" as const } : {}) } });
      else await tx.embroideryMetadata.create({ data: { productId, ...e, metadataSource: "MANUAL" } });
    }
  }
}

const SCALARS = [
  "name", "slug", "sku", "type", "status", "shortDescription", "description", "highlights", "usageAreas", "priceKurus",
  "compareAtPriceKurus", "seoTitle", "seoDescription", "personalizable", "isNew", "isFeatured", "categoryId",
] as const;

function scalarData(input: ProductUpdateInput): Prisma.ProductUncheckedUpdateInput {
  const d: Record<string, unknown> = {};
  for (const k of SCALARS) if (input[k] !== undefined) d[k] = input[k];
  if (input.physicalInfo !== undefined) d.physicalInfo = input.physicalInfo === null ? Prisma.DbNull : input.physicalInfo;
  return d as Prisma.ProductUncheckedUpdateInput;
}

function diffOf(before: Record<string, unknown>, input: ProductUpdateInput) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of SCALARS) {
    const to = input[k];
    if (to === undefined) continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(to)) changes[k] = { from: before[k], to };
  }
  for (const k of ["collectionIds", "tagIds", "licenseIds", "formatCodes", "variants", "options", "embroidery", "physicalInfo"] as const) {
    const v = input[k];
    if (v !== undefined) changes[k] = { from: "(önceki)", to: Array.isArray(v) ? `${v.length} kayıt` : "güncellendi" };
  }
  return changes;
}

export async function createProduct(input: ProductCreateInput, actor: Actor) {
  const id = await db.$transaction(async (tx) => {
    await assertSkuFree(tx, input.sku);
    const slug = await uniqueProductSlug(tx, input.slug ?? slugifyTr(input.name));
    if (input.slug && slug !== input.slug) {
      throw new AppError("CONFLICT", "Bu bağlantı kullanılıyor.", { details: [{ path: "slug", message: "Bu bağlantı kullanılıyor." }] });
    }
    if (input.categoryId && !(await tx.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }))) {
      throw new AppError("VALIDATION", "Kategori bulunamadı.");
    }
    const p = await tx.product.create({
      data: {
        slug, sku: input.sku, type: input.type, status: "DRAFT", name: input.name, shortDescription: input.shortDescription, description: input.description,
        highlights: input.highlights, usageAreas: input.usageAreas, priceKurus: input.priceKurus, compareAtPriceKurus: input.compareAtPriceKurus,
        seoTitle: input.seoTitle, seoDescription: input.seoDescription, personalizable: input.personalizable, isNew: input.isNew, isFeatured: input.isFeatured,
        categoryId: input.categoryId, physicalInfo: input.physicalInfo ?? undefined, searchText: "",
      },
    });
    await syncRelations(tx, p.id, input.type, input);
    if (NEEDS_INVENTORY.has(input.type) && input.variants.length === 0) await ensureInventory(tx, { productId: p.id });
    await writeAudit({ actorUserId: actor.id, action: "product.create", entity: "Product", entityId: p.id, diff: { name: input.name, sku: input.sku, type: input.type, priceKurus: input.priceKurus, status: "DRAFT" }, ip: actor.ip }, tx);
    return p.id;
  }, { timeout: 30000 });
  await reindexProducts(db, [id]);
  return getAdminProduct(id);
}

export async function updateProduct(id: string, input: ProductUpdateInput, actor: Actor) {
  await db.$transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id } });
    if (!before) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
    if (input.sku && input.sku !== before.sku) await assertSkuFree(tx, input.sku, id);
    if (input.slug && input.slug !== before.slug) {
      const s = await tx.product.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (s && s.id !== id) throw new AppError("CONFLICT", "Bu bağlantı kullanılıyor.", { details: [{ path: "slug", message: "Bu bağlantı kullanılıyor." }] });
    }
    if (input.categoryId && !(await tx.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }))) {
      throw new AppError("VALIDATION", "Kategori bulunamadı.");
    }
    const type = input.type ?? before.type;
    const nextStatus = input.status ?? before.status;
    const data = scalarData(input);
    if (nextStatus === "ACTIVE" && !before.publishedAt) data.publishedAt = new Date();
    await tx.product.update({ where: { id }, data });
    await syncRelations(tx, id, type, input);
    if (nextStatus === "ACTIVE" && (before.status !== "ACTIVE" || input.priceKurus !== undefined || input.type !== undefined)) {
      const issues = await publishIssues(tx, id);
      if (issues.length) throw publishError(issues);
    }
    await writeAudit({ actorUserId: actor.id, action: "product.update", entity: "Product", entityId: id, diff: diffOf(before as unknown as Record<string, unknown>, input), ip: actor.ip }, tx);
  }, { timeout: 30000 });
  await reindexProducts(db, [id]);
  return getAdminProduct(id);
}

export const thumbKey = (key: string) => key.replace(/\.webp$/, "-t.webp");

/** Soft delete (ARCHIVED) or, with mode "hard", a real delete that is refused once the product was ever ordered. */
export async function deleteProduct(id: string, mode: "archive" | "hard", actor: Actor) {
  const p = await db.product.findUnique({ where: { id }, select: { id: true, name: true, sku: true, _count: { select: { orderItems: true, inBundles: true } } } });
  if (!p) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
  if (mode === "archive") {
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { status: "ARCHIVED" } });
      await writeAudit({ actorUserId: actor.id, action: "product.archive", entity: "Product", entityId: id, diff: { name: p.name, sku: p.sku }, ip: actor.ip }, tx);
    });
    return { archived: true };
  }
  if (p._count.orderItems > 0) throw new AppError("CONFLICT", "Bu ürün daha önce sipariş edildiği için silinemez. Arşive alabilirsiniz.");
  if (p._count.inBundles > 0) throw new AppError("CONFLICT", "Bu ürün bir pakette kullanıldığı için silinemez.");
  const files = await db.digitalFile.findMany({ where: { productId: id }, select: { storageKey: true } });
  const images = await db.productImage.findMany({ where: { productId: id }, select: { storageKey: true } });
  await db.$transaction(async (tx) => {
    await tx.digitalFile.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
    await writeAudit({ actorUserId: actor.id, action: "product.delete", entity: "Product", entityId: id, diff: { name: p.name, sku: p.sku }, ip: actor.ip }, tx);
  });
  const { getStorage } = await import("../storage");
  const st = getStorage();
  await Promise.allSettled([
    ...files.map((f) => st.deleteObject({ bucket: "private", key: f.storageKey })),
    ...images.filter((i) => i.storageKey).flatMap((i) => [st.deleteObject({ bucket: "public", key: i.storageKey! }), st.deleteObject({ bucket: "public", key: thumbKey(i.storageKey!) })]),
  ]);
  return { deleted: true };
}

export interface ProductListQuery {
  q?: string; type?: string; status?: string; categoryId?: string; page: number; pageSize: number;
}

export async function listProducts(q: ProductListQuery) {
  const where: Prisma.ProductWhereInput = {};
  if (q.type) where.type = q.type as never;
  if (q.status) where.status = q.status as never;
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.q) {
    const n = normalizeTurkish(q.q);
    where.OR = [{ searchText: { contains: n } }, { sku: { contains: q.q, mode: "insensitive" } }, { slug: { contains: slugifyTr(q.q) || "-" } }];
  }
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where, orderBy: [{ updatedAt: "desc" }], skip: (q.page - 1) * q.pageSize, take: q.pageSize,
      select: {
        id: true, name: true, slug: true, sku: true, type: true, status: true, priceKurus: true, isDemo: true, updatedAt: true,
        category: { select: { name: true } }, images: { orderBy: { sort: "asc" }, take: 1, select: { url: true, alt: true } },
      },
    }),
  ]);
  return {
    total, page: q.page, pageSize: q.pageSize,
    items: rows.map((r) => ({
      id: r.id, name: r.name, slug: r.slug, sku: r.sku, type: r.type, status: r.status, priceKurus: r.priceKurus, isDemo: r.isDemo,
      categoryName: r.category?.name ?? null, imageUrl: r.images[0]?.url ?? null, imageAlt: r.images[0]?.alt ?? "", updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

export async function getAdminProduct(id: string) {
  const p = await db.product.findUnique({
    where: { id },
    include: {
      collections: { select: { collectionId: true } }, tags: { select: { tagId: true } }, licenses: { select: { licenseId: true } },
      variants: { orderBy: { sort: "asc" }, include: { inventory: true } }, options: { orderBy: { sort: "asc" } },
      images: { orderBy: { sort: "asc" } }, embroidery: true, formats: { include: { format: true } },
      digitalFiles: { orderBy: [{ createdAt: "desc" }], include: { format: true } },
      _count: { select: { orderItems: true } },
    },
  });
  if (!p) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
  const issues = await publishIssues(db, id);
  const currentFormats = new Set(p.digitalFiles.filter((f) => f.isCurrent && f.status === "ACTIVE").map((f) => f.format.code));
  const vopts = (v: { options: unknown }) => (v.options ?? {}) as Record<string, string>;
  return {
    id: p.id, slug: p.slug, sku: p.sku, type: p.type, status: p.status, name: p.name, shortDescription: p.shortDescription, description: p.description,
    highlights: p.highlights, usageAreas: p.usageAreas, priceKurus: p.priceKurus, compareAtPriceKurus: p.compareAtPriceKurus,
    seoTitle: p.seoTitle, seoDescription: p.seoDescription, personalizable: p.personalizable, isNew: p.isNew, isFeatured: p.isFeatured, isDemo: p.isDemo,
    physicalInfo: (p.physicalInfo ?? null) as Record<string, unknown> | null, categoryId: p.categoryId,
    collectionIds: p.collections.map((c) => c.collectionId), tagIds: p.tags.map((t) => t.tagId), licenseIds: p.licenses.map((l) => l.licenseId),
    variants: p.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, size: vopts(v).size ?? "", color: vopts(v).color ?? "", priceKurus: v.priceKurus, active: v.active, onHand: v.inventory?.onHand ?? null })),
    options: p.options.map((o) => ({ key: o.key, label: o.label, type: o.type, required: o.required, minLength: o.minLength, maxLength: o.maxLength, choices: (o.choices ?? null) as string[] | null, priceDeltaKurus: o.priceDeltaKurus })),
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, sort: i.sort, uploaded: !!i.storageKey })),
    embroidery: p.embroidery ? {
      designWidthMm: p.embroidery.designWidthMm, designHeightMm: p.embroidery.designHeightMm, stitchCount: p.embroidery.stitchCount, colorCount: p.embroidery.colorCount,
      colorChanges: p.embroidery.colorChanges, hoopSizeId: p.embroidery.hoopSizeId, technique: p.embroidery.technique, fabricRecommendations: p.embroidery.fabricRecommendations,
      downloadTerms: p.embroidery.downloadTerms, usageInstructions: p.embroidery.usageInstructions, metadataSource: p.embroidery.metadataSource,
    } : null,
    declaredFormats: p.formats.map((f) => ({ code: f.format.code, hasFile: currentFormats.has(f.format.code) })),
    files: p.digitalFiles.map((f) => ({ id: f.id, formatCode: f.format.code, version: f.version, isCurrent: f.isCurrent, status: f.status, sizeBytes: f.sizeBytes, sha256: f.sha256, originalName: f.originalName, createdAt: f.createdAt.toISOString(), parsed: f.parsedMeta !== null })),
    publishIssues: issues, hasOrders: p._count.orderItems > 0, updatedAt: p.updatedAt.toISOString(),
  };
}

export type AdminProduct = Awaited<ReturnType<typeof getAdminProduct>>;

/** Lookup lists for forms. */
export async function getFormOptions() {
  const [categories, collections, tags, licenses, hoops, formats] = await Promise.all([
    db.category.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true } }),
    db.collection.findMany({ orderBy: [{ sort: "asc" }], select: { id: true, title: true } }),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.license.findMany({ orderBy: { sort: "asc" }, select: { id: true, name: true, code: true } }),
    db.hoopSize.findMany({ orderBy: [{ widthMm: "asc" }, { heightMm: "asc" }], select: { id: true, label: true } }),
    db.fileFormat.findMany({ orderBy: { sort: "asc" }, select: { code: true } }),
  ]);
  return { categories, collections, tags, licenses, hoops, formats: formats.map((f) => f.code) };
}
export type FormOptions = Awaited<ReturnType<typeof getFormOptions>>;
