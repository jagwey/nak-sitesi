import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FabricMockup } from "@/components/product/FabricMockup";
import { findOpenLicenseDesign, OPEN_LICENSE_CATALOG } from "@/data/open-license-catalog";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return OPEN_LICENSE_CATALOG.map((design) => ({ slug: design.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const design = findOpenLicenseDesign(slug);
  if (!design) return { title: "Önizleme bulunamadı" };
  return { title: `${design.name} · yakında`, description: design.summary };
}

export default async function PreviewDesignPage({ params }: PageProps) {
  const { slug } = await params;
  const design = findOpenLicenseDesign(slug);
  if (!design) notFound();

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      <a href="/onizleme/" className="inline-flex min-h-11 items-center text-[1.0625rem] font-medium text-cocoa underline-offset-4 hover:underline">
        Önizleme kataloğu
      </a>
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="bg-linen">
            <img src={design.preview} alt={`${design.name} dikiş önizlemesi`} className="aspect-square w-full object-contain p-8" />
          </div>
          <FabricMockup
            imageUrl={design.preview}
            imageAlt={`${design.name} kumaş üzerinde`}
            initialWidthMm={design.widthMm}
            initialHeightMm={design.heightMm}
          />
        </div>
        <div className="lg:col-span-5">
          <p className="text-[1rem] font-semibold text-gold-text">Yakında</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,3vw,3rem)] leading-tight">{design.name}</h1>
          <p className="mt-3 text-[1.125rem] leading-relaxed text-umber">{design.summary}</p>
          <dl className="mt-6 divide-y divide-hairline border-y border-hairline text-[1.0625rem]">
            <Row label="Ölçü" value={`${design.widthMm} × ${design.heightMm} mm`} />
            <Row label="Dikiş" value={design.stitchCount.toLocaleString("tr-TR")} />
            <Row label="Dosyalar" value={design.formats.join(", ")} />
            <Row label="Kaynak" value={design.sourceName} />
            <Row label="Lisans" value={design.license} />
          </dl>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-umber">{design.note}</p>
          <p className="mt-4 text-[1.0625rem] font-semibold">Satışa kapalı. İndirme bağlantısı yok.</p>
          <a href="/kisiye-ozel/#gorsel" className="btn-buy mt-6 inline-flex min-h-12 items-center px-5 text-[1.0625rem] font-semibold">
            Görselden nakış hizmetini oku
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-3">
      <dt className="text-umber">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
