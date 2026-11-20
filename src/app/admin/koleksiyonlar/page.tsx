import { PageHeader } from "@/components/admin";
import { CollectionManager } from "@/components/admin/catalog/TaxonomyManagers";
import { db } from "@/server/db";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";
import { listCollections } from "@/server/modules/admin-catalog/taxonomy";

export const metadata = { title: "Koleksiyonlar" };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  await requireAdminPage("product:read");
  const [items, allProducts] = await Promise.all([
    listCollections(),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, take: 500, select: { id: true, name: true, sku: true } }),
  ]);
  return (
    <>
      <PageHeader title="Koleksiyonlar" description="Elle seçilen ürün grupları; sıra vitrindeki sırayı belirler." />
      <CollectionManager items={items} allProducts={allProducts} />
    </>
  );
}
