import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { getProductsByIds } from "../catalog";

/** Every operation is scoped by the authenticated userId: there is no way to name another user's wishlist. */
export async function listFavorites(userId: string) {
  const w = await db.wishlist.findUnique({
    where: { userId },
    select: { items: { orderBy: { createdAt: "desc" }, select: { productId: true } } },
  });
  const ids = w?.items.map((i) => i.productId) ?? [];
  const products = await getProductsByIds(ids); // drops non-ACTIVE products
  return { productIds: products.map((p) => p.id), products };
}

export async function addFavorite(userId: string, productId: string) {
  const p = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true } });
  if (!p) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
  const w = await db.wishlist.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
  await db.wishlistItem.createMany({ data: [{ wishlistId: w.id, productId }], skipDuplicates: true });
}

export async function removeFavorite(userId: string, productId: string) {
  const w = await db.wishlist.findUnique({ where: { userId }, select: { id: true } });
  if (!w) return;
  await db.wishlistItem.deleteMany({ where: { wishlistId: w.id, productId } });
}
