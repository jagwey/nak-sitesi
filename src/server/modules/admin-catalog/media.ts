import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { writeAudit } from "@/server/audit";
import { getStorage, newObjectKey, safeDownloadName } from "../storage";
import { processImageUpload, validateEmbroideryFile } from "../uploads";
import { parseEmbroideryBuffer } from "../embroidery";
import { reindexProducts } from "../search";
import { imageThumbnailPath } from "@/lib/product-image";
import type { Actor } from "./products";
import { Prisma } from "@/generated/prisma/client";

async function fileBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

/** Generic image upload into the PUBLIC bucket (used by categories/collections too). */
export async function uploadPublicImage(file: File, prefix: string) {
  const out = await processImageUpload(await fileBuffer(file));
  if (!out.ok) throw new AppError("VALIDATION", out.message);
  const st = getStorage();
  const key = `${newObjectKey("webp", prefix)}`;
  await st.putObject({ bucket: "public", key, body: out.main, contentType: "image/webp" });
  await st.putObject({ bucket: "public", key: imageThumbnailPath(key), body: out.thumb, contentType: "image/webp" });
  return { key, url: st.publicUrl(key), width: out.width, height: out.height };
}

export async function addProductImage(productId: string, file: File, alt: string, actor: Actor) {
  const p = await db.product.findUnique({ where: { id: productId }, select: { id: true, _count: { select: { images: true } } } });
  if (!p) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
  if (p._count.images >= 12) throw new AppError("VALIDATION", "Bir ürüne en fazla 12 görsel eklenebilir.");
  const up = await uploadPublicImage(file, "products");
  try {
    const img = await db.$transaction(async (tx) => {
      const last = await tx.productImage.aggregate({ where: { productId }, _max: { sort: true } });
      const row = await tx.productImage.create({ data: { productId, storageKey: up.key, url: up.url, alt, sort: (last._max.sort ?? -1) + 1 } });
      await writeAudit({ actorUserId: actor.id, action: "product.image_add", entity: "Product", entityId: productId, diff: { imageId: row.id, alt }, ip: actor.ip }, tx);
      return row;
    });
    return { id: img.id, url: img.url, alt: img.alt, sort: img.sort, uploaded: true };
  } catch (e) {
    await Promise.allSettled([st().deleteObject({ bucket: "public", key: up.key }), st().deleteObject({ bucket: "public", key: imageThumbnailPath(up.key) })]);
    throw e;
  }
}
const st = () => getStorage();

export async function updateImageAlt(productId: string, imageId: string, alt: string, actor: Actor) {
  const img = await db.productImage.findFirst({ where: { id: imageId, productId } });
  if (!img) throw new AppError("NOT_FOUND", "Görsel bulunamadı.");
  await db.$transaction(async (tx) => {
    await tx.productImage.update({ where: { id: imageId }, data: { alt } });
    await writeAudit({ actorUserId: actor.id, action: "product.image_alt", entity: "Product", entityId: productId, diff: { imageId, alt: { from: img.alt, to: alt } }, ip: actor.ip }, tx);
  });
  return { ok: true };
}

export async function deleteProductImage(productId: string, imageId: string, actor: Actor) {
  const img = await db.productImage.findFirst({ where: { id: imageId, productId }, include: { product: { select: { status: true } } } });
  if (!img) throw new AppError("NOT_FOUND", "Görsel bulunamadı.");
  const count = await db.productImage.count({ where: { productId } });
  if (img.product.status === "ACTIVE" && count <= 1) throw new AppError("CONFLICT", "Yayındaki ürünün son görseli silinemez. Önce yeni görsel ekleyin ya da ürünü taslağa alın.");
  await db.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });
    await writeAudit({ actorUserId: actor.id, action: "product.image_delete", entity: "Product", entityId: productId, diff: { imageId }, ip: actor.ip }, tx);
  });
  if (img.storageKey) await Promise.allSettled([st().deleteObject({ bucket: "public", key: img.storageKey }), st().deleteObject({ bucket: "public", key: imageThumbnailPath(img.storageKey) })]);
  return { ok: true };
}

/** `ids` is the complete new order; the first one is the cover. */
export async function reorderProductImages(productId: string, ids: string[], actor: Actor) {
  const cur = await db.productImage.findMany({ where: { productId }, select: { id: true } });
  const a = new Set(cur.map((c) => c.id));
  if (ids.length !== a.size || new Set(ids).size !== ids.length || !ids.every((i) => a.has(i))) {
    throw new AppError("VALIDATION", "Görsel sırası geçersiz.");
  }
  await db.$transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.productImage.update({ where: { id }, data: { sort: i } });
    await writeAudit({ actorUserId: actor.id, action: "product.image_reorder", entity: "Product", entityId: productId, diff: { order: ids }, ip: actor.ip }, tx);
  });
  return { ok: true };
}

export interface UploadedFileResult {
  id: string;
  formatCode: string;
  version: number;
  duplicate: boolean;
  parsed: boolean;
  note: string;
  sizeBytes: number;
}

/** Upload/replace a digital embroidery file (PRIVATE bucket). */
export async function uploadEmbroideryFile(productId: string, file: File, actor: Actor): Promise<UploadedFileResult> {
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, type: true } });
  if (!product) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
  if (product.type !== "DIGITAL_EMBROIDERY") throw new AppError("VALIDATION", "Nakış dosyası yalnızca dijital nakış ürünlerine yüklenebilir.");
  const buf = await fileBuffer(file);
  const check = validateEmbroideryFile(file.name, buf);
  if (!check.ok) throw new AppError("VALIDATION", check.message);
  const format = await db.fileFormat.findUnique({ where: { code: check.ext.toUpperCase() } });
  if (!format) throw new AppError("VALIDATION", `.${check.ext} biçimi sistemde tanımlı değil.`);

  const same = await db.digitalFile.findFirst({ where: { productId, formatId: format.id, isCurrent: true, status: "ACTIVE", sha256: check.sha256 } });
  if (same) {
    return { id: same.id, formatCode: format.code, version: same.version, duplicate: true, parsed: same.parsedMeta !== null, sizeBytes: same.sizeBytes, note: "Aynı dosya zaten yüklü; yeni sürüm oluşturulmadı." };
  }

  const parsed = await parseEmbroideryBuffer(buf, file.name);
  const key = newObjectKey(check.ext, "embroidery");
  await st().putObject({ bucket: "private", key, body: buf, contentType: "application/octet-stream" });
  try {
    const row = await db.$transaction(async (tx) => {
      const last = await tx.digitalFile.aggregate({ where: { productId, formatId: format.id }, _max: { version: true } });
      await tx.digitalFile.updateMany({ where: { productId, formatId: format.id, isCurrent: true }, data: { isCurrent: false, status: "REPLACED" } });
      const created = await tx.digitalFile.create({
        data: {
          productId, formatId: format.id, storageKey: key, originalName: file.name.slice(0, 200), sizeBytes: check.sizeBytes, sha256: check.sha256,
          version: (last._max.version ?? 0) + 1, isCurrent: true, status: "ACTIVE",
          parsedMeta: parsed.parsed ? (parsed as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        },
      });
      await tx.productFormat.createMany({ data: [{ productId, formatId: format.id }], skipDuplicates: true });
      if (parsed.parsed) {
        const meta = await tx.embroideryMetadata.findUnique({ where: { productId } });
        const fill = {
          designWidthMm: Math.round(parsed.widthMm), designHeightMm: Math.round(parsed.heightMm), stitchCount: parsed.stitchCount,
          colorCount: parsed.colorCount, colorChanges: parsed.colorChanges,
        };
        if (!meta) await tx.embroideryMetadata.create({ data: { productId, ...fill, threadColors: parsed.threads as unknown as Prisma.InputJsonValue, metadataSource: "PARSED" } });
        else {
          const patch: Record<string, number> = {};
          for (const [k, v] of Object.entries(fill)) if ((meta as unknown as Record<string, number | null>)[k] == null) patch[k] = v;
          if (Object.keys(patch).length) await tx.embroideryMetadata.update({ where: { productId }, data: { ...patch, metadataSource: "PARSED" } });
        }
      }
      await writeAudit({ actorUserId: actor.id, action: "file.upload", entity: "DigitalFile", entityId: created.id, diff: { productId, format: format.code, version: created.version, sizeBytes: check.sizeBytes, sha256: check.sha256, verification: check.verification, parsed: parsed.parsed }, ip: actor.ip }, tx);
      return created;
    });
    await reindexProducts(db, [productId]);
    return {
      id: row.id, formatCode: format.code, version: row.version, duplicate: false, parsed: parsed.parsed, sizeBytes: row.sizeBytes,
      note: parsed.parsed ? "Dosyadan okundu: dikiş, boyut ve renk bilgileri boş alanlara işlendi." : "Dosya çözümlenemedi, bilgileri elle girin.",
    };
  } catch (e) {
    await st().deleteObject({ bucket: "private", key }).catch(() => undefined);
    throw e;
  }
}

export async function listDigitalFiles(q: { q?: string; page: number; pageSize: number }) {
  const where: Prisma.DigitalFileWhereInput = { status: { not: "DELETED" } };
  if (q.q) where.OR = [{ product: { name: { contains: q.q, mode: "insensitive" } } }, { product: { sku: { contains: q.q, mode: "insensitive" } } }, { originalName: { contains: q.q, mode: "insensitive" } }];
  const [total, rows] = await Promise.all([
    db.digitalFile.count({ where }),
    db.digitalFile.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: { product: { select: { id: true, name: true, sku: true } }, format: { select: { code: true } } } }),
  ]);
  return {
    total, page: q.page, pageSize: q.pageSize,
    items: rows.map((f) => ({
      id: f.id, productId: f.product.id, productName: f.product.name, productSku: f.product.sku, formatCode: f.format.code, version: f.version, sizeBytes: f.sizeBytes,
      sha256: f.sha256, isCurrent: f.isCurrent, status: f.status, originalName: f.originalName, createdAt: f.createdAt.toISOString(),
    })),
  };
}

/** Short-lived signed URL for admins (audited). */
export async function adminFileDownloadUrl(fileId: string, actor: Actor) {
  const f = await db.digitalFile.findUnique({ where: { id: fileId }, include: { format: true } });
  if (!f || f.status === "DELETED") throw new AppError("NOT_FOUND", "Dosya bulunamadı.");
  const url = await st().getSignedDownloadUrl({ key: f.storageKey, ttlSeconds: 120, filename: safeDownloadName(f.originalName) });
  await writeAudit({ actorUserId: actor.id, action: "file.admin_download", entity: "DigitalFile", entityId: fileId, diff: { format: f.format.code, version: f.version }, ip: actor.ip });
  return { url, expiresInSec: 120 };
}

/** Soft delete: entitlements may reference the file, so only the status changes and the object is kept. */
export async function deleteDigitalFile(fileId: string, actor: Actor) {
  const f = await db.digitalFile.findUnique({ where: { id: fileId } });
  if (!f) throw new AppError("NOT_FOUND", "Dosya bulunamadı.");
  const product = await db.product.findUnique({ where: { id: f.productId }, select: { status: true } });
  if (f.isCurrent && product?.status === "ACTIVE") {
    const others = await db.digitalFile.count({ where: { productId: f.productId, isCurrent: true, status: "ACTIVE", id: { not: fileId } } });
    if (others === 0) throw new AppError("CONFLICT", "Yayındaki dijital ürünün son güncel dosyası silinemez.");
  }
  await db.$transaction(async (tx) => {
    await tx.digitalFile.update({ where: { id: fileId }, data: { status: "DELETED", isCurrent: false } });
    await writeAudit({ actorUserId: actor.id, action: "file.delete", entity: "DigitalFile", entityId: fileId, diff: { productId: f.productId, version: f.version }, ip: actor.ip }, tx);
  });
  await reindexProducts(db, [f.productId]);
  return { ok: true };
}
