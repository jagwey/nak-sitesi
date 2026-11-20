import { PageHeader } from "@/components/admin";
import { CouponsManager } from "@/components/admin/ops/Coupons";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Kuponlar" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdminPage("coupon:write");
  return (
    <>
      <PageHeader title="Kuponlar" description="İndirim kuponları." />
      <CouponsManager />
    </>
  );
}
