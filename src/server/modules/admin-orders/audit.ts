import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../../db";

export async function listAuditLogs(f: { action?: string; entity?: string; actor?: string; from?: string; to?: string; page?: number; pageSize?: number }) {
  const pageSize = f.pageSize ?? 50;
  const page = f.page ?? 1;
  const where: Prisma.AuditLogWhereInput = {
    ...(f.action ? { action: { contains: f.action, mode: "insensitive" } } : {}),
    ...(f.entity ? { entity: f.entity } : {}),
    ...(f.actor ? { actor: { email: { contains: f.actor, mode: "insensitive" } } } : {}),
    ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: new Date(`${f.from}T00:00:00.000Z`) } : {}), ...(f.to ? { lte: new Date(`${f.to}T23:59:59.999Z`) } : {}) } } : {}),
  };
  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { actor: { select: { email: true } } } }),
  ]);
  return {
    total, page, pageSize,
    logs: rows.map((l) => ({ id: l.id, createdAt: l.createdAt, action: l.action, entity: l.entity, entityId: l.entityId, actorEmail: l.actor?.email ?? null, ipHash: l.ipHash, diff: l.diff })),
  };
}
