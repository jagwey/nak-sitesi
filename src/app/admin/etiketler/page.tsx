import { PageHeader } from "@/components/admin";
import { TagManager } from "@/components/admin/catalog/TaxonomyManagers";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";
import { listTags } from "@/server/modules/admin-catalog/taxonomy";

export const metadata = { title: "Etiketler" };
export const dynamic = "force-dynamic";

export default async function TagsPage() {
  await requireAdminPage("product:read");
  return (
    <>
      <PageHeader title="Etiketler" />
      <TagManager items={await listTags()} />
    </>
  );
}
