import { PageHeader, LinkButton, Pagination, EmptyState, inputCls, selectCls, btnCls, PRODUCT_TYPE_LABEL } from "@/components/admin";
import { ProductList } from "@/components/admin/catalog/ProductList";
import { db } from "@/server/db";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";
import { listProducts } from "@/server/modules/admin-catalog/products";
import { productListQuery } from "@/server/modules/admin-catalog/schema";

export const metadata = { title: "Ürünler" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireAdminPage("product:read");
  const sp = await searchParams;
  const parsed = productListQuery.safeParse({ q: one(sp.q), type: one(sp.type), status: one(sp.status), categoryId: one(sp.categoryId), page: one(sp.page) });
  const q = parsed.success ? parsed.data : productListQuery.parse({});
  const [data, categories] = await Promise.all([listProducts(q), db.category.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], select: { id: true, name: true } })]);
  const canWrite = user.permissions.includes("product:write");
  const filtered = !!(q.q || q.type || q.status || q.categoryId);

  return (
    <>
      <PageHeader title="Ürünler" description="Katalogdaki tüm ürünler. Yeni ürünler taslak olarak başlar." actions={canWrite ? <LinkButton href="/admin/urunler/yeni" variant="primary">Yeni ürün</LinkButton> : undefined} />
      <form method="get" className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_9rem_11rem_auto]">
        <input name="q" defaultValue={q.q ?? ""} placeholder="Ad, SKU veya bağlantı ara" aria-label="Ara" className={inputCls} />
        <select name="type" defaultValue={q.type ?? ""} aria-label="Tür" className={selectCls}>
          <option value="">Tüm türler</option>
          {Object.entries(PRODUCT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="status" defaultValue={q.status ?? ""} aria-label="Durum" className={selectCls}>
          <option value="">Tüm durumlar</option>
          <option value="ACTIVE">Yayında</option>
          <option value="DRAFT">Taslak</option>
          <option value="ARCHIVED">Arşiv</option>
        </select>
        <select name="categoryId" defaultValue={q.categoryId ?? ""} aria-label="Kategori" className={selectCls}>
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="submit" className={btnCls("secondary")}>Filtrele</button>
      </form>
      {data.items.length === 0 ? (
        <EmptyState title={filtered ? "Filtreye uyan ürün yok" : "Henüz ürün yok"} description={filtered ? "Filtreleri değiştirmeyi deneyin." : "İlk ürünü ekleyin ya da CSV ile toplu içe aktarın."} action={canWrite ? <LinkButton href="/admin/urunler/yeni" variant="primary">Yeni ürün</LinkButton> : undefined} />
      ) : (
        <ProductList rows={data.items} categories={categories} canWrite={canWrite} />
      )}
      <Pagination basePath="/admin/urunler" page={data.page} pageSize={data.pageSize} total={data.total} params={{ q: q.q, type: q.type, status: q.status, categoryId: q.categoryId }} />
    </>
  );
}
