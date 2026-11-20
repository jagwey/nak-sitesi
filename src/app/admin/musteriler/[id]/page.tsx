import { PageHeader } from "@/components/admin";
import { CustomerDetail } from "@/components/admin/ops/Customers";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Müşteri detayı" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage("customer:read");
  const { id } = await params;
  const canWrite = user.permissions.includes("settings:write");
  return (
    <>
      <PageHeader title="Müşteri detayı" />
      <CustomerDetail id={id} canWrite={canWrite} />
    </>
  );
}
