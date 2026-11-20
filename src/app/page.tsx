import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { getAvailableEmbroideryOffers, getFlagDesigns, getHomepageData } from "@/server/modules/catalog";
import { HomeMonogramTeaser } from "@/components/custom/LiveMonogramPreview";
import { CampaignBanner } from "@/components/home/CampaignBanner";
import { OpenLicenseShowcase } from "@/components/home/OpenLicenseShowcase";
import { TrustAndFaq } from "@/components/home/TrustAndFaq";
import { HomeHero } from "@/components/home/HomeHero";
import { EmbroideryOffer } from "@/components/catalog/EmbroideryOffer";
import { ProductCard } from "@/components/catalog/ProductCard";
import { HomeShowcaseTabs } from "@/components/home/HomeClient";
import { formatTRY } from "@/lib/format";
import { resolveHeroTitle } from "@/lib/hero";
import { getSiteSettings } from "@/server/modules/settings/service";

const QUICK_CHIPS = [
  { label: "VP3 desenler", href: "/koleksiyon?format=VP3" },
  { label: "PFAFF uyumlu", href: "/koleksiyon?q=pfaff" },
  { label: "10×10 kasnağa sığan", href: "/koleksiyon?kasnak=10x10%20cm" },
  { label: "Bebek", href: "/koleksiyon?q=bebek" },
  { label: "Kişiye özel havlu", href: "/kisiye-ozel" },
];

const PATHS = [
  {
    title: "Görselden nakışa çevirme",
    sub: "Fotoğraf veya logonuzu makine dosyasına dönüştürelim.",
    href: "/kisiye-ozel?hizmet=gorsel",
  },
  {
    title: "İsteğe özel parça",
    sub: "Havlu, keten veya giysi için ölçü ve yazı belirleyin.",
    href: "/kisiye-ozel?hizmet=parca",
  },
  {
    title: "Hazır nakış desenleri",
    sub: "VP3, PES ve DST dosyasını kendi makinenizde işleyin.",
    href: "/koleksiyon?tur=dijital",
  },
];

const SERVICE_CTAS = [
  { href: "/kisiye-ozel?hizmet=gorsel", label: "Fotoğraf veya logo yükle" },
  { href: "/kisiye-ozel?hizmet=parca", label: "İsteğe özel parça siparişi" },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [site, home, flags, offers] = await Promise.all([
    getSiteSettings().catch(() => null),
    getHomepageData(),
    getFlagDesigns(),
    getAvailableEmbroideryOffers(),
  ]);
  const flag = flags.find((product) => product.slug === "filistin-bayragi");
  const flagImage = flag?.images[0];
  const flagOptions = flags.filter((product) => product.id !== flag?.id);

  return (
    <>
      {/* 1. HERO */}
      <HomeHero
        title={resolveHeroTitle(site?.heroTitle)}
        description={site?.heroText || "Fotoğraf veya logonuzu nakış dosyasına çeviririz. Havlu, keten ve giysi için ölçüye özel parça da hazırlanır. Pfaff için VP3; üründe varsa PES, DST ve JEF."}
      >
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {SERVICE_CTAS.map((cta, index) => (
            <Link
              key={cta.href}
              href={cta.href}
              className={
                index === 0
                  ? "btn-buy inline-flex min-h-12 items-center justify-center px-5 text-[1.0625rem] font-semibold"
                  : "inline-flex min-h-12 items-center justify-center border border-cocoa bg-ivory px-5 text-[1.0625rem] font-semibold text-cocoa transition-colors duration-200 hover:bg-cocoa hover:text-ivory"
              }
            >
              {cta.label}
            </Link>
          ))}
        </div>
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
                prefetch={false}
                href={chip.href}
                className="inline-flex min-h-[44px] items-center rounded-full border border-hairline-strong bg-white/80 px-4 text-[0.875rem] font-medium text-ink transition-colors duration-200 hover:border-gold hover:text-gold-text"
              >
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>
      </HomeHero>

      <CampaignBanner />

      {/* 2. ÜÇ GİRİŞ YOLU */}
      <section
        aria-label="Alışveriş yolları"
        className="mx-auto max-w-[1440px] px-4 pt-12 sm:px-6 lg:px-10 lg:pt-16"
      >
        <ul className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-3">
          {PATHS.map((path) => (
            <li key={path.title} className="border-t border-cocoa">
              <Link prefetch={false} href={path.href} className="group block min-h-[44px] py-5">
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

      {offers.length > 0 && (
        <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-10">
          <EmbroideryOffer tiers={offers} />
        </div>
      )}

      {flags.length > 0 && (
        <section
          id="bayrak-desenleri"
          aria-labelledby="bayrak-desenleri-baslik"
          className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10 lg:py-24"
        >
          <h2 id="bayrak-desenleri-baslik" className="mb-8 border-b border-hairline pb-5 font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-tight text-ink">
            Bayrak desenleri
          </h2>
          {flag && flagImage && (
            <div className="grid items-center gap-8 md:grid-cols-2 lg:gap-16">
              <Link
                prefetch={false}
                href={`/urun/${flag.slug}`}
                className="relative block aspect-[4/3] overflow-hidden bg-linen"
              >
                <Image
                  src={flagImage.url}
                  unoptimized={Boolean(flagImage.thumbnailUrl)}
                  alt={flagImage.alt || flag.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </Link>
              <div>
                <h3
                  className="font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-[1.08] text-ink"
                >
                  {flag.name}
                </h3>
                <p className="mt-3 max-w-[50ch] text-[1rem] leading-relaxed text-umber">
                  {flag.subtitle || flag.description}
                </p>
                <p className="mt-5 tabular-nums text-[1.125rem] font-semibold text-ink">{formatTRY(flag.priceKurus)}</p>
                {flag.embroidery?.formatsVerified && (
                  <p className="mt-1 text-[0.9375rem] text-umber">{flag.embroidery.formats.join(" · ")} dijital dosyaları</p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {flag.shopierUrl && (
                    <a
                      href={flag.shopierUrl}
                      className="inline-flex min-h-11 items-center bg-espresso px-5 text-[0.9375rem] font-semibold text-ivory transition-colors hover:bg-cocoa"
                    >
                      Shopier’den Satın Al
                    </a>
                  )}
                  <Link
                    prefetch={false}
                    href={`/urun/${flag.slug}`}
                    className={flag.shopierUrl
                      ? "inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-medium text-cocoa underline underline-offset-4"
                      : "inline-flex min-h-11 items-center gap-2 bg-cocoa px-5 text-[0.9375rem] font-medium text-ivory transition-colors hover:bg-cocoa-hover"}
                  >
                    Deseni incele
                    <ArrowRight className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          )}
          {flagOptions.length > 0 && (
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:max-w-3xl">
              {flagOptions.map((product) => (
                <li key={product.id} className="min-w-0">
                  <ProductCard product={product} fullImage showSubtitle />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {home.categories.length > 0 && (
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
              prefetch={false}
              href="/koleksiyon"
              className="inline-flex min-h-[44px] items-center gap-2 text-[0.9375rem] font-medium text-cocoa underline-offset-4 transition-colors duration-200 hover:text-gold-text hover:underline"
            >
              Tüm kataloğu incele
              <ArrowRight className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-5">
            {home.categories.map((category) => (
              <li key={category.slug}>
                <Link prefetch={false} href={`/koleksiyon?kategori=${category.slug}`} className="group block">
                  <div className="relative aspect-square w-full overflow-hidden bg-linen">
                    <Image
                      src={category.image.thumbnailUrl ?? category.image.url}
                      unoptimized={Boolean(category.image.thumbnailUrl)}
                      alt={category.image.alt}
                      fill
                      sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1440px) 20vw, 272px"
                      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                    />
                  </div>
                  <h3 className="mt-3 font-display text-[1.25rem] leading-snug text-ink transition-colors duration-200 group-hover:text-gold-text">
                    {category.name}
                  </h3>
                  <p className="tabular-nums text-[0.875rem] text-umber">
                    {category.productCount} ürün
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OpenLicenseShowcase />

      {/* 4. ÜRÜN VİTRİNLERİ */}
      <div className="border-y border-hairline bg-linen/45">
        <HomeShowcaseTabs tabs={home.tabs} />
      </div>

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
                loading="lazy"
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
              Desenden kumaşa
            </h2>

            <p className="max-w-[52ch] text-[1rem] leading-relaxed text-umber">
              Desenin dikiş yönünü, iplik renklerini ve kenarlarını ürün sayfasındaki dijital önizlemelerde yakından inceleyin.
            </p>

            <p className="max-w-[52ch] text-[1rem] leading-relaxed text-umber">
              Nakışa başlamadan önce dosya formatını ve desen ölçülerini makineniz ve kasnağınızla karşılaştırın.
            </p>

            <div className="grid grid-cols-1 gap-4 border-t border-hairline pt-6 sm:grid-cols-2">
              <div>
                <h3 className="font-display text-[1.25rem] text-ink">
                  Dosya ve kasnak bilgileri
                </h3>
                <p className="mt-1 text-[0.875rem] text-umber">
                  Ürün sayfalarında mevcut dosya formatları, desen ölçüleri ve iplik renkleri yer alır.
                </p>
              </div>
              <div>
                <h3 className="font-display text-[1.25rem] text-ink">
                  Kişiye özel tekstiller
                </h3>
                <p className="mt-1 text-[0.875rem] text-umber">
                  İsim, logo veya monogram işlemeli tekstiller için kumaş, ölçü ve adet belirterek teklif isteyin.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                prefetch={false}
                href="/kisiye-ozel"
                className="inline-flex min-h-[44px] items-center gap-2 text-[0.9375rem] font-medium text-cocoa underline-offset-4 transition-colors duration-200 hover:text-gold-text hover:underline"
              >
                Kişiye özel teklif iste
                <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <TrustAndFaq />
    </>
  );
}
