import "server-only";
import { db } from "@/server/db";

const TR_OFFSET_MS = 3 * 3600 * 1000; // Europe/Istanbul is fixed UTC+3

/** Start of "today" and "this month" in Istanbul time, as UTC instants. */
export function istanbulBounds(now = new Date()) {
  const local = new Date(now.getTime() + TR_OFFSET_MS);
  const y = local.getUTCFullYear(), m = local.getUTCMonth(), d = local.getUTCDate();
  return { dayStart: new Date(Date.UTC(y, m, d) - TR_OFFSET_MS), monthStart: new Date(Date.UTC(y, m, 1) - TR_OFFSET_MS) };
}

export interface DashboardData {
  today: { paidOrders: number; revenueKurus: number };
  month: { paidOrders: number; revenueKurus: number };
  pendingPayment: number;
  awaitingShipment: number;
  lowStock: number;
  openCustomOrders: number;
  recentOrders: { id: string; number: string; email: string; status: string; paymentStatus: string; totalKurus: number; placedAt: string }[];
  productsByStatus: { DRAFT: number; ACTIVE: number; ARCHIVED: number };
  demoProducts: number;
  totalOrders: number;
}

/** Sections are only computed for the permissions the viewer actually has. */
export async function getDashboard(perms: Set<string>): Promise<Partial<DashboardData>> {
  const out: Partial<DashboardData> = {};
  const { dayStart, monthStart } = istanbulBounds();
  const tasks: Promise<void>[] = [];

  if (perms.has("order:read")) {
    tasks.push((async () => {
      const paid = (from: Date) => db.order.aggregate({ where: { paymentStatus: "PAID", paidAt: { gte: from } }, _count: { _all: true }, _sum: { totalKurus: true } });
      const [t, m, pending, ship, recent, total] = await Promise.all([
        paid(dayStart), paid(monthStart),
        db.order.count({ where: { status: "PENDING_PAYMENT" } }),
        db.order.count({ where: { paymentStatus: "PAID", physicalFulfillmentStatus: { in: ["PENDING", "IN_PROGRESS"] }, status: { notIn: ["CANCELLED", "REFUNDED"] } } }),
        db.order.findMany({ orderBy: { placedAt: "desc" }, take: 5, select: { id: true, number: true, email: true, status: true, paymentStatus: true, totalKurus: true, placedAt: true } }),
        db.order.count(),
      ]);
      out.today = { paidOrders: t._count._all, revenueKurus: t._sum.totalKurus ?? 0 };
      out.month = { paidOrders: m._count._all, revenueKurus: m._sum.totalKurus ?? 0 };
      out.pendingPayment = pending;
      out.awaitingShipment = ship;
      out.totalOrders = total;
      out.recentOrders = recent.map((o) => ({ ...o, placedAt: o.placedAt.toISOString() }));
    })());
  }
  if (perms.has("product:read")) {
    tasks.push((async () => {
      const [groups, demo, low] = await Promise.all([
        db.product.groupBy({ by: ["status"], _count: { _all: true } }),
        db.product.count({ where: { isDemo: true } }),
        db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "Inventory" WHERE ("onHand" - "reserved") <= "lowStockThreshold"`,
      ]);
      const by = { DRAFT: 0, ACTIVE: 0, ARCHIVED: 0 };
      for (const g of groups) by[g.status as keyof typeof by] = g._count._all;
      out.productsByStatus = by;
      out.demoProducts = demo;
      out.lowStock = Number(low[0]?.n ?? 0);
    })());
  }
  if (perms.has("customorder:read")) {
    tasks.push((async () => {
      out.openCustomOrders = await db.customOrder.count({ where: { status: { in: ["NEW", "REVIEWING", "QUOTED", "ACCEPTED"] } } });
    })());
  }
  await Promise.all(tasks);
  return out;
}
