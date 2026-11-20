export const DEFAULT_HERO_TITLE = "Görselden nakışa çevirme ve isteğe özel parça";

const LEGACY_HERO_TITLES = new Set([
  "",
  "Nakış makinesi desenleri ve el işi tekstiller",
]);

/** Eski varsayılan başlığı, iki hizmeti açıkça söyleyen başlıkla değiştirir. Panelden girilmiş özel başlık korunur. */
export function resolveHeroTitle(stored?: string | null): string {
  const value = stored?.trim() ?? "";
  if (LEGACY_HERO_TITLES.has(value)) return DEFAULT_HERO_TITLE;
  return value;
}
