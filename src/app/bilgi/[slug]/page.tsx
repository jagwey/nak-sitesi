import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { INFO_PAGES } from "@/data/site-content";
import { getLegalText, getSiteSettings } from "@/server/modules/settings/service";

const LEGAL_SLUGS: Record<string, "kvkk" | "mesafeli-satis" | "iade-iptal"> = {
  "gizlilik-ve-kvkk": "kvkk",
  "mesafeli-satis-sozlesmesi": "mesafeli-satis",
  "iade-ve-iptal": "iade-iptal",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(INFO_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = INFO_PAGES[slug];
  if (!page) return { title: "Sayfa bulunamadı" };
  return {
    title: page.title,
    description: page.lead,
  };
}

export default async function InfoPage({ params }: PageProps) {
  const { slug } = await params;
  const page = INFO_PAGES[slug];
  if (!page) notFound();
  const legalKey = LEGAL_SLUGS[slug];
  const cms = legalKey ? (await getLegalText(legalKey).catch(() => "")).trim() : "";
  const site = slug === "iletisim" ? await getSiteSettings().catch(() => null) : null;
  const cmsParas = cms ? cms.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean) : [];

  return (
    <div className="mx-auto max-w-[960px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      <nav aria-label="Sayfa yolu" className="mb-6 text-[0.875rem] text-umber">
        <Link href="/" className="hover:text-ink">
          Ana Sayfa
        </Link>
        <span className="mx-2 text-stone">/</span>
        <span className="text-ink">{page.title}</span>
      </nav>

      <h1 className="font-display text-[clamp(2.2rem,4vw,3.15rem)] leading-tight text-ink">
        {page.title}
      </h1>
      <p className="mt-4 max-w-[62ch] text-[1.0625rem] leading-relaxed text-umber">
        {page.lead}
      </p>

      {page.isLegalPlaceholder && !cms && (
        <div className="mt-6 border border-hairline-strong bg-linen/55 p-4 text-[0.875rem] leading-relaxed text-ink">
          <strong>Yasal bilgilendirme taslağı:</strong> Bu sayfa yapılandırılabilir metin alanı olarak hazırlanmıştır. İşletmenin resmi ticari bilgileri eklenerek canlı yayına geçmeden önce işletme sahibi ve hukuk danışmanı tarafından onaylanmalıdır.
        </div>
      )}

      {site && (site.contactEmail || site.contactPhone || site.contactAddress) && (
        <address className="mt-8 space-y-1 text-[1rem] not-italic text-ink">
          {site.contactAddress && <p className="whitespace-pre-line">{site.contactAddress}</p>}
          {site.contactPhone && <p className="tabular-nums">{site.contactPhone}</p>}
          {site.contactEmail && <p><a className="underline underline-offset-2" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></p>}
        </address>
      )}

      <div className="mt-10 divide-y divide-hairline border-t border-hairline">
        {cmsParas.length > 0 && (
          <section className="py-7">
            <div className="max-w-[65ch] space-y-3 whitespace-pre-line text-[1rem] leading-relaxed text-umber">
              {cmsParas.map((t, i) => <p key={i}>{t}</p>)}
            </div>
          </section>
        )}
        {cmsParas.length === 0 && page.sections.map((section) => (
          <section key={section.heading} className="py-7">
            <h2 className="font-display text-[1.6rem] text-ink">
              {section.heading}
            </h2>
            <div className="mt-3 max-w-[65ch] space-y-3 text-[1rem] leading-relaxed text-umber">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
