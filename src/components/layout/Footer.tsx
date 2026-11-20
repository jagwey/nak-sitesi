import Image from "next/image";
import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import type { SiteSettings } from "@/server/modules/settings/schema";

export function Footer({ site }: { site: SiteSettings }) {
  const hasContact = site.contactEmail || site.contactPhone || site.contactAddress || site.whatsapp || site.instagramUrl;
  return (
    <footer className="border-t border-hairline bg-espresso text-[#F6F2EA]">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="space-y-5 lg:col-span-4">
            <Link prefetch={false} href="/" className="inline-flex max-w-full items-center gap-3" aria-label={`${site.storeName} Ana Sayfa`}>
              {site.logoUrl && <Image src={site.logoUrl} alt="" width={44} height={44} unoptimized className="h-11 w-11 shrink-0 object-contain" />}
              <span className="font-display min-w-0 wrap-anywhere text-[2rem] font-medium leading-none tracking-[-0.01em] text-[#F6F2EA]">
                {site.storeName}
              </span>
            </Link>
            <p className="max-w-[38ch] text-[0.9375rem] leading-relaxed text-[#CBBFA9]">
              PFAFF VP3 ve çoklu makine uyumlu özgün nakış desenleri, doğal keten ev tekstilleri ve kişiye özel monogram atölyesi.
            </p>
            {site.ownerName && <p className="wrap-anywhere text-[0.875rem] text-[#CBBFA9]">{site.ownerName}</p>}
            {hasContact ? (
              <address className="space-y-1 text-[0.875rem] not-italic text-[#A89A84]">
                {site.contactAddress && <p className="whitespace-pre-line">{site.contactAddress}</p>}
                {site.contactPhone && <p className="tabular-nums">{site.contactPhone}</p>}
                {site.contactEmail && <p><a href={`mailto:${site.contactEmail}`} className="wrap-anywhere hover:text-[#F6F2EA]">{site.contactEmail}</a></p>}
                <p className="flex gap-4 pt-1">
                  {site.instagramUrl && <a href={site.instagramUrl} rel="noopener noreferrer" target="_blank" className="hover:text-[#F6F2EA]">Instagram</a>}
                  {site.whatsapp && <a href={site.whatsapp} rel="noopener noreferrer" target="_blank" className="inline-flex min-h-11 items-center hover:text-[#F6F2EA]">WhatsApp ile yazın</a>}
                </p>
              </address>
            ) : (
            <p className="text-[0.875rem] text-[#A89A84]">
              Atölye iletişim bilgileri ve sosyal medya bağlantıları yayın öncesi yönetim panelinden yapılandırılacaktır.
            </p>
            )}
          </div>

          {/* Categories */}
          <div className="lg:col-span-3">
            <h3 className="font-display text-[1.35rem] text-[#F6F2EA]">
              Koleksiyonlar
            </h3>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-[#CBBFA9]">
              {CATEGORIES.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    prefetch={false}
                    href={`/koleksiyon?kategori=${cat.slug}`}
                    className="transition-colors duration-200 hover:text-[#F6F2EA]"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div className="lg:col-span-2">
            <h3 className="font-display text-[1.35rem] text-[#F6F2EA]">
              Müşteri Hizmetleri
            </h3>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-[#CBBFA9]">
              <li>
                <Link
                  prefetch={false}
                  href="/kisiye-ozel?hizmet=gorsel"
                  className="inline-flex min-h-11 items-center transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  Görselden nakışa çevirme
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/kisiye-ozel?hizmet=parca"
                  className="inline-flex min-h-11 items-center transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  İsteğe özel parça
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/#sss"
                  className="inline-flex min-h-11 items-center transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  Sık sorulan sorular
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/bilgi/dijital-indirme-kosullari"
                  className="transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  Dijital Dosya ve Lisans
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/bilgi/kargo-ve-teslimat"
                  className="transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  Kargo ve Teslimat
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/bilgi/iade-ve-iptal"
                  className="transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  İptal ve İade Koşulları
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/bilgi/iletisim"
                  className="transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Brand */}
          <div className="lg:col-span-3">
            <h3 className="font-display text-[1.35rem] text-[#F6F2EA]">
              Kurumsal ve Yasal
            </h3>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-[#CBBFA9]">
              <li>
                <Link
                  prefetch={false}
                  href="/hakkimizda"
                  className="transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  Atölye ve Hakkımızda
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/bilgi/mesafeli-satis-sozlesmesi"
                  className="transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  Mesafeli Satış Sözleşmesi
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/bilgi/gizlilik-ve-kvkk"
                  className="transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  Gizlilik Politikası ve KVKK
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/bilgi/kullanim-kosullari"
                  className="transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  Kullanım Koşulları
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/hesabim"
                  className="transition-colors duration-200 hover:text-[#F6F2EA]"
                >
                  Hesabım ve İndirmelerim
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-3 border-t border-[#4A3B31] pt-6 text-[0.875rem] text-[#A89A84] sm:flex-row sm:items-center sm:justify-between">
          <p className="wrap-anywhere">© {new Date().getFullYear()} {site.storeName}. Tüm hakları saklıdır.</p>
          <p>
            Tasarım önizleme sürümü: Katalog görselleri ve fiyatları yönetim panelinden güncellenebilir demo verileridir.
          </p>
        </div>
      </div>
    </footer>
  );
}
