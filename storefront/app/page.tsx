import Image from "next/image";
import { DEFAULT_HERO_TITLE, HomeHero } from "@/components/home/HomeHero";
import { formatTRY } from "@/lib/format";
import heroImage from "../../public/images/hero-atelier-linen.webp";
import { storefrontCatalog } from "../catalog";

const purchaseClass =
  "inline-flex min-h-12 items-center justify-center bg-cocoa px-6 py-2 font-medium text-ivory transition-colors hover:bg-cocoa-hover";

export default function StorefrontPage() {
  const { storeName, products } = storefrontCatalog;

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <a href="/" className="font-display text-2xl font-medium text-ink sm:text-3xl">
            {storeName}
          </a>
          <nav aria-label="Ana menü">
            <a href="#koleksiyon" className="inline-flex min-h-11 items-center font-medium text-cocoa hover:text-gold-text">
              Koleksiyon
            </a>
          </nav>
        </div>
      </header>
      <main id="ana-icerik">
        <HomeHero
          title={DEFAULT_HERO_TITLE}
          description="Makine nakışı desenleri ve kişiye özel işlemeli tekstiller."
          image={heroImage}
        >
          <a href="#koleksiyon" className={`mt-7 ${purchaseClass}`}>Koleksiyonu keşfet</a>
        </HomeHero>
        <section
          id="koleksiyon"
          aria-labelledby="koleksiyon-baslik"
          className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20"
        >
          <h2 id="koleksiyon-baslik" className="font-display text-4xl text-ink">Koleksiyon</h2>
          {products.length === 0 ? (
            <p className="mt-3 text-umber">İlk koleksiyonumuz hazırlanıyor.</p>
          ) : (
            <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.shopierUrl} className="flex flex-col gap-3 border-b border-hairline pb-6">
                  <div className="relative aspect-[4/5] overflow-hidden bg-linen">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 32vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <h3 className="font-display text-3xl leading-tight text-ink">{product.name}</h3>
                  <p className="text-umber">{product.description}</p>
                  <p className="mt-auto tabular-nums font-semibold">{formatTRY(product.priceKurus)}</p>
                  <a href={product.shopierUrl} className={`self-start ${purchaseClass}`}>
                    Shopier’de satın al
                    <span className="sr-only"> — {product.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <footer className="border-t border-hairline bg-espresso text-ivory">
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
          <a href="/" className="font-display text-2xl">{storeName}</a>
        </div>
      </footer>
    </>
  );
}
