import { OPEN_LICENSE_CATALOG } from "@/data/open-license-catalog";

const HIGHLIGHTS = ["halk-rozet", "geometrik-madalyon", "defne-dal", "monogram-a", "monogram-m", "monogram-z"];

export function PreviewShowcase() {
  const highlighted = HIGHLIGHTS.flatMap((slug) => {
    const design = OPEN_LICENSE_CATALOG.find((item) => item.slug === slug);
    return design ? [design] : [];
  });
  const letters = OPEN_LICENSE_CATALOG.filter((design) => design.kind === "monogram").length;

  return (
    <section aria-labelledby="onizleme-baslik" className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
      <div className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[62ch]">
          <h2 id="onizleme-baslik" className="font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-tight">
            Monogram ve özgün desen önizlemeleri
          </h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-umber">
            {letters} harf ve geometrik motifler özgün üretimdir. Gerçek VP3, PES, DST ve JEF dikişi vardır. Kumaş provası olmadığı için yakında etiketlidir ve indirilmez.
          </p>
        </div>
        <a href="/onizleme/" className="inline-flex min-h-12 items-center text-[1.0625rem] font-semibold text-cocoa underline underline-offset-4">
          {OPEN_LICENSE_CATALOG.length} önizlemenin tümü
        </a>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
        {highlighted.map((design) => (
          <li key={design.slug}>
            <a href={`/onizleme/${design.slug}/`} className="group block">
              <span className="block aspect-square bg-linen">
                <img src={design.preview} alt={`${design.name} dikiş önizlemesi`} className="h-full w-full object-contain p-3" />
              </span>
              <span className="mt-3 block text-[1.0625rem] font-semibold group-hover:text-gold-text">{design.name}</span>
              <span className="mt-1 block text-[1rem] text-umber">Yakında</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
