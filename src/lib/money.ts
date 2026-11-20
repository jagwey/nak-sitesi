/** Pure money helpers (no server-only): shared by admin forms, CSV import and tests. Money is always integer kuruş. */

export const MAX_KURUS = 2_000_000_000; // fits Postgres INT4 with headroom

/**
 * Parse a Turkish-formatted TL amount into integer kuruş. Returns null when the text is not a valid amount.
 * "1.234,50" -> 123450, "250" -> 25000, "12,5" -> 1250, "12.5" -> 1250, "1.234" -> 123400 (dot = thousands group).
 * Never goes through floating point.
 */
export function parseTlToKurus(input: string): number | null {
  let s = input.replace(/[₺\s]/g, "").replace(/tl$/i, "");
  if (!s) return null;
  let intPart: string;
  let frac = "";
  if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length !== 2) return null;
    const [i, f] = parts;
    if (!/^\d{1,3}(\.\d{3})+$|^\d+$/.test(i)) return null;
    if (!/^\d{0,2}$/.test(f)) return null;
    intPart = i.replace(/\./g, "");
    frac = f;
  } else if (s.includes(".")) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) intPart = s.replace(/\./g, "");
    else if (/^\d+\.\d{1,2}$/.test(s)) [intPart, frac] = s.split(".");
    else return null;
  } else {
    if (!/^\d+$/.test(s)) return null;
    intPart = s;
  }
  if (intPart.length > 10) return null;
  const kurus = Number(intPart) * 100 + Number(frac.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(kurus) || kurus > MAX_KURUS) return null;
  return kurus;
}

/** Kuruş -> text for an editable TL input ("1234,50"). */
export function kurusToTlInput(kurus: number | null | undefined): string {
  if (kurus === null || kurus === undefined) return "";
  const lira = Math.floor(kurus / 100);
  const k = String(kurus % 100).padStart(2, "0");
  return k === "00" ? String(lira) : `${lira},${k}`;
}

/** Percentage price change with integer arithmetic (percent has at most 2 decimals; rounding half up on kuruş). */
export function applyPercent(kurus: number, percent: number, direction: "increase" | "decrease"): number {
  const bp = Math.round(percent * 100);
  const factor = direction === "increase" ? 10000 + bp : 10000 - bp;
  return Math.round((kurus * factor) / 10000);
}

export const roundToWholeLira = (kurus: number): number => Math.round(kurus / 100) * 100;
