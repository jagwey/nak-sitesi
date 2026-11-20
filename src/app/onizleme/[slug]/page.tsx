import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FabricMockup } from "@/components/product/FabricMockup";
import { findOpenLicenseDesign, OPEN_LICENSE_CATALOG } from "@/data/open-license-catalog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return OPEN_LICENSE_CATALOG.map((design) => ({ slug: design.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const design = findOpenLicenseDesign(slug);
  if (!design) return { title: "Önizleme bulunamadı" };
  return { title: design.name, description: design.summary };
}

export default async function OpenLicenseDesignPage({ params }: PageProps) {
  const { slug } = await params;
  const design = findOpenLicenseDesign(slug);
  if (!design) notFound();

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      <nav aria-label="Sayfa yolu" className="mb-4 text-[1rem] text-umber">
        <Link href="/onizleme" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          Önizleme kataloğu
        </Link>
      </nav>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="relative aspect-square bg-linen">
            <Image
              src={design.preview}
              alt={`${design.name} dikiş önizlemesi`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-contain p-8"
            />
          </div>
          <FabricMockup
            imageUrl={design.preview}
            imageAlt={`${design.name} kumaş üzerinde`}
            initialWidthMm={design.widthMm}
            initialHeightMm={design.heightMm}
          />
        </div>
        <div className="lg:col-span-5">
          <p className="text-[1rem] font-semibold text-gold-text">Önizleme · yakında</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,3vw,3rem)] font-semibold leading-tight text-ink">{design.name}</h1>
          <p className="mt-3 text-[1.125rem] leading-relaxed text-umber">{design.summary}</p>
          <dl className="mt-6 divide-y divide-hairline border-y border-hairline text-[1.0625rem]">
            <Row label="Ölçü" value={`${design.widthMm} × ${design.heightMm} mm`} />
            <Row label="Dikiş" value={design.stitchCount.toLocaleString("tr-TR")} />
            <Row label="Dosyalar" value={design.formats.join(", ")} />
            <Row label="Kaynak" value={design.sourceName} />
            <Row label="Lisans" value={design.license} />
          </dl>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-umber">{design.note}</p>
          <p className="mt-4 text-[1.0625rem] font-semibold text-ink">Satın alma kapalı. Dosya, kontrol edilmeden indirilmez.</p>
          <Link
            href="/kisiye-ozel?hizmet=gorsel"
            className="btn-buy mt-6 inline-flex min-h-12 items-center px-5 text-[1.0625rem]"
          >
            Kendi görseliniz için teklif isteyin
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-3">
      <dt className="text-umber">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
