import Link from "next/link";
import { PageHeader, Panel, Notice, EmptyState, StatusBadge } from "@/components/admin";
import { formatTRY } from "@/lib/format";
import { getDashboard } from "@/server/modules/admin-catalog/dashboard";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Panel" };

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <div className="h-full rounded-lg border border-hairline bg-white p-4">
      <p className="text-xs text-stone">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-umber tabular-nums">{sub}</p> : null}
    </div>
  );
  return href ? <Link href={href} className="block focus-visible:outline-2 focus-visible:outline-gold">{body}</Link> : body;
}

const STATUS_LABEL: Record<string, string> = { DRAFT: "Taslak", ACTIVE: "Yayında", ARCHIVED: "Arşiv" };

export default async function AdminDashboardPage() {
  const user = await requireAdminPage();
  const d = await getDashboard(new Set(user.permissions));
  const none = !d.today && !d.productsByStatus && d.openCustomOrders === undefined;

  return (
    <>
      <PageHeader title="Panel" description="Mağazanın güncel durumu. Tüm rakamlar veritabanından gelir." />

      {d.demoProducts ? (
        <div className="mb-5">
          <Notice tone="warn">Demo ürün: {d.demoProducts} — yayına almadan önce gerçek veriyle değiştirin</Notice>
        </div>
      ) : null}

      {none ? <EmptyState title="Bu hesap için gösterilecek özet yok" description="Soldaki menüden yetkili olduğunuz bölümlere geçebilirsiniz." /> : null}

      {d.today && d.month ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Bugün ödenen sipariş" value={String(d.today.paidOrders)} sub={formatTRY(d.today.revenueKurus)} href="/admin/siparisler" />
          <Stat label="Bu ay ödenen sipariş" value={String(d.month.paidOrders)} sub={formatTRY(d.month.revenueKurus)} href="/admin/siparisler" />
          <Stat label="Ödeme bekleyen" value={String(d.pendingPayment ?? 0)} href="/admin/siparisler" />
          <Stat label="Kargo bekleyen" value={String(d.awaitingShipment ?? 0)} href="/admin/siparisler" />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {d.lowStock !== undefined ? <Stat label="Düşük stok" value={String(d.lowStock)} href="/admin/stok?low=1" /> : null}
        {d.openCustomOrders !== undefined ? <Stat label="Açık kişiye özel talep" value={String(d.openCustomOrders)} href="/admin/ozel-siparisler" /> : null}
        {d.productsByStatus ? (
          <>
            <Stat label="Yayındaki ürün" value={String(d.productsByStatus.ACTIVE)} href="/admin/urunler?status=ACTIVE" />
            <Stat label="Taslak ürün" value={String(d.productsByStatus.DRAFT)} href="/admin/urunler?status=DRAFT" />
          </>
        ) : null}
      </div>

      {d.recentOrders ? (
        <div className="mt-6">
          <Panel title="Son siparişler">
            {d.recentOrders.length === 0 ? (
              <p className="text-sm text-umber">Henüz sipariş yok.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {d.recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/siparisler/${o.id}`} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-gold-text">
                      <span className="min-w-0">
                        <span className="font-semibold tabular-nums">{o.number}</span>
                        <span className="ml-2 truncate text-stone">{o.email}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <StatusBadge>{o.status}</StatusBadge>
                        <span className="tabular-nums">{formatTRY(o.totalKurus)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}

      {d.productsByStatus ? (
        <p className="mt-4 text-xs text-stone tabular-nums">
          Ürünler: {Object.entries(d.productsByStatus).map(([k, v]) => `${STATUS_LABEL[k] ?? k} ${v}`).join(" · ")}
        </p>
      ) : null}
    </>
  );
}
