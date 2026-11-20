import Image from "next/image";
import Link from "next/link";
import { OPEN_LICENSE_CATALOG } from "@/data/open-license-catalog";

const HIGHLIGHTS = ["halk-rozet", "geometrik-madalyon", "defne-dal", "monogram-a", "monogram-m", "monogram-z"];

export function OpenLicenseShowcase() {
  const highlighted = HIGHLIGHTS.map((slug) => OPEN_LICENSE_CATALOG.find((design) => design.slug === slug)).filter(
    (design) => design !== undefined,
  );
  const letters = OPEN_LICENSE_CATALOG.filter((design) => design.kind === "monogram").length;
  return (
    <section aria-labelledby="acik-lisans-baslik" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
      <div className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[62ch]">
          <h2 id="acik-lisans-baslik" className="font-display text-[clamp(1.9rem,3vw,2.75rem)] font-semibold leading-tight text-ink">
            Monogram ve özgün desen önizlemeleri
          </h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-umber">
            {letters} harf ve geometrik motifler bu depoda üretildi. Lisans özgün eserdir. Dosyalar gerçek VP3, PES, DST ve JEF dikişidir; kumaş provası olmadığı için satışa kapalıdır.
          </p>
        </div>
        <Link
          href="/onizleme"
          prefetch={false}
          className="inline-flex min-h-12 items-center text-[1.0625rem] font-semibold text-cocoa underline underline-offset-4"
        >
          {OPEN_LICENSE_CATALOG.length} önizlemenin tümü
        </Link>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
        {highlighted.map((design) => (
          <li key={design.slug}>
            <Link href={`/onizleme/${design.slug}`} prefetch={false} className="group block">
              <span className="relative block aspect-square bg-linen">
                <Image
                  src={design.preview}
                  alt={`${design.name} dikiş önizlemesi`}
                  fill
                  sizes="(max-width: 640px) 50vw, 16vw"
                  className="object-contain p-3"
                />
              </span>
              <span className="mt-3 block text-[1.0625rem] font-semibold text-ink group-hover:text-gold-text">{design.name}</span>
              <span className="mt-1 block text-[1rem] text-umber">Önizleme · yakında</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
