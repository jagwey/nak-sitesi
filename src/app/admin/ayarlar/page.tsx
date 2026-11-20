import { PageHeader } from "@/components/admin";
import { SettingsForm } from "@/components/admin/ops/Settings";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "Ayarlar" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdminPage("settings:read");
  return (
    <>
      <PageHeader title="Ayarlar" description="Mağaza, kargo ve politika ayarları." />
      <SettingsForm />
    </>
  );
}
