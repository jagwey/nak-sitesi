import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { findPublicProductBySlug, getRelatedProducts } from "@/server/modules/catalog";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await findPublicProductBySlug(slug);
  if (!product) {
    return { title: "Ürün bulunamadı" };
  }
  return {
    title: product.name,
    description: product.subtitle,
    openGraph: {
      title: `${product.name} | Tülay Birer`,
      description: product.subtitle,
      images: [{ url: product.images[0].url, alt: product.images[0].alt }],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await findPublicProductBySlug(slug);
  if (!product) notFound();

  const similarProducts = await getRelatedProducts(product.slug, 4);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    brand: {
      "@type": "Brand",
      name: "Tülay Birer",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "TRY",
      price: (product.priceKurus / 100).toFixed(2),
      availability:
        product.type === "digital" || product.physical?.inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: product.categoryName,
        item: `/koleksiyon?kategori=${product.categorySlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `/urun/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetailClient
        product={product}
        similarProducts={similarProducts}
      />
    </>
  );
}
