import { PageHeader } from "@/components/admin";
import { ContentEditor } from "@/components/admin/ops/Content";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";

export const metadata = { title: "İçerik" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdminPage("settings:read");
  return (
    <>
      <PageHeader title="İçerik" description="Yasal metinler." />
      <ContentEditor />
    </>
  );
}
