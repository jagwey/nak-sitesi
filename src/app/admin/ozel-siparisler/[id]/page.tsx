import { PageHeader } from "@/components/admin";
import { CustomOrderDetail } from "@/components/admin/ops/CustomOrders";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Özel sipariş detayı" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage("customorder:read");
  const { id } = await params;
  const canWrite = user.permissions.includes("customorder:write");
  return (
    <>
      <PageHeader title="Özel sipariş detayı" />
      <CustomOrderDetail id={id} canWrite={canWrite} />
    </>
  );
}
