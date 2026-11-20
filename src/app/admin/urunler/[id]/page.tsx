import { notFound } from "next/navigation";
import { PageHeader, LinkButton } from "@/components/admin";
import { ProductForm } from "@/components/admin/catalog/ProductForm";
import { AppError } from "@/server/errors";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";
import { getAdminProduct, getFormOptions } from "@/server/modules/admin-catalog/products";

export const metadata = { title: "Ürün düzenle" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage("product:read");
  const { id } = await params;
  const product = await getAdminProduct(id).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const options = await getFormOptions();
  return (
    <>
      <PageHeader title={product.name} description={`SKU ${product.sku}`} actions={<LinkButton href="/admin/urunler">Listeye dön</LinkButton>} />
      <ProductForm options={options} product={product} canWrite={user.permissions.includes("product:write")} canFiles={user.permissions.includes("file:write")} />
    </>
  );
}
