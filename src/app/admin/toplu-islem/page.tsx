import { PageHeader } from "@/components/admin";
import { ImportWizard } from "@/components/admin/catalog/OpsClients";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Toplu işlem" };
export const dynamic = "force-dynamic";

export default async function BulkPage() {
  const user = await requireAdminPage("product:read");
  return (
    <>
      <PageHeader title="Toplu işlem" description="CSV ile ürün içe aktarma. Önizlemeyi onaylamadan hiçbir kayıt yazılmaz." />
      <ImportWizard canWrite={user.permissions.includes("product:write")} />
    </>
  );
}
