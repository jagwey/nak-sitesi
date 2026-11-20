export const EMBROIDERY_OFFER = [
  { minDesigns: 5, percent: 20 },
  { minDesigns: 3, percent: 10 },
] as const;

export type EmbroideryOfferTier = (typeof EMBROIDERY_OFFER)[number];
