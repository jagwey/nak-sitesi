import Link from "next/link";
import { campaignBannerText, visibleBundleCampaigns } from "@/lib/campaigns";

export function CampaignBanner() {
  const bundles = visibleBundleCampaigns();
  return (
    <section aria-label="Kampanyalar" className="border-b border-hairline bg-linen">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <p className="max-w-[70ch] text-[1.0625rem] leading-snug text-ink">{campaignBannerText()}</p>
        <Link
          href="/koleksiyon?tur=dijital"
          prefetch={false}
          className="inline-flex min-h-12 shrink-0 items-center justify-center bg-cocoa px-4 text-[1rem] font-semibold text-ivory transition-colors duration-200 hover:bg-cocoa-hover"
        >
          Desenlere bak
        </Link>
      </div>
      {bundles.length > 0 && (
        <ul className="mx-auto flex max-w-[1440px] flex-wrap gap-2 px-4 pb-4 sm:px-6 lg:px-10">
          {bundles.map((bundle) => (
            <li key={bundle.id} className="border border-cocoa bg-ivory px-3 py-2 text-[1rem] text-ink">
              {bundle.title}: {bundle.buy} desen al, {bundle.pay} desen öde
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
