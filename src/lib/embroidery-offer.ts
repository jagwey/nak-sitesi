export const EMBROIDERY_OFFER = [
  { minDesigns: 5, percent: 20 },
  { minDesigns: 3, percent: 10 },
] as const;

export const embroideryOfferText = [...EMBROIDERY_OFFER].reverse()
  .map(({ minDesigns, percent }) => minDesigns + " farklı desende %" + percent)
  .join(", ") + " sepet indirimi.";
