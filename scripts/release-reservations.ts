// Sweep expired stock reservations and cancel the unpaid orders that held them.
//   npm run jobs:release-reservations      (run from cron every few minutes)
// Imports no "server-only" modules (tsx does not use the react-server condition).
import { createScriptClient } from "../prisma/script-client";
import { expireReservations } from "../src/server/modules/orders/lifecycle";

async function main() {
  const db = createScriptClient();
  try {
    const r = await expireReservations(db);
    console.log(`Reservations swept: ${r.expiredOrders} order(s) expired, ${r.cancelledOrders} cancelled.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
