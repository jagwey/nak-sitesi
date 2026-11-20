import type { DbClient } from "./db";

/** Lock an order row for the rest of the transaction. */
export async function lockOrder(tx: DbClient, orderId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
}
