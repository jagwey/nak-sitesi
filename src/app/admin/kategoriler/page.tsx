import { PageHeader } from "@/components/admin";
import { CategoryManager } from "@/components/admin/catalog/TaxonomyManagers";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";
import { listCategories } from "@/server/modules/admin-catalog/taxonomy";

export const metadata = { title: "Kategoriler" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await requireAdminPage("product:read");
  return (
    <>
      <PageHeader title="Kategoriler" description="Kategori ağacı, sıra ve görseller." />
      <CategoryManager items={await listCategories()} />
    </>
  );
}
