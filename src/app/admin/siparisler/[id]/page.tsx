import { PageHeader } from "@/components/admin";
import { OrderDetail } from "@/components/admin/ops/Orders";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Sipariş detayı" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage("order:read");
  const { id } = await params;
  const canWrite = user.permissions.includes("order:write");
  return (
    <>
      <PageHeader title="Sipariş detayı" />
      <OrderDetail id={id} canWrite={canWrite} />
    </>
  );
}
