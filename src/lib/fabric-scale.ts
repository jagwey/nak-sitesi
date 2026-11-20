export const FABRIC_WINDOWS = [
  { id: "cotton", label: "Pamuklu tişört", widthMm: 280 },
  { id: "denim", label: "Kot / denim", widthMm: 160 },
  { id: "linen", label: "Keten", widthMm: 300 },
  { id: "fleece", label: "Polar / sweatshirt", widthMm: 320 },
  { id: "terry", label: "Havlu", widthMm: 400 },
  { id: "canvas", label: "Kanvas çanta", widthMm: 260 },
] as const;

export type FabricWindowId = (typeof FABRIC_WINDOWS)[number]["id"];

/** Desenin, seçilen kumaş penceresine göre yüzde genişliği. 12–78 arasında tutulur. */
export function designWidthPercent(designMm: number, fabricWidthMm: number): number {
  if (!Number.isFinite(designMm) || !Number.isFinite(fabricWidthMm) || fabricWidthMm <= 0) return 12;
  const ratio = (designMm / fabricWidthMm) * 100;
  return Math.round(Math.min(78, Math.max(12, ratio)) * 10) / 10;
}

export function clampDesignMm(value: number): number {
  if (!Number.isFinite(value)) return 80;
  return Math.round(Math.min(180, Math.max(20, value)));
}
