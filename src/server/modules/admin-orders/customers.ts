import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ADMIN_CODES } from "@/lib/admin-roles";
import { AppError } from "../../errors";
import { db } from "../../db";
import { writeAudit } from "../../audit";
import { deleteUserSessions } from "../auth/session";
import { requestEmailVerification } from "../auth/service";

/** Customers = users without any back-office role. */
const customerWhere: Prisma.UserWhereInput = { roles: { none: { role: { code: { in: ADMIN_CODES } } } } };

export async function listCustomers(f: { search?: string; page?: number; pageSize?: number }) {
  const pageSize = f.pageSize ?? 25;
  const page = f.page ?? 1;
  const q = f.search?.trim();
  const where: Prisma.UserWhereInput = {
    ...customerWhere,
    ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, email: true, name: true, status: true, emailVerifiedAt: true, createdAt: true, _count: { select: { orders: true } } },
    }),
  ]);
  return { total, page, pageSize, customers: rows.map(({ _count, emailVerifiedAt, ...u }) => ({ ...u, emailVerified: !!emailVerifiedAt, orderCount: _count.orders })) };
}

export async function getCustomer(id: string) {
  const u = await db.user.findFirst({
    where: { id, ...customerWhere },
    select: {
      id: true, email: true, name: true, phone: true, status: true, emailVerifiedAt: true, createdAt: true, lastLoginAt: true,
      addresses: { select: { id: true, label: true, fullName: true, phone: true, line1: true, line2: true, city: true, district: true, postalCode: true } },
      orders: { orderBy: { placedAt: "desc" }, take: 50, select: { id: true, number: true, status: true, paymentStatus: true, totalKurus: true, placedAt: true } },
      entitlements: { select: { id: true, remaining: true, expiresAt: true, revokedAt: true, product: { select: { name: true } } } },
      wishlist: { select: { _count: { select: { items: true } } } },
    },
  });
  if (!u) throw new AppError("NOT_FOUND", "Müşteri bulunamadı.");
  const { wishlist, emailVerifiedAt, entitlements, ...rest } = u;
  return {
    ...rest,
    emailVerified: !!emailVerifiedAt,
    favoritesCount: wishlist?._count.items ?? 0,
    entitlements: entitlements.map((e) => ({ id: e.id, remaining: e.remaining, expiresAt: e.expiresAt, revokedAt: e.revokedAt, productName: e.product.name })),
  };
}

async function assertCustomer(id: string) {
  const u = await db.user.findFirst({ where: { id, ...customerWhere }, select: { id: true, status: true, email: true } });
  if (!u) throw new AppError("NOT_FOUND", "Müşteri bulunamadı.");
  return u;
}

export async function setCustomerStatus(id: string, status: "ACTIVE" | "DISABLED", actorId: string, ip?: string | null) {
  await assertCustomer(id);
  await db.user.update({ where: { id }, data: { status } });
  if (status === "DISABLED") await deleteUserSessions(id);
  await writeAudit({ actorUserId: actorId, action: status === "DISABLED" ? "customer.disable" : "customer.enable", entity: "User", entityId: id, ip });
  return getCustomer(id);
}

export async function resendVerification(id: string, actorId: string, ip: string) {
  await assertCustomer(id);
  await requestEmailVerification(id, { ip });
  await writeAudit({ actorUserId: actorId, action: "customer.resend_verification", entity: "User", entityId: id, ip });
}

/** KVKK data-subject export. No password hash, tokens or session data. */
export async function exportCustomerData(id: string, actorId: string, ip?: string | null) {
  await assertCustomer(id);
  const u = await db.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, email: true, name: true, phone: true, status: true, createdAt: true, emailVerifiedAt: true,
      addresses: true,
      orders: { include: { items: true } },
      customOrders: { include: { attachments: { select: { originalName: true, mimeType: true, sizeBytes: true } }, messages: true } },
      wishlist: { include: { items: { select: { productId: true, createdAt: true } } } },
    },
  });
  const { orders, ...rest } = u;
  await writeAudit({ actorUserId: actorId, action: "customer.export", entity: "User", entityId: id, ip });
  return {
    exportedAt: new Date().toISOString(),
    profile: rest,
    orders: orders.map(({ guestAccessTokenHash: _g, ...o }) => {
      void _g;
      return o;
    }),
  };
}

/** KVKK erasure: personal fields are overwritten; orders stay (totals, items) for accounting. */
export async function anonymizeCustomer(id: string, actorId: string, ip?: string | null) {
  await assertCustomer(id);
  const anon = `deleted-${id}@anon.invalid`;
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { email: anon, name: null, phone: null, status: "DISABLED", anonymizedAt: new Date(), passwordHash: "!", emailVerifiedAt: null, failedLoginCount: 0, lockedUntil: null },
    });
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.verificationToken.deleteMany({ where: { userId: id } });
    await tx.address.deleteMany({ where: { userId: id } });
    await tx.order.updateMany({ where: { userId: id }, data: { email: anon, phone: null, shippingAddress: { anonymized: true }, billingAddress: { anonymized: true }, customerNote: null } });
    await tx.customOrder.updateMany({ where: { userId: id }, data: { name: "Anonim", email: anon, phone: null } });
    await tx.notification.updateMany({ where: { userId: id }, data: { toAddress: null, payload: {} } });
    await writeAudit({ actorUserId: actorId, action: "customer.anonymize", entity: "User", entityId: id, ip }, tx);
  });
  return { ok: true };
}
