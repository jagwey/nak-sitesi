import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { findPublicProductBySlug, getRelatedProducts } from "@/server/modules/catalog";
import { isStoreCheckoutOpen } from "@/server/env";
import { getSiteSettings } from "@/server/modules/settings/service";

export const dynamic = "force-dynamic";
const getProduct = cache(findPublicProductBySlug);

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [product, { storeName }] = await Promise.all([getProduct(slug), getSiteSettings()]);
  if (!product) {
    return { title: "Ürün bulunamadı" };
  }
  return {
    title: product.name,
    description: product.subtitle,
    openGraph: {
      title: `${product.name} | ${storeName}`,
      siteName: storeName,
      description: product.subtitle,
      images: product.images.slice(0, 1).map(({ url, alt }) => ({ url, alt })),
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [similarProducts, { storeName }] = await Promise.all([getRelatedProducts(product.slug, 4), getSiteSettings()]);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    brand: {
      "@type": "Brand",
      name: storeName,
    },
    ...(isStoreCheckoutOpen() && !product.isDemo && !product.shopierUrl && { offers: {
      "@type": "Offer",
      priceCurrency: "TRY",
      price: (product.priceKurus / 100).toFixed(2),
      availability:
        product.type === "digital" || product.physical?.inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    } }),
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductDetailClient
        product={product}
        similarProducts={similarProducts}
      />
    </>
  );
}
