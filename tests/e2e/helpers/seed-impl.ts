// E2E DB helpers (dev database, the one the dev server uses). Passwords are random and kept in memory only.
import { randomBytes } from "node:crypto";
import { createScriptClient } from "../../../prisma/script-client";
import { hashPassword } from "../../../src/server/modules/auth/password";

export const db = createScriptClient();
export const E2E_PREFIX = "e2e-";

export function randomPassword() {
  return `Pw-${randomBytes(12).toString("base64url")}`;
}
export function randomEmail(tag: string) {
  return `${E2E_PREFIX}${tag}-${randomBytes(4).toString("hex")}@example.com`;
}

/** Customer created directly (same fields the register service sets, e-mail verified). */
export async function createCustomer(tag = "cust") {
  const email = randomEmail(tag);
  const password = randomPassword();
  const role = await db.role.findUnique({ where: { code: "CUSTOMER" } });
  const user = await db.user.create({
    data: { email, passwordHash: await hashPassword(password), name: "E2E Müşteri", emailVerifiedAt: new Date() },
  });
  if (role) await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
  return { id: user.id, email, password };
}

/** Same code path as scripts/create-admin.ts (SUPER_ADMIN, upsert by e-mail). */
export async function createAdmin(tag = "admin") {
  const email = randomEmail(tag);
  const password = randomPassword();
  const role = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
  if (!role) throw new Error("SUPER_ADMIN role missing. Run `npm run db:seed` first.");
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash: await hashPassword(password), status: "ACTIVE", failedLoginCount: 0, lockedUntil: null, emailVerifiedAt: new Date() },
    create: { email, passwordHash: await hashPassword(password), name: "E2E Admin", emailVerifiedAt: new Date() },
  });
  await db.userRole.createMany({ data: [{ userId: user.id, roleId: role.id }], skipDuplicates: true });
  return { id: user.id, email, password };
}

/** Removes every e2e-* account plus the orders/data they created (dev DB only). */
export async function cleanupE2E() {
  const users = await db.user.findMany({ where: { email: { startsWith: E2E_PREFIX } }, select: { id: true, email: true } });
  const ids = users.map((u) => u.id);
  const orders = await db.order.findMany({ where: { OR: [{ userId: { in: ids } }, { email: { startsWith: E2E_PREFIX } }] }, select: { id: true } });
  const oids = orders.map((o) => o.id);
  const carts = await db.cart.findMany({ where: { userId: { in: ids } }, select: { id: true } });
  // Give back stock held by ACTIVE reservations of these orders/carts, then drop the reservations.
  const held = await db.inventoryReservation.findMany({ where: { status: "ACTIVE", OR: [{ orderId: { in: oids } }, { cartId: { in: carts.map((c) => c.id) } }] } });
  for (const r of held) await db.inventory.update({ where: { id: r.inventoryId }, data: { reserved: { decrement: r.quantity } } }).catch(() => undefined);
  await db.inventoryReservation.deleteMany({ where: { id: { in: held.map((r) => r.id) } } });
  if (oids.length) {
    await db.inventoryReservation.deleteMany({ where: { orderId: { in: oids } } });
    await db.downloadEntitlement.deleteMany({ where: { orderItem: { orderId: { in: oids } } } });
    await db.payment.deleteMany({ where: { orderId: { in: oids } } });
    await db.order.deleteMany({ where: { id: { in: oids } } });
  }
  await db.session.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
}

/** Dev-only: clear login/register throttles so repeated e2e runs never trip them. */
export async function resetAuthThrottles() {
  await db.rateLimit.deleteMany({});
}

export async function lastOrderOf(userId: string) {
  const o = await db.order.findFirstOrThrow({ where: { userId }, orderBy: { createdAt: "desc" } });
  return { status: o.status, paymentStatus: o.paymentStatus, number: o.number };
}

// CLI entry: `tsx seed-impl.ts <cmd> [arg]` prints JSON (run out-of-process because Playwright loads CJS).
async function main() {
  const [cmd, arg] = process.argv.slice(2);
  let out: unknown = null;
  if (cmd === "customer") out = await createCustomer(arg);
  else if (cmd === "admin") out = await createAdmin(arg);
  else if (cmd === "cleanup") await cleanupE2E();
  else if (cmd === "reset-throttles") await resetAuthThrottles();
  else if (cmd === "last-order") out = await lastOrderOf(arg);
  else throw new Error(`unknown cmd ${cmd}`);
  process.stdout.write("\n@@JSON@@" + JSON.stringify(out));
  await db.$disconnect();
}
void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
