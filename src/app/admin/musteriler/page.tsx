import { PageHeader } from "@/components/admin";
import { CustomersList } from "@/components/admin/ops/Customers";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Müşteriler" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdminPage("customer:read");
  return (
    <>
      <PageHeader title="Müşteriler" description="Müşteri hesapları ve KVKK işlemleri." />
      <CustomersList />
    </>
  );
}
