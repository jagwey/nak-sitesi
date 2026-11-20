// Stock accounting. No "server-only" and no ../db import: shared with the CLI job (scripts/release-reservations.ts).
// Invariant: Inventory.reserved == sum(quantity) of ACTIVE reservations (stale ones swept by expireStale*).
// Reserving is ONE atomic conditional UPDATE, so concurrent checkouts for the last unit serialize on the row
// lock and exactly one succeeds.
import { AppError } from "../../errors";
import type { DbClient } from "../../db";

export interface StockRequest {
  inventoryId: string;
  quantity: number;
}

/** Live availability (onHand minus ACTIVE, unexpired reservations) — correct even before the sweep runs. */
export async function availableForInventories(client: DbClient, ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!ids.length) return out;
  const invs = await client.inventory.findMany({ where: { id: { in: ids } }, select: { id: true, onHand: true } });
  const sums = await client.inventoryReservation.groupBy({
    by: ["inventoryId"],
    where: { inventoryId: { in: ids }, status: "ACTIVE", expiresAt: { gt: new Date() } },
    _sum: { quantity: true },
  });
  const reserved = new Map(sums.map((s) => [s.inventoryId, s._sum.quantity ?? 0]));
  for (const i of invs) out.set(i.id, Math.max(0, i.onHand - (reserved.get(i.id) ?? 0)));
  return out;
}

async function decReserved(tx: DbClient, inventoryId: string, qty: number) {
  await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = GREATEST("reserved" - ${qty}, 0), "updatedAt" = now() WHERE "id" = ${inventoryId}`;
}

/** Mark ACTIVE-but-past-expiry reservations of the given inventories EXPIRED and free their counters. */
export async function expireStaleForInventories(tx: DbClient, inventoryIds: string[]): Promise<string[]> {
  if (!inventoryIds.length) return [];
  const stale = await tx.inventoryReservation.findMany({
    where: { inventoryId: { in: inventoryIds }, status: "ACTIVE", expiresAt: { lte: new Date() } },
    orderBy: { inventoryId: "asc" },
  });
  const orderIds = new Set<string>();
  for (const r of stale) {
    const c = await tx.inventoryReservation.updateMany({ where: { id: r.id, status: "ACTIVE" }, data: { status: "EXPIRED" } });
    if (c.count === 1) {
      await decReserved(tx, r.inventoryId, r.quantity);
      if (r.orderId) orderIds.add(r.orderId);
    }
  }
  return [...orderIds];
}

/**
 * Atomically reserve stock for an order inside the caller's transaction. Throws OUT_OF_STOCK (rolling the
 * caller's transaction back) when any line cannot be covered. Rows are touched in id order (no deadlocks).
 */
export async function reserveStock(tx: DbClient, requests: StockRequest[], opts: { orderId: string; expiresAt: Date }) {
  const merged = new Map<string, number>();
  for (const r of requests) merged.set(r.inventoryId, (merged.get(r.inventoryId) ?? 0) + r.quantity);
  const ids = [...merged.keys()].sort();
  await expireStaleForInventories(tx, ids);
  for (const id of ids) {
    const qty = merged.get(id)!;
    const n = await tx.$executeRaw`
      UPDATE "Inventory" SET "reserved" = "reserved" + ${qty}, "updatedAt" = now()
      WHERE "id" = ${id} AND "onHand" - "reserved" >= ${qty}`;
    if (n !== 1) throw new AppError("OUT_OF_STOCK");
    await tx.inventoryReservation.create({ data: { inventoryId: id, orderId: opts.orderId, quantity: qty, status: "ACTIVE", expiresAt: opts.expiresAt } });
  }
}

/** Release the order's ACTIVE reservations (cancel / expiry). Returns the number released. */
export async function releaseOrderReservations(tx: DbClient, orderId: string, status: "RELEASED" | "EXPIRED" = "RELEASED") {
  const rows = await tx.inventoryReservation.findMany({ where: { orderId, status: "ACTIVE" }, orderBy: { inventoryId: "asc" } });
  let n = 0;
  for (const r of rows) {
    const c = await tx.inventoryReservation.updateMany({ where: { id: r.id, status: "ACTIVE" }, data: { status } });
    if (c.count === 1) {
      await decReserved(tx, r.inventoryId, r.quantity);
      n++;
    }
  }
  return n;
}

/**
 * Payment verified: turn the order's reservations into real stock decrements. A reservation that already
 * expired is re-taken if stock remains; otherwise it is reported in `shortfalls` (order needs manual attention).
 */
export async function consumeOrderReservations(tx: DbClient, orderId: string) {
  const rows = await tx.inventoryReservation.findMany({ where: { orderId, status: { in: ["ACTIVE", "EXPIRED"] } }, orderBy: { inventoryId: "asc" } });
  const shortfalls: { inventoryId: string; quantity: number }[] = [];
  for (const r of rows) {
    if (r.status === "ACTIVE") {
      const c = await tx.inventoryReservation.updateMany({ where: { id: r.id, status: "ACTIVE" }, data: { status: "CONSUMED" } });
      if (c.count !== 1) continue;
      await tx.$executeRaw`UPDATE "Inventory" SET "onHand" = GREATEST("onHand" - ${r.quantity}, 0), "reserved" = GREATEST("reserved" - ${r.quantity}, 0), "updatedAt" = now() WHERE "id" = ${r.inventoryId}`;
    } else {
      const n = await tx.$executeRaw`UPDATE "Inventory" SET "onHand" = "onHand" - ${r.quantity}, "updatedAt" = now() WHERE "id" = ${r.inventoryId} AND "onHand" - "reserved" >= ${r.quantity}`;
      if (n === 1) await tx.inventoryReservation.update({ where: { id: r.id }, data: { status: "CONSUMED" } });
      else shortfalls.push({ inventoryId: r.inventoryId, quantity: r.quantity });
    }
  }
  return { shortfalls };
}

/** Admin stock adjustment (absolute onHand). */
export async function setOnHand(client: DbClient, inventoryId: string, onHand: number) {
  if (!Number.isInteger(onHand) || onHand < 0) throw new AppError("VALIDATION", "Stok adedi 0 veya daha büyük bir tam sayı olmalı.");
  return client.inventory.update({ where: { id: inventoryId }, data: { onHand } });
}
