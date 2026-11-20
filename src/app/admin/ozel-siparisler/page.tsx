import { PageHeader } from "@/components/admin";
import { CustomOrdersList } from "@/components/admin/ops/CustomOrders";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Özel siparişler" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdminPage("customorder:read");
  return (
    <>
      <PageHeader title="Özel siparişler" description="Kişiye özel talepler ve teklifler." />
      <CustomOrdersList />
    </>
  );
}
