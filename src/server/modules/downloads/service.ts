import "server-only";
import { AppError } from "../../errors";
import { db } from "../../db";
import { getEnv } from "../../env";
import { hashIp } from "../../crypto";
import { enforceRateLimit } from "../../rate-limit";
import { getStorage, type SignedDownloadInput } from "../storage";

export type Signer = (input: SignedDownloadInput) => Promise<string>;

/** The signed-in user's entitlements. Never exposes storage keys. */
export async function listUserDownloads(userId: string) {
  const rows = await db.downloadEntitlement.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      orderItem: { select: { productName: true, format: true, license: true, order: { select: { number: true, status: true } } } },
      digitalFile: { select: { originalName: true, downloadLabel: true } },
    },
  });
  const now = Date.now();
  return rows.map((e) => {
    const orderOk = e.orderItem.order.status !== "CANCELLED" && e.orderItem.order.status !== "REFUNDED" && e.orderItem.order.status !== "PENDING_PAYMENT";
    const expired = !!e.expiresAt && e.expiresAt.getTime() <= now;
    return {
      id: e.id,
      productName: e.orderItem.productName,
      fileName: e.digitalFile?.originalName ?? null,
      downloadLabel: e.digitalFile?.downloadLabel || null,
      format: e.orderItem.format,
      license: e.orderItem.license,
      orderNumber: e.orderItem.order.number,
      remaining: e.remaining,
      expiresAt: e.expiresAt,
      available: orderOk && !e.revokedAt && !expired && e.remaining > 0 && !!e.digitalFileId,
      revoked: !!e.revokedAt,
      expired,
    };
  });
}

/**
 * Issue a short-lived signed URL. Ownership is part of the query (`where {id, userId}`) so another user's id is a plain 404.
 * The remaining-count decrement is one atomic conditional UPDATE, so parallel clicks can never overspend it.
 * Digital files are account-bound: guests cannot buy digital items, hence no guest download path.
 */
export async function createDownloadLink(
  user: { id: string },
  entitlementId: string,
  ip: string,
  userAgent: string | null,
  signer: Signer = (i) => getStorage().getSignedDownloadUrl(i)
) {
  await enforceRateLimit({ name: "download-link", id: user.id, limit: 20, windowSec: 600 });
  const ent = await db.downloadEntitlement.findFirst({
    where: { id: entitlementId, userId: user.id },
    include: { orderItem: { include: { order: { select: { status: true } } } }, digitalFile: true },
  });
  if (!ent) throw new AppError("NOT_FOUND", "İndirme hakkı bulunamadı.");
  const st = ent.orderItem.order.status;
  if (st === "PENDING_PAYMENT" || st === "CANCELLED") throw new AppError("FORBIDDEN", "Bu sipariş için ödeme tamamlanmadı.");
  if (st === "REFUNDED" || ent.revokedAt) throw new AppError("FORBIDDEN", "Bu indirme hakkı iptal edildi.");
  if (ent.expiresAt && ent.expiresAt.getTime() <= Date.now()) throw new AppError("FORBIDDEN", "İndirme süresi doldu.");
  if (ent.remaining <= 0) throw new AppError("FORBIDDEN", "İndirme hakkınız kalmadı.");

  // Follow newer versions of the same file from the purchase, keeping sizes separate.
  let file = ent.orderItem.format
    ? await db.digitalFile.findFirst({
        where: { productId: ent.productId, format: { code: ent.orderItem.format }, downloadLabel: ent.digitalFile?.downloadLabel ?? "", status: "ACTIVE", isCurrent: true },
        orderBy: { version: "desc" },
      })
    : null;
  if (!file && ent.digitalFile && ent.digitalFile.status === "ACTIVE") file = ent.digitalFile;
  if (!file) throw new AppError("NOT_FOUND", "Dosya şu anda hazır değil. Lütfen destekle iletişime geçin.");

  const dec = await db.downloadEntitlement.updateMany({
    where: { id: ent.id, userId: user.id, remaining: { gt: 0 }, revokedAt: null },
    data: { remaining: { decrement: 1 } },
  });
  if (dec.count === 0) throw new AppError("FORBIDDEN", "İndirme hakkınız kalmadı.");

  const ttl = getEnv().DOWNLOAD_URL_TTL_SECONDS;
  let url: string;
  try {
    url = await signer({ key: file.storageKey, ttlSeconds: ttl, filename: file.originalName });
  } catch {
    // Signing failed: hand the credit back so a storage outage doesn't burn downloads.
    await db.downloadEntitlement.update({ where: { id: ent.id }, data: { remaining: { increment: 1 } } });
    throw new AppError("INTERNAL", "İndirme bağlantısı oluşturulamadı.");
  }
  await db.downloadLog.create({ data: { entitlementId: ent.id, ipHash: hashIp(ip), userAgent: userAgent?.slice(0, 300) ?? null } });
  return { url, expiresInSeconds: ttl, remaining: ent.remaining - 1 };
}
