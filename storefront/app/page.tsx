import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import { HomeMonogramTeaser } from "@/components/custom/LiveMonogramPreview";
import { DEFAULT_HERO_TITLE, HomeHero } from "@/components/home/HomeHero";
import { CATEGORIES, CURATED_COLLECTIONS } from "@/data/categories";
import { storefrontCatalog, storefrontProducts } from "../catalog";
import { Showcase } from "../components/Showcase";

const paths = [
  { title: "Dijital desenler", text: "Makine nakışı için desenleri inceleyin.", href: "/koleksiyon/?tur=dijital" },
  { title: "İşlemeli tekstiller", text: "Havlu, keten ve kanvas örneklerini görün.", href: "/koleksiyon/?tur=fiziksel" },
  { title: "Kişiye özel tasarım", text: "İsminizi seçtiğiniz kumaş ve iplikle deneyin.", href: "/kisiye-ozel/" },
];

export default function StorefrontPage() {
  return (
    <>
      <HomeHero
        title={DEFAULT_HERO_TITLE}
        description="Botanik makine nakışı desenlerini, işlemeli tekstilleri ve kişiye özel monogramları keşfedin."
      >
        <form action="/koleksiyon/" method="get" role="search" className="mt-7 flex max-w-[550px]">
          <label htmlFor="hero-arama" className="sr-only">Desen veya ürün ara</label>
          <input
            id="hero-arama"
            type="search"
            name="q"
            maxLength={120}
            placeholder="Desen veya ürün ara"
            className="min-h-12 min-w-0 flex-1 border border-r-0 border-hairline-strong bg-white px-4 placeholder:text-stone"
          />
          <button type="submit" className="inline-flex min-h-12 shrink-0 items-center gap-2 bg-cocoa px-4 font-medium text-ivory hover:bg-cocoa-hover sm:px-5">
            <Search className="size-4" aria-hidden="true" /> Ara
          </button>
        </form>
        <a href="#koleksiyon" className="mt-2 inline-flex min-h-11 items-center gap-2 font-medium text-cocoa underline-offset-4 hover:underline">
          Koleksiyonu keşfet <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </HomeHero>

      <div className="mx-auto max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-10 lg:pt-16">
        <nav aria-label="Koleksiyon yolları" className="grid gap-x-8 gap-y-2 md:grid-cols-3">
          {paths.map(({ title, text, href }) => (
            <a key={href} href={href} className="group border-t border-cocoa py-4">
              <span className="flex items-center justify-between gap-3 font-display text-[1.6rem] leading-tight group-hover:text-gold-text">
                {title} <ArrowRight className="size-5 shrink-0 text-cocoa" aria-hidden="true" />
              </span>
              <span className="mt-1 block text-[0.9375rem] text-umber">{text}</span>
            </a>
          ))}
        </nav>
        <section aria-labelledby="kategori-baslik" className="py-14 lg:py-20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
            <h2 id="kategori-baslik" className="font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-tight">Kategoriler</h2>
            <a href="/koleksiyon/" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-medium text-cocoa underline-offset-4 hover:underline">
              Tüm kataloğu incele <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-4">
            {CATEGORIES.map((category) => (
              <li key={category.slug} className="min-w-0">
                <a href={`/koleksiyon/?kategori=${category.slug}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-linen">
                    <Image src={category.image} alt={category.imageAlt} fill sizes="(max-width: 767px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.025]" />
                  </div>
                  <h3 className="mt-3 font-display text-xl leading-snug group-hover:text-gold-text">{category.name}</h3>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Showcase products={storefrontProducts} demo={storefrontCatalog.products.length === 0} />

      <section aria-labelledby="secki-baslik" className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <h2 id="secki-baslik" className="border-b border-hairline pb-4 font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-tight">
          Öne çıkan koleksiyonlar
        </h2>
        <div className="mt-8 grid gap-x-6 gap-y-8 md:grid-cols-3">
          {CURATED_COLLECTIONS.map((collection) => (
            <a
              key={collection.slug}
              href={`/koleksiyon/?${collection.slug === "pfaff-vp3-seckisi" ? "kategori=cicek-ve-botanik" : collection.filterQuery}`}
              className="group flex items-center gap-4 border-b border-hairline pb-5"
            >
              <div className="relative aspect-square w-24 shrink-0 overflow-hidden bg-linen lg:w-28">
                <Image src={collection.image} alt={collection.imageAlt} fill sizes="112px" className="object-cover" />
              </div>
              <h3 className="flex-1 font-display text-[1.45rem] leading-snug group-hover:text-gold-text">
                {collection.slug === "pfaff-vp3-seckisi" ? "Botanik desen seçkisi" : collection.title}
              </h3>
              <ArrowRight className="size-4 shrink-0 text-cocoa" aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <section aria-label="Canlı monogram önizlemesi" className="border-y border-hairline bg-linen/50">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-10 lg:py-24">
          <HomeMonogramTeaser mode="storefront" />
        </div>
      </section>

      <section aria-labelledby="atolye-baslik" className="mx-auto grid max-w-[1440px] items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[7fr_5fr] lg:gap-16 lg:px-10 lg:py-24">
        <div className="relative aspect-[3/2] overflow-hidden bg-linen">
          <Image src="/images/atelier-workbench.webp" alt="Nakış makinesi ve keten kumaşın yer aldığı atölye görseli" fill sizes="(max-width: 1023px) 100vw, 56vw" className="object-cover" />
        </div>
        <div>
          <h2 id="atolye-baslik" className="font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-tight">
            Desenden kumaşa
          </h2>
          <p className="mt-4 max-w-[52ch] text-umber">
            Makine nakışı, doğal kumaşlar ve isim işlemelerini bir araya getiren atölye yaklaşımımızı keşfedin.
          </p>
          <a href="/hakkimizda/" className="mt-4 inline-flex min-h-11 items-center gap-2 font-medium text-cocoa underline-offset-4 hover:underline">
            Atölye hakkında <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </section>
    </>
  );
}
