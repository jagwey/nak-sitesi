import "server-only";
import { z } from "zod";
import { db, type DbClient } from "@/server/db";
import { AppError } from "@/server/errors";
import { writeAudit } from "@/server/audit";
import { slugifyTr } from "@/lib/slug";
import { reindexProducts } from "../search";
import type { Actor } from "./products";
import type { categorySchema, collectionSchema, tagSchema } from "./schema";

type CategoryInput = z.infer<typeof categorySchema>;
type CollectionInput = z.infer<typeof collectionSchema>;
type TagInput = z.infer<typeof tagSchema>;

type SlugModel = "category" | "collection" | "tag";
async function uniqueSlug(client: DbClient, model: SlugModel, base: string, excludeId?: string) {
  const root = base || model;
  for (let i = 0; i < 200; i++) {
    const cand = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await (client[model] as unknown as { findUnique(a: unknown): Promise<{ id: string } | null> }).findUnique({ where: { slug: cand }, select: { id: true } });
    if (!hit || hit.id === excludeId) return cand;
  }
  throw new AppError("CONFLICT", "Benzersiz bağlantı üretilemedi.");
}
async function explicitSlug(client: DbClient, model: SlugModel, slug: string, excludeId?: string) {
  const s = await uniqueSlug(client, model, slug, excludeId);
  if (s !== slug) throw new AppError("CONFLICT", "Bu bağlantı kullanılıyor.", { details: [{ path: "slug", message: "Bu bağlantı kullanılıyor." }] });
  return s;
}

// ───────── Categories ─────────
export async function listCategories() {
  const rows = await db.category.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return rows.map((c) => ({
    id: c.id, slug: c.slug, name: c.name, description: c.description, image: c.image, imageAlt: c.imageAlt, seoTitle: c.seoTitle, seoDescription: c.seoDescription, featuredType: c.featuredType, parentId: c.parentId,
    sort: c.sort, active: c.active, productCount: c._count.products,
  }));
}

async function assertNoCycle(client: DbClient, id: string, parentId: string | null) {
  let cur = parentId;
  for (let i = 0; cur && i < 50; i++) {
    if (cur === id) throw new AppError("VALIDATION", "Bir kategori kendi alt kategorisinin altına taşınamaz.");
    cur = (await client.category.findUnique({ where: { id: cur }, select: { parentId: true } }))?.parentId ?? null;
  }
}

export async function createCategory(input: CategoryInput, actor: Actor) {
  return db.$transaction(async (tx) => {
    const slug = input.slug ? await explicitSlug(tx, "category", input.slug) : await uniqueSlug(tx, "category", slugifyTr(input.name));
    if (input.parentId && !(await tx.category.findUnique({ where: { id: input.parentId }, select: { id: true } }))) throw new AppError("VALIDATION", "Üst kategori bulunamadı.");
    const { slug: _s, ...rest } = input;
    const row = await tx.category.create({ data: { ...rest, slug } });
    await writeAudit({ actorUserId: actor.id, action: "category.create", entity: "Category", entityId: row.id, diff: { name: row.name, slug, parentId: row.parentId }, ip: actor.ip }, tx);
    return row;
  });
}

export async function updateCategory(id: string, input: CategoryInput, actor: Actor) {
  const row = await db.$transaction(async (tx) => {
    const before = await tx.category.findUnique({ where: { id } });
    if (!before) throw new AppError("NOT_FOUND", "Kategori bulunamadı.");
    await assertNoCycle(tx, id, input.parentId);
    const slug = input.slug && input.slug !== before.slug ? await explicitSlug(tx, "category", input.slug, id) : before.slug;
    const { slug: _s, ...rest } = input;
    const after = await tx.category.update({ where: { id }, data: { ...rest, slug } });
    await writeAudit({ actorUserId: actor.id, action: "category.update", entity: "Category", entityId: id, diff: { before: { name: before.name, slug: before.slug, parentId: before.parentId, active: before.active, sort: before.sort }, after: { name: after.name, slug, parentId: after.parentId, active: after.active, sort: after.sort } }, ip: actor.ip }, tx);
    return after;
  });
  const ids = (await db.product.findMany({ where: { categoryId: id }, select: { id: true } })).map((p) => p.id);
  if (ids.length) await reindexProducts(db, ids);
  return row;
}

export async function deleteCategory(id: string, actor: Actor) {
  const c = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
  if (!c) throw new AppError("NOT_FOUND", "Kategori bulunamadı.");
  if (c._count.products > 0) throw new AppError("CONFLICT", `Bu kategoride ${c._count.products} ürün var. Önce ürünleri başka kategoriye taşıyın.`);
  if (c._count.children > 0) throw new AppError("CONFLICT", "Alt kategorisi olan kategori silinemez.");
  await db.$transaction(async (tx) => {
    await tx.category.delete({ where: { id } });
    await writeAudit({ actorUserId: actor.id, action: "category.delete", entity: "Category", entityId: id, diff: { name: c.name }, ip: actor.ip }, tx);
  });
  return { ok: true };
}

// ───────── Collections ─────────
export async function listCollections() {
  const rows = await db.collection.findMany({ orderBy: [{ sort: "asc" }, { title: "asc" }], include: { _count: { select: { products: true } } } });
  return rows.map((c) => ({ id: c.id, slug: c.slug, title: c.title, subtitle: c.subtitle, image: c.image, imageAlt: c.imageAlt, sort: c.sort, active: c.active, productCount: c._count.products }));
}

export async function getCollection(id: string) {
  const c = await db.collection.findUnique({ where: { id }, include: { products: { orderBy: { sort: "asc" }, include: { product: { select: { id: true, name: true, sku: true, status: true } } } } } });
  if (!c) throw new AppError("NOT_FOUND", "Koleksiyon bulunamadı.");
  return {
    id: c.id, slug: c.slug, title: c.title, subtitle: c.subtitle, image: c.image, imageAlt: c.imageAlt, sort: c.sort, active: c.active,
    products: c.products.map((p) => ({ id: p.product.id, name: p.product.name, sku: p.product.sku, status: p.product.status })),
  };
}

export async function createCollection(input: CollectionInput, actor: Actor) {
  return db.$transaction(async (tx) => {
    const slug = input.slug ? await explicitSlug(tx, "collection", input.slug) : await uniqueSlug(tx, "collection", slugifyTr(input.title));
    const { slug: _s, ...rest } = input;
    const row = await tx.collection.create({ data: { ...rest, slug } });
    await writeAudit({ actorUserId: actor.id, action: "collection.create", entity: "Collection", entityId: row.id, diff: { title: row.title, slug }, ip: actor.ip }, tx);
    return row;
  });
}

export async function updateCollection(id: string, input: CollectionInput, actor: Actor) {
  return db.$transaction(async (tx) => {
    const before = await tx.collection.findUnique({ where: { id } });
    if (!before) throw new AppError("NOT_FOUND", "Koleksiyon bulunamadı.");
    const slug = input.slug && input.slug !== before.slug ? await explicitSlug(tx, "collection", input.slug, id) : before.slug;
    const { slug: _s, ...rest } = input;
    const after = await tx.collection.update({ where: { id }, data: { ...rest, slug } });
    await writeAudit({ actorUserId: actor.id, action: "collection.update", entity: "Collection", entityId: id, diff: { before: { title: before.title, slug: before.slug, active: before.active, sort: before.sort }, after: { title: after.title, slug, active: after.active, sort: after.sort } }, ip: actor.ip }, tx);
    return after;
  });
}

export async function setCollectionProducts(id: string, productIds: string[], actor: Actor) {
  if (new Set(productIds).size !== productIds.length) throw new AppError("VALIDATION", "Aynı ürün iki kez eklenemez.");
  await db.$transaction(async (tx) => {
    if (!(await tx.collection.findUnique({ where: { id }, select: { id: true } }))) throw new AppError("NOT_FOUND", "Koleksiyon bulunamadı.");
    const found = await tx.product.count({ where: { id: { in: productIds } } });
    if (found !== productIds.length) throw new AppError("VALIDATION", "Bazı ürünler bulunamadı.");
    await tx.productCollection.deleteMany({ where: { collectionId: id } });
    if (productIds.length) await tx.productCollection.createMany({ data: productIds.map((productId, sort) => ({ productId, collectionId: id, sort })) });
    await writeAudit({ actorUserId: actor.id, action: "collection.products", entity: "Collection", entityId: id, diff: { count: productIds.length }, ip: actor.ip }, tx);
  });
  return { ok: true };
}

export async function deleteCollection(id: string, actor: Actor) {
  const c = await db.collection.findUnique({ where: { id } });
  if (!c) throw new AppError("NOT_FOUND", "Koleksiyon bulunamadı.");
  await db.$transaction(async (tx) => {
    await tx.collection.delete({ where: { id } });
    await writeAudit({ actorUserId: actor.id, action: "collection.delete", entity: "Collection", entityId: id, diff: { title: c.title }, ip: actor.ip }, tx);
  });
  return { ok: true };
}

// ───────── Tags ─────────
export async function listTags() {
  const rows = await db.tag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  return rows.map((t) => ({ id: t.id, slug: t.slug, name: t.name, productCount: t._count.products }));
}

export async function createTag(input: TagInput, actor: Actor) {
  return db.$transaction(async (tx) => {
    const slug = input.slug ? await explicitSlug(tx, "tag", input.slug) : await uniqueSlug(tx, "tag", slugifyTr(input.name));
    const row = await tx.tag.create({ data: { name: input.name, slug } });
    await writeAudit({ actorUserId: actor.id, action: "tag.create", entity: "Tag", entityId: row.id, diff: { name: row.name, slug }, ip: actor.ip }, tx);
    return row;
  });
}

export async function updateTag(id: string, input: TagInput, actor: Actor) {
  const row = await db.$transaction(async (tx) => {
    const before = await tx.tag.findUnique({ where: { id } });
    if (!before) throw new AppError("NOT_FOUND", "Etiket bulunamadı.");
    const slug = input.slug && input.slug !== before.slug ? await explicitSlug(tx, "tag", input.slug, id) : before.slug;
    const after = await tx.tag.update({ where: { id }, data: { name: input.name, slug } });
    await writeAudit({ actorUserId: actor.id, action: "tag.update", entity: "Tag", entityId: id, diff: { before: { name: before.name, slug: before.slug }, after: { name: after.name, slug } }, ip: actor.ip }, tx);
    return after;
  });
  const ids = (await db.productTag.findMany({ where: { tagId: id }, select: { productId: true } })).map((p) => p.productId);
  if (ids.length) await reindexProducts(db, ids);
  return row;
}

export async function deleteTag(id: string, actor: Actor) {
  const t = await db.tag.findUnique({ where: { id }, include: { products: { select: { productId: true } } } });
  if (!t) throw new AppError("NOT_FOUND", "Etiket bulunamadı.");
  await db.$transaction(async (tx) => {
    await tx.tag.delete({ where: { id } });
    await writeAudit({ actorUserId: actor.id, action: "tag.delete", entity: "Tag", entityId: id, diff: { name: t.name, productCount: t.products.length }, ip: actor.ip }, tx);
  });
  if (t.products.length) await reindexProducts(db, t.products.map((p) => p.productId));
  return { ok: true };
}
