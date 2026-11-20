import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "../../errors";
import { db } from "../../db";
import { writeAudit } from "../../audit";
import { loadPolicy } from "../settings/service";

export async function listDownloadLogs(f: { userId?: string; productId?: string; from?: string; to?: string; page?: number; pageSize?: number }) {
  const pageSize = f.pageSize ?? 25;
  const page = f.page ?? 1;
  const where: Prisma.DownloadLogWhereInput = {
    ...(f.userId || f.productId ? { entitlement: { ...(f.userId ? { userId: f.userId } : {}), ...(f.productId ? { productId: f.productId } : {}) } } : {}),
    ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: new Date(`${f.from}T00:00:00.000Z`) } : {}), ...(f.to ? { lte: new Date(`${f.to}T23:59:59.999Z`) } : {}) } } : {}),
  };
  const [total, rows] = await Promise.all([
    db.downloadLog.count({ where }),
    db.downloadLog.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      include: { entitlement: { select: { id: true, remaining: true, revokedAt: true, user: { select: { id: true, email: true } }, product: { select: { id: true, name: true } } } } },
    }),
  ]);
  return {
    total, page, pageSize,
    logs: rows.map((l) => ({
      id: l.id, createdAt: l.createdAt, ipHash: l.ipHash, // hashed only, never the raw IP
      entitlementId: l.entitlement.id, remaining: l.entitlement.remaining, revoked: !!l.entitlement.revokedAt,
      userEmail: l.entitlement.user?.email ?? null, productName: l.entitlement.product.name,
    })),
  };
}

export async function revokeEntitlement(id: string, reason: string, actorId: string, ip?: string | null) {
  const e = await db.downloadEntitlement.findUnique({ where: { id } });
  if (!e) throw new AppError("NOT_FOUND", "İndirme hakkı bulunamadı.");
  await db.$transaction(async (tx) => {
    await tx.downloadEntitlement.update({ where: { id }, data: { revokedAt: new Date(), revokeReason: reason } });
    await writeAudit({ actorUserId: actorId, action: "download.revoke", entity: "DownloadEntitlement", entityId: id, diff: { reason }, ip }, tx);
  });
  return { ok: true };
}

export async function resetEntitlement(id: string, actorId: string, ip?: string | null) {
  const e = await db.downloadEntitlement.findUnique({ where: { id } });
  if (!e) throw new AppError("NOT_FOUND", "İndirme hakkı bulunamadı.");
  const policy = await loadPolicy();
  await db.$transaction(async (tx) => {
    await tx.downloadEntitlement.update({
      where: { id },
      data: { remaining: policy.downloadLimit, revokedAt: null, revokeReason: null, expiresAt: policy.downloadExpiryDays > 0 ? new Date(Date.now() + policy.downloadExpiryDays * 86_400_000) : null },
    });
    await writeAudit({ actorUserId: actorId, action: "download.reset", entity: "DownloadEntitlement", entityId: id, diff: { remaining: policy.downloadLimit }, ip }, tx);
  });
  return { ok: true };
}
