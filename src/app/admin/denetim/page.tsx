import { PageHeader } from "@/components/admin";
import { AuditLog } from "@/components/admin/ops/Audit";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Denetim kaydı" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdminPage("audit:read");
  return (
    <>
      <PageHeader title="Denetim kaydı" description="Yönetici işlemlerinin kaydı." />
      <AuditLog />
    </>
  );
}
