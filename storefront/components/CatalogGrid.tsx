import Image from "next/image";
import { formatTRY } from "@/lib/format";
import type { StorefrontProduct } from "../catalog";

export function CatalogGrid({ products }: { products: StorefrontProduct[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-4">
      {products.map((product) => {
        const [image, detail] = product.images;
        const type = product.type === "digital" ? "Dijital desen" : product.type === "physical" ? "İşlemeli ürün" : "";
        return (
          <li key={product.slug} className="min-w-0">
            <a href={`/urun/${product.slug}/`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden bg-linen">
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 1023px) 50vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                />
                {detail && (
                  <Image
                    src={detail.url}
                    alt=""
                    fill
                    sizes="(max-width: 1023px) 50vw, 25vw"
                    className="object-cover opacity-0 transition-opacity duration-300 pointer-fine:group-hover:opacity-100"
                  />
                )}
              </div>
              <h3 className="mt-3 wrap-anywhere font-display text-xl leading-snug group-hover:text-gold-text">
                {product.name}
              </h3>
              {type && <p className="mt-1 text-sm text-umber">{type}</p>}
              <p className="mt-1.5 text-sm font-medium tabular-nums text-cocoa">
                {product.isDemo ? "Demo ürün" : formatTRY(product.priceKurus)}
              </p>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
