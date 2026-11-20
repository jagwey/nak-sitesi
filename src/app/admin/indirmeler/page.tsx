import { PageHeader } from "@/components/admin";
import { DownloadsLog } from "@/components/admin/ops/Downloads";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "İndirme kayıtları" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdminPage("order:read");
  return (
    <>
      <PageHeader title="İndirme kayıtları" description="Dijital indirme geçmişi; hak iptali ve sıfırlama." />
      <DownloadsLog />
    </>
  );
}
