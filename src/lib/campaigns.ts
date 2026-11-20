import { EMBROIDERY_OFFER } from "@/lib/embroidery-offer";

/**
 * Sepette uygulanan çoklu desen indirimi `EMBROIDERY_OFFER` içindedir.
 * Paket örnekleri yalnızca `active` ve `appliedInCart` ikisi de true ise vitrinde gösterilir.
 * Kapalı örnek, sepette indirim varmış gibi duyurulmaz.
 */
export const BUNDLE_CAMPAIGNS = [
  {
    id: "3-al-2-ode",
    title: "3 al 2 öde",
    buy: 3,
    pay: 2,
    appliesTo: "digital" as const,
    active: false,
    appliedInCart: false,
    note: "Örnek yapı. Her iki anahtar açılmadan vitrinde gösterilmez ve sepette uygulanmaz.",
  },
] as const;

export type BundleCampaign = (typeof BUNDLE_CAMPAIGNS)[number];

export function activeEmbroideryTiers() {
  return [...EMBROIDERY_OFFER].sort((a, b) => a.minDesigns - b.minDesigns);
}

export function visibleBundleCampaigns(): BundleCampaign[] {
  return BUNDLE_CAMPAIGNS.filter((campaign) => campaign.active && campaign.appliedInCart);
}

export function campaignBannerText(): string {
  const tiers = activeEmbroideryTiers()
    .map((tier) => `${tier.minDesigns} farklı desende %${tier.percent}`)
    .join(", ");
  return `Site içi sepette dijital desen indirimi: ${tiers}. İndirim yalnızca bu sitedeki ödeme adımında uygulanır.`;
}
