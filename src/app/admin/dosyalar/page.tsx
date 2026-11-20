import { PageHeader, Pagination, EmptyState } from "@/components/admin";
import { FilesTable } from "@/components/admin/catalog/OpsClients";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";
import { listDigitalFiles } from "@/server/modules/admin-catalog/media";

export const metadata = { title: "Dijital dosyalar" };
export const dynamic = "force-dynamic";

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdminPage("file:write");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const data = await listDigitalFiles({ q, page, pageSize: 30 });
  return (
    <>
      <PageHeader title="Dijital dosyalar" description="Özel depodaki nakış dosyaları. İndirme bağlantıları kısa ömürlüdür ve denetim kaydına yazılır." />
      <form method="get" className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Ürün adı, SKU veya dosya adı" aria-label="Ara" className="min-h-11 w-full max-w-md rounded-md border border-hairline-strong bg-white px-3 text-sm" />
        <button className="min-h-11 rounded-md bg-cocoa px-4 text-sm font-semibold text-white hover:bg-cocoa-hover" type="submit">Ara</button>
      </form>
      {data.items.length === 0 ? <EmptyState title="Henüz yüklenmiş dosya yok" description="Dosyalar ürün düzenleme sayfasından yüklenir." /> : <FilesTable rows={data.items} />}
      <Pagination basePath="/admin/dosyalar" page={data.page} pageSize={data.pageSize} total={data.total} params={{ q }} />
    </>
  );
}
