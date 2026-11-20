/**
 * Formats an integer kuruş amount into Turkish Lira (e.g. 18500 -> "185,00 ₺").
 * Storing prices in integer kuruş avoids floating-point rounding drift.
 */
export function formatTRY(kurus: number): string {
  const lira = kurus / 100;
  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(lira)} ₺`;
}

export function formatNumberTR(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function calculateDiscountPercent(
  originalKurus: number,
  currentKurus: number
): number {
  if (originalKurus <= currentKurus || originalKurus <= 0) return 0;
  return Math.round(((originalKurus - currentKurus) / originalKurus) * 100);
}
