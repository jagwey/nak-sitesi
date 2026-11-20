import { PageHeader, LinkButton } from "@/components/admin";
import { ProductForm } from "@/components/admin/catalog/ProductForm";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";
import { getFormOptions } from "@/server/modules/admin-catalog/products";

export const metadata = { title: "Yeni ürün" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdminPage("product:write");
  const options = await getFormOptions();
  return (
    <>
      <PageHeader title="Yeni ürün" actions={<LinkButton href="/admin/urunler">Listeye dön</LinkButton>} />
      <ProductForm options={options} />
    </>
  );
}
