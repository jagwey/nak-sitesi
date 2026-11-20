import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { FabricMockup } from "@/components/product/FabricMockup";
import { ProductGallery } from "@/components/product/ProductGallery";
import { formatTRY } from "@/lib/format";
import { storefrontProducts } from "../../../catalog";

type ProductPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return storefrontProducts.map(({ slug }) => ({ slug }));
}

async function findProduct(params: ProductPageProps["params"]) {
  const { slug } = await params;
  return storefrontProducts.find((product) => product.slug === slug) ?? notFound();
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await findProduct(params);
  return {
    title: product.name,
    description: product.isDemo ? `${product.name} demo ürün önizlemesi.` : product.description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await findProduct(params);
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-[100px] sm:px-6 lg:px-10">
      <a href="/koleksiyon/" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-cocoa underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Koleksiyona dön
      </a>
      <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        <div>
          <ProductGallery images={product.images} productName={product.name} />
          {product.images[0] && (
            <FabricMockup
              imageUrl={product.images[0].url}
              imageAlt={product.images[0].alt || product.name}
              initialWidthMm={product.embroidery?.widthMm || 80}
              initialHeightMm={product.embroidery?.heightMm || 80}
            />
          )}
        </div>
        <div className="pt-2">
          <h1 className="font-display text-[clamp(2rem,4vw,3.35rem)] leading-tight">{product.name}</h1>
          {product.categoryName && <p className="mt-2 text-sm font-medium text-umber">{product.categoryName}</p>}
          {product.isDemo && <p className="mt-5 border-y border-hairline py-3 text-sm font-medium text-cocoa">Demo ürün · Satışa açık değil</p>}
          <p className="mt-6 max-w-[56ch] leading-relaxed text-umber">{product.isDemo ? product.subtitle : product.description}</p>
          {product.shopierUrl && (
            <div className="mt-7 border-t border-hairline pt-6">
              <p className="text-xl font-semibold tabular-nums">{formatTRY(product.priceKurus)}</p>
              <a href={product.shopierUrl} className="btn-buy mt-4 inline-flex min-h-12 items-center gap-3 px-6 text-[1.0625rem] font-semibold">
                Shopier’de satın al <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
              <p className="mt-3 text-[1.0625rem] text-umber">Ödeme ve dosya teslimi Shopier’dedir. Site içi sepet indirimi bu bağlantıda uygulanmaz.</p>
            </div>
          )}
          {product.personalizable && (
            <a href="/kisiye-ozel/" className="mt-5 block w-fit py-2 font-medium text-cocoa underline underline-offset-4">Benzer bir monogramı dene</a>
          )}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-cocoa bg-ivory/95 px-4 py-3 lg:hidden">
        <p className="min-w-0 truncate text-[1rem] font-semibold">{product.name}</p>
        {product.shopierUrl ? (
          <a href={product.shopierUrl} className="btn-buy inline-flex min-h-12 shrink-0 items-center px-4 text-[1rem] font-semibold">
            Shopier’de satın al
          </a>
        ) : (
          <span className="shrink-0 text-[1rem] font-semibold text-cocoa">Satışa kapalı</span>
        )}
      </div>
    </div>
  );
}
