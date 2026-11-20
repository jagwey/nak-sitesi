import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { CATEGORIES, CURATED_COLLECTIONS } from "@/data/categories";
import { DEFAULT_FILTERS } from "@/lib/search";
import { getHomepageData, getProductsBySlugs, searchCatalog } from "@/server/modules/catalog";
import { HomeMonogramTeaser } from "@/components/custom/LiveMonogramPreview";
import { DEFAULT_HERO_TITLE, HomeHero } from "@/components/home/HomeHero";
import { HomeShowcaseTabs } from "@/components/home/HomeClient";
import { formatTRY } from "@/lib/format";
import { getSiteSettings } from "@/server/modules/settings/service";

const FORMAT_LIST = "VP3, PES, DST, JEF, HUS";

const QUICK_CHIPS = [
  { label: "VP3 desenler", href: "/koleksiyon?format=VP3" },
  { label: "PFAFF uyumlu", href: "/koleksiyon?q=pfaff" },
  { label: "10×10 kasnağa sığan", href: "/koleksiyon?kasnak=10x10%20cm" },
  { label: "Bebek", href: "/koleksiyon?q=bebek" },
  { label: "Havlu", href: "/koleksiyon?q=havlu" },
  { label: "Desen paketleri", href: "/koleksiyon?q=paket" },
];

const PATHS = [
  {
    title: "Dijital desenler",
    sub: "İndirilebilir dosya, kendi makinende işle.",
    href: "/koleksiyon?tur=dijital",
  },
  {
    title: "Hazır ve kişiye özel ürünler",
    sub: "İşlemeli tekstiller, kargo ile.",
    href: "/koleksiyon?tur=fiziksel",
  },
  {
    title: "Kişiye özel sipariş",
    sub: "İsim, monogram ve özel tasarım talebi.",
    href: "/kisiye-ozel",
  },
];

export const dynamic = "force-dynamic";

async function countFor(slug: string): Promise<number> {
  const filters =
    slug === "dijital-nakis-desenleri"
      ? { ...DEFAULT_FILTERS, tur: "digital" as const }
      : slug === "kisiye-ozel-urunler"
      ? { ...DEFAULT_FILTERS, kisisellestirme: true }
      : { ...DEFAULT_FILTERS, kategori: slug };
  return (await searchCatalog(filters, { pageSize: 1, facets: false })).total;
}

export default async function HomePage() {
  const site = await getSiteSettings().catch(() => null);
  const [home, editorial, counts] = await Promise.all([
    getHomepageData(),
    getProductsBySlugs([
      "klasik-serif-botanik-monogram-alfabesi",
      "ajurlu-dantel-havlu-kenari-fsl",
    ]),
    Promise.all(CATEGORIES.map((c) => countFor(c.slug))),
  ]);
  const countBySlug = new Map(CATEGORIES.map((c, i) => [c.slug, counts[i]]));
  const alphabetBundle = editorial.find((p) => p.slug === "klasik-serif-botanik-monogram-alfabesi");
  const fslLace = editorial.find((p) => p.slug === "ajurlu-dantel-havlu-kenari-fsl");

  return (
    <>
      {/* 1. HERO */}
      <HomeHero
        title={site?.heroTitle || DEFAULT_HERO_TITLE}
        description={site?.heroText || `${FORMAT_LIST} formatlarında indirilebilir desenler; kişiye özel işlemeli havlu ve keten ürünler.`}
      >
        <form
          action="/koleksiyon"
          method="get"
          role="search"
          className="mt-7 flex max-w-[560px] items-stretch"
        >
          <label htmlFor="hero-arama" className="sr-only">
            Desen veya ürün ara
          </label>
          <input
            id="hero-arama"
            type="search"
            name="q"
            autoComplete="off"
            placeholder="Desen, format veya makine ara"
            className="h-12 min-w-0 flex-1 border border-r-0 border-hairline-strong bg-white px-4 text-[1rem] text-ink placeholder:text-stone focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          <button
            type="submit"
            className="inline-flex h-12 min-w-[44px] items-center justify-center gap-2 bg-cocoa px-5 text-[0.9375rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
          >
            <Search className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Ara
          </button>
        </form>

        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Hızlı aramalar">
          {QUICK_CHIPS.map((chip) => (
            <li key={chip.label}>
              <Link
                href={chip.href}
                className="inline-flex min-h-[44px] items-center rounded-full border border-hairline-strong bg-white/80 px-4 text-[0.875rem] font-medium text-ink transition-colors duration-200 hover:border-gold hover:text-gold-text"
              >
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>
      </HomeHero>

      {/* 2. ÜÇ GİRİŞ YOLU */}
      <section
        aria-label="Alışveriş yolları"
        className="mx-auto max-w-[1440px] px-4 pt-12 sm:px-6 lg:px-10 lg:pt-16"
      >
        <ul className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-3">
          {PATHS.map((path) => (
            <li key={path.href} className="border-t border-cocoa">
              <Link href={path.href} className="group block min-h-[44px] py-5">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-[1.6rem] leading-tight text-ink transition-colors duration-200 group-hover:text-gold-text">
                    {path.title}
                  </span>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-cocoa transition-transform duration-200 group-hover:translate-x-1"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1.5 block text-[0.9375rem] text-umber">{path.sub}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. KATEGORİLER */}
      <section
        aria-labelledby="kategoriler-baslik"
        className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20"
      >
        <div className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="kategoriler-baslik"
            className="font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-[1.08] text-ink"
          >
            Kategoriler
          </h2>
          <Link
            href="/koleksiyon"
            className="inline-flex min-h-[44px] items-center gap-2 text-[0.9375rem] font-medium text-cocoa underline-offset-4 transition-colors duration-200 hover:text-gold-text hover:underline"
          >
            Tüm kataloğu incele
            <ArrowRight className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-4">
          {CATEGORIES.map((category) => (
            <li key={category.slug}>
              <Link href={`/koleksiyon?kategori=${category.slug}`} className="group block">
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-linen">
                  <Image
                    src={category.image}
                    alt={category.imageAlt}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                  />
                </div>
                <h3 className="mt-3 font-display text-[1.25rem] leading-snug text-ink transition-colors duration-200 group-hover:text-gold-text">
                  {category.name}
                </h3>
                <p className="tabular-nums text-[0.875rem] text-umber">
                  {countBySlug.get(category.slug) ?? 0} ürün
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. ÜRÜN VİTRİNLERİ */}
      <div className="border-y border-hairline bg-linen/45">
        <HomeShowcaseTabs tabs={home.tabs} />
      </div>

      {/* 5. KOLEKSİYONLAR — düz editoryal bölüm */}
      <section
        aria-labelledby="koleksiyonlar-baslik"
        className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-10 lg:py-24"
      >
        <div className="max-w-[58ch]">
          <h2
            id="koleksiyonlar-baslik"
            className="font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-[1.08] text-ink"
          >
            Öne çıkan koleksiyonlar ve dijital tasarım paketleri
          </h2>
          <p className="mt-2.5 text-[1rem] text-umber">
            PFAFF VP3 uyumlu çoklu desen setleri, serbest ajurlu danteller ve doğal keten sofra seçkileri.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {alphabetBundle && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-12 lg:col-span-7">
              <Link
                href={`/urun/${alphabetBundle.slug}`}
                className="relative aspect-[3/4] w-full overflow-hidden bg-linen sm:col-span-5"
              >
                <Image
                  src={alphabetBundle.images[0].url}
                  alt={alphabetBundle.images[0].alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
              </Link>
              <div className="flex flex-col justify-between sm:col-span-7">
                <div>
                  <h3 className="font-display text-[1.85rem] leading-tight text-ink">
                    {alphabetBundle.name}
                  </h3>
                  <p className="mt-1.5 text-[0.875rem] font-medium text-gold-text">
                    Dijital tasarım paketi · 29 Türkçe harf · 2 kasnak boyutu
                  </p>
                  <p className="mt-3 text-[1rem] leading-relaxed text-umber">
                    {alphabetBundle.description}
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline pt-4 text-[0.875rem]">
                    <div>
                      <dt className="text-stone">Formatlar</dt>
                      <dd className="font-medium text-ink">
                        VP3, PES, DST, JEF, HUS, XXX, PEC
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone">Kasnak</dt>
                      <dd className="tabular-nums font-medium text-ink">
                        10x10 cm ve 13x18 cm
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="tabular-nums text-[1.125rem] font-semibold text-ink">
                      {formatTRY(alphabetBundle.priceKurus)}
                    </span>
                    {alphabetBundle.compareAtPriceKurus && (
                      <span className="tabular-nums text-[0.875rem] text-stone line-through">
                        {formatTRY(alphabetBundle.compareAtPriceKurus)}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/urun/${alphabetBundle.slug}`}
                    className="inline-flex h-11 items-center bg-cocoa px-6 text-[0.875rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
                  >
                    Paketi İncele
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col justify-between gap-6 lg:col-span-5">
            {CURATED_COLLECTIONS.map((col) => (
              <Link
                key={col.slug}
                href={`/koleksiyon?${col.filterQuery}`}
                className="group flex items-center gap-5 border-b border-hairline pb-6 last:border-b-0 last:pb-0"
              >
                <div className="relative h-28 w-24 shrink-0 overflow-hidden bg-linen">
                  <Image
                    src={col.image}
                    alt={col.imageAlt}
                    fill
                    sizes="96px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-[1.45rem] leading-snug text-ink transition-colors duration-200 group-hover:text-gold-text">
                    {col.title}
                  </h3>
                  <p className="mt-1 text-[0.875rem] leading-relaxed text-umber">
                    {col.subtitle}
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-stone transition-[transform,color] duration-200 group-hover:translate-x-1 group-hover:text-gold-text"
                  strokeWidth={1.6}
                />
              </Link>
            ))}

            {fslLace && (
              <Link
                href={`/urun/${fslLace.slug}`}
                className="group flex min-h-[44px] items-center justify-between border-t border-hairline pt-5 text-[0.9375rem] font-medium text-cocoa transition-colors duration-200 hover:text-gold-text"
              >
                <span>Ajurlu Dantel (FSL) Havlu Kenarı Deseni</span>
                <span className="tabular-nums text-umber group-hover:text-gold-text">
                  {formatTRY(fslLace.priceKurus)}
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 6. CANLI MONOGRAM ÖNİZLEME STÜDYOSU TEASER */}
      <section
        aria-label="Canlı kişiselleştirme önizlemesi"
        className="border-y border-hairline bg-linen/55"
      >
        <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
          <HomeMonogramTeaser />
        </div>
      </section>

      {/* 7. ATÖLYE BÖLÜMÜ */}
      <section
        aria-labelledby="atolye-baslik"
        className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
      >
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="relative aspect-[3/2] w-full overflow-hidden bg-linen">
              <Image
                src="/images/atelier-workbench.webp"
                alt="Gün ışığı alan atölyede doğal keten kumaş üzerine altın ve kahverengi iplikle botanik nakış işleyen makine"
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <h2
              id="atolye-baslik"
              className="font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-[1.08] text-ink"
            >
              Desenden kumaşa, titiz bir atölye disiplini.
            </h2>

            <p className="max-w-[52ch] text-[1rem] leading-relaxed text-umber">
              Burada her makine nakışı deseni yalnızca ekranda çizilip bırakılmaz; dikiş yönü, alt dikiş dengesi ve renk geçişleri doğal keten ile pamuklu kumaşlar üzerinde tek tek denenir.
            </p>

            <p className="max-w-[52ch] text-[1rem] leading-relaxed text-umber">
              İster kendi PFAFF veya ev tipi nakış makineniz için hazır bir VP3 dosyası indirin, ister sevdikleriniz için monogramlı bir havlu ya da keten runner sipariş verin: aynı özenle hazırlanmış bir zanaat deneyimi sunuyoruz.
            </p>

            <div className="grid grid-cols-1 gap-4 border-t border-hairline pt-6 sm:grid-cols-2">
              <div>
                <h3 className="font-display text-[1.25rem] text-ink">
                  Test edilmiş nakış dosyaları
                </h3>
                <p className="mt-1 text-[0.875rem] text-umber">
                  Her üründe yalnızca doğrulanmış formatlar, gerçek kasnak ölçüleri ve adım adım iplik renk tablosu paylaşılır.
                </p>
              </div>
              <div>
                <h3 className="font-display text-[1.25rem] text-ink">
                  Doğal tekstil ve el işçiliği
                </h3>
                <p className="mt-1 text-[0.875rem] text-umber">
                  Yıkanmış keten, uzun elyaflı pamuk ve yüksek parlaklıklı nakış iplikleriyle uzun ömürlü parçalar üretilir.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/hakkimizda"
                className="inline-flex min-h-[44px] items-center gap-2 text-[0.9375rem] font-medium text-cocoa underline-offset-4 transition-colors duration-200 hover:text-gold-text hover:underline"
              >
                Atölye hikâyesini ve üretim sürecini incele
                <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
