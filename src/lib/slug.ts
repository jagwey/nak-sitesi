import { normalizeTurkish } from "./search";

/** "Çiçek Çelengi & Gül" -> "cicek-celengi-gul" (Turkish transliteration, ASCII only). */
export function slugifyTr(input: string, max = 80): string {
  return normalizeTurkish(input).replace(/\s+/g, "-").replace(/^-+|-+$/g, "").slice(0, max).replace(/-+$/g, "");
}
