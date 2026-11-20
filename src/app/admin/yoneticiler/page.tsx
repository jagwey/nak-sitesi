import { PageHeader } from "@/components/admin";
import { AdminsManager } from "@/components/admin/ops/Admins";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Yöneticiler" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireAdminPage("user:read");
  return (
    <>
      <PageHeader title="Yöneticiler" description="Yönetici hesapları ve rolleri." />
      <AdminsManager canManage={user.roles.includes("SUPER_ADMIN") && user.permissions.includes("user:write")} />
    </>
  );
}
