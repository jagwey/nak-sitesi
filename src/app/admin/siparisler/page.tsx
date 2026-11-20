import { PageHeader } from "@/components/admin";
import { OrdersList } from "@/components/admin/ops/Orders";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Siparişler" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdminPage("order:read");
  return (
    <>
      <PageHeader title="Siparişler" description="Tüm siparişler, durum ve ödeme takibi." />
      <OrdersList />
    </>
  );
}
