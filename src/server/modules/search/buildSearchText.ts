import { normalizeTurkish } from "@/lib/search";

/** Everything that makes a product findable. Pure data: no DB access here (see reindex.ts). */
export interface SearchTextInput {
  sku: string;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryNames?: string[];
  tags?: string[];
  usageAreas?: string[];
  highlights?: string[];
  formats?: string[];
  machineBrands?: string[];
  machineModels?: string[];
  designWidthMm?: number | null;
  designHeightMm?: number | null;
  hoopLabel?: string | null;
}

/** "100x100 mm" and "10x10" style size tokens (cm form from mm / 10, one decimal at most). */
export function sizeTokens(widthMm?: number | null, heightMm?: number | null): string[] {
  if (!widthMm || !heightMm) return [];
  const cm = (v: number) => String(Math.round((v / 10) * 10) / 10);
  return [`${widthMm}x${heightMm} mm`, `${cm(widthMm)}x${cm(heightMm)}`, `${cm(widthMm)}x${cm(heightMm)} cm`];
}

/**
 * Turkish-normalized, de-duplicated text stored in Product.searchText.
 * Used by ILIKE token matching and pg_trgm similarity, so it is kept flat and lower-case.
 */
export function buildSearchText(p: SearchTextInput): string {
  const parts: string[] = [
    p.name,
    p.shortDescription ?? "",
    p.description ?? "",
    ...(p.categoryNames ?? []),
    ...(p.tags ?? []),
    ...(p.usageAreas ?? []),
    ...(p.highlights ?? []),
    ...(p.formats ?? []),
    ...(p.machineBrands ?? []),
    ...(p.machineModels ?? []),
    ...sizeTokens(p.designWidthMm, p.designHeightMm),
    p.hoopLabel ?? "",
    p.sku,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const n = normalizeTurkish(raw);
    if (!n) continue;
    // De-dup at the word level for list-like parts is unnecessary; whole-part de-dup is enough.
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out.join(" ");
}
