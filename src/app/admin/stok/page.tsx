import Link from "next/link";
import { PageHeader, Pagination, EmptyState, btnCls } from "@/components/admin";
import { StockTable } from "@/components/admin/catalog/OpsClients";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";
import { listStock } from "@/server/modules/admin-catalog/inventory";

export const metadata = { title: "Stok" };
export const dynamic = "force-dynamic";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; low?: string; page?: string }> }) {
  const user = await requireAdminPage("product:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const low = sp.low === "1" ? ("1" as const) : undefined;
  const data = await listStock({ q, low, page, pageSize: 30 });
  return (
    <>
      <PageHeader title="Stok" description={`Fiziksel ürünler. ${data.lowCount} kalem düşük stokta.`} />
      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Ürün adı veya SKU" aria-label="Ara" className="min-h-11 w-full max-w-sm rounded-md border border-hairline-strong bg-white px-3 text-sm" />
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="low" value="1" defaultChecked={!!low} className="h-4 w-4" /> Yalnızca düşük stok</label>
        <button className={btnCls("primary")} type="submit">Filtrele</button>
        {q || low ? <Link href="/admin/stok" className={btnCls("ghost")}>Temizle</Link> : null}
      </form>
      {data.items.length === 0 ? <EmptyState title="Kayıt bulunamadı" description="Fiziksel ürün eklendiğinde stok burada görünür." /> : <StockTable rows={data.items} canWrite={user.permissions.includes("product:write")} />}
      <Pagination basePath="/admin/stok" page={data.page} pageSize={data.pageSize} total={data.total} params={{ q, low }} />
    </>
  );
}
