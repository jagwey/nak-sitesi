import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSiteSettings } from "@/server/modules/settings/service";

export const metadata: Metadata = {
  title: "Hakkımızda ve Atölye",
  description:
    "Atölyenin üretim disiplini, dijital desen kalitesi ve doğal tekstil yaklaşımı.",
};

export default async function HakkimizdaPage() {
  const { storeName, logoUrl, ownerName, aboutText } = await getSiteSettings();
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      {/* Editorial Intro */}
      <div className="grid grid-cols-1 items-center gap-10 border-b border-hairline pb-16 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <h1 className="font-display text-[clamp(2.35rem,4.5vw,3.85rem)] leading-[1.04] text-ink">
            Geleneksel zarafetle modern makine nakışının buluşma noktası.
          </h1>
          <p className="max-w-[58ch] text-[1.0625rem] leading-relaxed text-umber">
            {storeName}, hem kendi makinesinde üretim yapan zanaatkârlara yönelik yüksek hassasiyetli dijital nakış dosyaları hem de evlere kalıcı sıcaklık katan işlemeli doğal tekstil ürünleri sunmak için tasarlanmış bir nakış atölyesidir.
          </p>
          {aboutText && <p className="max-w-[58ch] whitespace-pre-line text-[1.0625rem] leading-relaxed text-umber">{aboutText}</p>}
          {ownerName && <p className="wrap-anywhere text-[0.875rem] text-stone">{ownerName}</p>}
        </div>

        <div className="flex min-w-0 justify-center lg:col-span-5">
          <div className="max-w-full border border-hairline bg-surface p-10 sm:p-14">
            {logoUrl ? (
              <Image src={logoUrl} alt={storeName} width={260} height={120} unoptimized className="h-[120px] max-w-full object-contain" />
            ) : (
              <p className="font-display w-[220px] max-w-full wrap-anywhere text-center text-[2.25rem] font-medium leading-tight tracking-[-0.01em] text-ink sm:w-[260px]">
                {storeName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Atelier Image + Principles */}
      <div className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <div className="relative aspect-[3/2] w-full overflow-hidden bg-linen">
            <Image
              src="/images/atelier-workbench.webp"
              alt="Atölye çalışma masası ve makine nakışı uygulaması"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="space-y-8 lg:col-span-6">
          <h2 className="font-display text-[clamp(1.85rem,3vw,2.6rem)] leading-tight text-ink">
            Her desende ve her kumaşta üç temel ilke
          </h2>

          <div className="divide-y divide-hairline border-y border-hairline">
            <div className="py-5">
              <h3 className="font-display text-[1.35rem] text-ink">
                Gerçek kumaş üzerinde dikiş doğrulaması
              </h3>
              <p className="mt-1.5 text-[0.9375rem] text-umber">
                Dijital nakış dosyaları PFAFF VP3 ve yaygın makine formatlarında dikiş yoğunluğu, alt dikiş ve iplik atlama dengesi gözetilerek hazırlanır.
              </p>
            </div>
            <div className="py-5">
              <h3 className="font-display text-[1.35rem] text-ink">
                Doğal elyaflar ve zamansız renk dengesi
              </h3>
              <p className="mt-1.5 text-[0.9375rem] text-umber">
                Ham keten, uzun elyaflı pamuk havlu ve nefes alan müslin gibi dokunsal kumaşlar, abartıdan uzak sıcak tonlarla bir araya getirilir.
              </p>
            </div>
            <div className="py-5">
              <h3 className="font-display text-[1.35rem] text-ink">
                Kişiye özel özen ve şeffaf süreç
              </h3>
              <p className="mt-1.5 text-[0.9375rem] text-umber">
                İsim, baş harf monogramı veya kurumsal logo taleplerinde üretim öncesi canlı önizleme ve net termin paylaşımı sunulur.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <Link
              href="/koleksiyon"
              className="inline-flex h-12 items-center bg-cocoa px-7 text-[0.9375rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
            >
              Koleksiyonu Keşfet
            </Link>
            <Link
              href="/kisiye-ozel"
              className="inline-flex h-12 items-center gap-2 text-[0.9375rem] font-medium text-ink underline-offset-4 hover:text-gold-text hover:underline"
            >
              Kişiye Özel Tasarım Talebi
              <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
