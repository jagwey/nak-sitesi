import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { OPEN_LICENSE_CATALOG } from "@/data/open-license-catalog";

export const metadata: Metadata = {
  title: "Desen önizlemeleri",
  description: "Özgün monogram ve geometrik nakış önizlemeleri. Satışa kapalıdır; fiziksel kumaş provası yapılmamıştır.",
};

export default function OpenLicenseIndexPage() {
  const motifs = OPEN_LICENSE_CATALOG.filter((design) => design.kind === "motif");
  const letters = OPEN_LICENSE_CATALOG.filter((design) => design.kind === "monogram");
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-[112px] sm:px-6 lg:px-10">
      <h1 className="max-w-[18ch] font-display text-[clamp(2.2rem,4vw,3.4rem)] font-semibold leading-[1.05] text-ink">
        Önizleme kataloğu
      </h1>
      <p className="mt-4 max-w-[68ch] text-[1.125rem] leading-relaxed text-umber">
        {OPEN_LICENSE_CATALOG.length} desen özgün üretimdir. Her kayıtta kaynak ve lisans vardır. VP3, PES, DST ve JEF dosyaları pyembroidery ile yazılmıştır. Kumaş provası olmadığı için satın alma kapalıdır.
      </p>
      <CatalogGroup title="Geometrik ve bitkisel motifler" designs={motifs} />
      <CatalogGroup title="Monogram A–Z" designs={letters} />
    </div>
  );
}

function CatalogGroup({
  title,
  designs,
}: {
  title: string;
  designs: typeof OPEN_LICENSE_CATALOG;
}) {
  return (
    <section className="mt-12">
      <h2 className="border-b border-hairline pb-3 text-[1.5rem] font-semibold text-ink">{title}</h2>
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
        {designs.map((design) => (
          <li key={design.slug}>
            <Link href={`/onizleme/${design.slug}`} className="group block">
              <span className="relative block aspect-square bg-linen">
                <Image src={design.preview} alt="" fill sizes="(max-width: 640px) 50vw, 16vw" className="object-contain p-3" />
              </span>
              <span className="mt-3 block text-[1.0625rem] font-semibold text-ink group-hover:text-gold-text">{design.name}</span>
              <span className="mt-1 block text-[1rem] tabular-nums text-umber">
                {design.widthMm} × {design.heightMm} mm
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
