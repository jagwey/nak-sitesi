import type { EmbroideryOfferTier } from "@/lib/embroidery-offer";

export function EmbroideryOffer({ tiers }: { tiers: readonly EmbroideryOfferTier[] }) {
  if (tiers.length === 0) return null;

  return (
    <p className="border-l-4 border-gold bg-linen px-4 py-3.5 text-[0.9375rem] text-ink">
      <strong className="font-semibold">Dijital nakış desenlerinde sepet indirimi</strong>
      <span className="mt-1 block">
        {tiers.map(({ minDesigns, percent }) => `${minDesigns} farklı desende %${percent}`).join(" · ")}
      </span>
    </p>
  );
}
