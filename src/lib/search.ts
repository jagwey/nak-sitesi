import type {
  EmbroideryFormat,
  HoopSize,
  LicenseType,
  MachineBrand,
  Product,
  ProductType,
  UsageArea,
} from "@/data/products";

type SearchableProduct = Omit<Product, "type"> & { type?: ProductType };

/**
 * Normalizes Turkish characters cleanly so searches like "gul", "gül", "ISIM", "işleme",
 * "kisiye ozel", "cicek" match seamlessly regardless of diacritics or Turkish dotted/dotless İ/ı.
 */
export function normalizeTurkish(input: string): string {
  return input
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SYNONYM_GROUPS: string[][] = [
  ["gul", "rose", "gulu"],
  ["cicek", "cicegi", "botanik", "floral", "celenk", "gul"],
  ["pfaff", "vp3", "vip", "pcs", "husqvarna"],
  ["brother", "pes", "pec"],
  ["janome", "jef"],
  ["bernina", "exp"],
  ["tajima", "dst"],
  ["bebek", "cocuk", "muslin", "ayicik", "battaniye"],
  ["isim", "monogram", "harf", "alfabe", "kisisel", "ozel", "isimli"],
  ["havlu", "banyo", "ceyiz", "kenar", "kenari", "bordur"],
  ["dantel", "fsl", "ajur", "ajurlu", "lace", "ceyiz"],
  ["kelebek", "kanat", "doga", "butterfly"],
  ["kedi", "figuru", "figur", "hayvan", "cat", "papatya"],
  ["keten", "runner", "masa", "sofra", "ortusu", "ortu"],
  ["canta", "tote", "kanvas", "aksesuar"],
  ["baski", "onluk", "mutfak", "bez"],
  ["10x10", "kucuk", "mini", "kasnak"],
  ["13x18", "orta", "kasnak"],
  ["16x26", "buyuk", "uzun", "kasnak"],
  ["paket", "paketi", "set", "seti", "bundle", "alfabe", "alfabesi"],
];

/** Words that carry no product meaning on their own ("PFAFF uyumlu", "kasnağa sığan"). */
const STOP_WORDS = new Set([
  "uyumlu", "uyumlusu", "icin", "uygun", "olan", "ve", "ile", "bir", "sigan", "sigar",
  "sigacak", "kasnak", "kasnaga", "kasnagi", "kasnagina", "kasnagima", "cm", "mm",
]);

const PERSONAL_PHRASES = ["kisiye ozel", "kisiye", "kisisel", "kisisellestirilebilir", "isimli", "isim yazili"];
const DIGITAL_WORDS = new Set(["dijital", "indirilebilir", "indir", "dosya", "dosyasi", "dosyalari"]);
const PHYSICAL_WORDS = new Set(["fiziksel", "hazir", "kargo", "islemeli", "urun"]);

export interface QueryIntent {
  /** Hoop the shopper owns, in mm (e.g. "10x10" → [100, 100]). */
  hoopMm?: [number, number];
  type?: ProductType;
  personal?: boolean;
  /** Remaining meaningful tokens (already normalized). */
  tokens: string[];
}

/**
 * Pulls structured intent out of free text so natural queries such as
 * "10x10 kasnağa sığan", "PFAFF uyumlu" or "kişiye özel bebek nakışı" behave like filters
 * instead of failing because a filler word ("sığan", "uyumlu") matched nothing.
 */
export function parseQueryIntent(rawQuery: string): QueryIntent {
  let norm = normalizeTurkish(rawQuery.replace(/(\d)\s*[x×*]\s*(\d)/gi, "$1x$2"));
  const intent: QueryIntent = { tokens: [] };

  const hoop = norm.match(/\b(\d{2,3})x(\d{2,3})\b/);
  if (hoop) {
    const a = Number(hoop[1]);
    const b = Number(hoop[2]);
    // Values under 50 are centimetres (10x10), larger ones millimetres (100x100).
    const toMm = (v: number) => (v < 50 ? v * 10 : v);
    intent.hoopMm = [toMm(a), toMm(b)];
    norm = norm.replace(hoop[0], " ");
  }

  for (const phrase of PERSONAL_PHRASES) {
    if (norm.includes(phrase)) {
      intent.personal = true;
      norm = norm.replace(phrase, " ");
    }
  }
  norm = norm.replace(/\bozel\b/g, " ");

  const tokens: string[] = [];
  for (const t of norm.split(" ").filter(Boolean)) {
    if (DIGITAL_WORDS.has(t)) intent.type = "digital";
    else if (PHYSICAL_WORDS.has(t)) intent.type = "physical";
    else if (!STOP_WORDS.has(t)) tokens.push(t);
  }
  intent.tokens = tokens;
  return intent;
}

/** Nominal hoop area in mm from labels like "13x18 cm". */
export function hoopLabelToMm(label: string): [number, number] | null {
  const m = label.match(/(\d+)\s*x\s*(\d+)/);
  return m ? [Number(m[1]) * 10, Number(m[2]) * 10] : null;
}

/** True when the design's stitch-out size fits inside the given hoop (rotation allowed). */
export function designFitsHoop(product: SearchableProduct, hoopMm: [number, number]): boolean {
  const e = product.embroidery;
  if (!e) return false;
  const [W, H] = hoopMm;
  return (e.widthMm <= W && e.heightMm <= H) || (e.widthMm <= H && e.heightMm <= W);
}

function isPersonalMatch(product: SearchableProduct): boolean {
  if (product.personalizable) return true;
  const tags = normalizeTurkish(product.tags.join(" "));
  return /\b(isim|monogram|harf|alfabe)/.test(tags);
}

function expandSynonyms(token: string): string[] {
  const expanded = new Set<string>([token]);
  for (const group of SYNONYM_GROUPS) {
    if (group.includes(token)) {
      for (const word of group) expanded.add(word);
    }
  }
  return Array.from(expanded);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function buildProductSearchCorpus(product: SearchableProduct): {
  primaryText: string;
  secondaryText: string;
  words: string[];
} {
  const primaryParts = [
    product.name,
    product.categoryName,
    ...(product.embroidery?.formats ?? []),
    ...(product.embroidery?.supportedMachines ?? []),
    product.embroidery?.hoopSize ?? "",
    ...product.tags,
  ];
  const secondaryParts = [
    product.subtitle,
    product.description,
    ...product.usageAreas,
    product.physical?.material ?? "",
    product.type === "digital" ? "dijital dosya indirme nakis deseni" : "fiziksel urun tekstil",
    product.embroidery?.isBundle ? "paket set" : "",
  ];
  const primaryText = normalizeTurkish(primaryParts.join(" "));
  const secondaryText = normalizeTurkish(secondaryParts.join(" "));
  const words = Array.from(
    new Set(`${primaryText} ${secondaryText}`.split(" ").filter((w) => w.length >= 2))
  );
  return { primaryText, secondaryText, words };
}

const GENERIC_QUERY_WORDS = new Set([
  "nakis",
  "nakisi",
  "nakisli",
  "desen",
  "deseni",
  "desenleri",
  "dosya",
  "dosyasi",
  "dosyalari",
  "urun",
  "urunu",
  "urunleri",
  "model",
  "modeli",
  "tasarim",
  "tasarimi",
  "figuru",
  "figur",
]);

/**
 * Scores how well a product matches a user query with Turkish diacritic folding,
 * typo tolerance (edit distance <= 1 for 4-5 char words, <= 2 for 6+ char words),
 * and embroidery domain synonym matching. Generic store nouns act as boosters
 * rather than diluting specific motif queries like "VP3 gül nakışı".
 */
export function scoreProductMatch(product: SearchableProduct, rawQuery: string): number {
  const norm = normalizeTurkish(rawQuery);
  if (!norm) return 1;

  const intent = parseQueryIntent(rawQuery);
  if (intent.hoopMm && !designFitsHoop(product, intent.hoopMm)) return 0;
  if (intent.type && product.type !== intent.type) return 0;
  if (intent.personal && !isPersonalMatch(product)) return 0;

  const allTokens = intent.tokens;
  if (allTokens.length === 0) return 2;
  const specificTokens = allTokens.filter((t) => !GENERIC_QUERY_WORDS.has(t));
  const tokens = specificTokens.length > 0 ? specificTokens : allTokens;
  const { primaryText, secondaryText, words } = buildProductSearchCorpus(product);

  let totalScore = 0;
  let matchedTokens = 0;

  for (const token of tokens) {
    let bestTokenScore = 0;

    // 1. Direct substring match in primary fields
    if (primaryText.includes(token)) {
      bestTokenScore = Math.max(bestTokenScore, 10);
    } else if (secondaryText.includes(token)) {
      bestTokenScore = Math.max(bestTokenScore, 6);
    }

    // 2. Synonym match
    if (bestTokenScore < 7) {
      const syns = expandSynonyms(token);
      for (const syn of syns) {
        if (syn === token) continue;
        if (primaryText.includes(syn)) {
          bestTokenScore = Math.max(bestTokenScore, 7);
          break;
        }
        if (secondaryText.includes(syn)) {
          bestTokenScore = Math.max(bestTokenScore, 4);
        }
      }
    }

    // 3. Typo-tolerant fuzzy match against indexed words
    if (bestTokenScore === 0 && token.length >= 4) {
      const maxDist = token.length >= 6 ? 2 : 1;
      for (const word of words) {
        if (Math.abs(word.length - token.length) > maxDist) continue;
        const dist = levenshtein(token, word);
        if (dist <= maxDist) {
          bestTokenScore = Math.max(bestTokenScore, dist === 1 ? 5 : 3);
          break;
        }
      }
    }

    if (bestTokenScore > 0) {
      matchedTokens += 1;
      totalScore += bestTokenScore;
    }
  }

  // Require all specific tokens to match for crisp precision (<= 3 tokens)
  const minRequired =
    tokens.length <= 3 ? tokens.length : Math.ceil(tokens.length * 0.75);
  if (matchedTokens < minRequired) return 0;

  // Phrase bonus
  if (primaryText.includes(norm)) totalScore += 8;
  return totalScore;
}

export interface CatalogFilterState {
  q: string;
  tur: "all" | ProductType;
  kategori: string;
  format: EmbroideryFormat | "";
  makine: MachineBrand | "";
  kasnak: HoopSize | "";
  olcu: "" | "Küçük (< 10 cm)" | "Orta (10–18 cm)" | "Büyük (> 18 cm)";
  renkSayisi: "" | "1-3" | "4-6" | "7+";
  kullanim: UsageArea | "";
  lisans: LicenseType | "";
  kisisellestirme: boolean;
  stok: boolean;
  minFiyat: string;
  maxFiyat: string;
  sirala: "onerilen" | "yeni" | "fiyat-artan" | "fiyat-azalan";
}

export const DEFAULT_FILTERS: CatalogFilterState = {
  q: "",
  tur: "all",
  kategori: "",
  format: "",
  makine: "",
  kasnak: "",
  olcu: "",
  renkSayisi: "",
  kullanim: "",
  lisans: "",
  kisisellestirme: false,
  stok: false,
  minFiyat: "",
  maxFiyat: "",
  sirala: "onerilen",
};

export function parseFiltersFromParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): CatalogFilterState {
  const get = (key: string): string => {
    if (params instanceof URLSearchParams) return params.get(key) ?? "";
    const val = params[key];
    return Array.isArray(val) ? val[0] ?? "" : val ?? "";
  };

  const turParam = get("tur");
  const tur: CatalogFilterState["tur"] =
    turParam === "dijital" || turParam === "digital"
      ? "digital"
      : turParam === "fiziksel" || turParam === "physical"
      ? "physical"
      : "all";

  const siralaParam = get("sirala");
  const sirala: CatalogFilterState["sirala"] =
    siralaParam === "yeni" ||
    siralaParam === "fiyat-artan" ||
    siralaParam === "fiyat-azalan"
      ? siralaParam
      : "onerilen";

  return {
    q: get("q"),
    tur,
    kategori: get("kategori"),
    format: get("format") as CatalogFilterState["format"],
    makine: get("makine") as CatalogFilterState["makine"],
    kasnak: get("kasnak") as CatalogFilterState["kasnak"],
    olcu: get("olcu") as CatalogFilterState["olcu"],
    renkSayisi: get("renkSayisi") as CatalogFilterState["renkSayisi"],
    kullanim: get("kullanim") as CatalogFilterState["kullanim"],
    lisans: get("lisans") as CatalogFilterState["lisans"],
    kisisellestirme: get("kisisellestirme") === "true",
    stok: get("stok") === "true",
    minFiyat: get("minFiyat"),
    maxFiyat: get("maxFiyat"),
    sirala,
  };
}

export function serializeFiltersToParams(filters: CatalogFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.tur === "digital") params.set("tur", "dijital");
  if (filters.tur === "physical") params.set("tur", "fiziksel");
  if (filters.kategori) params.set("kategori", filters.kategori);
  if (filters.format) params.set("format", filters.format);
  if (filters.makine) params.set("makine", filters.makine);
  if (filters.kasnak) params.set("kasnak", filters.kasnak);
  if (filters.olcu) params.set("olcu", filters.olcu);
  if (filters.renkSayisi) params.set("renkSayisi", filters.renkSayisi);
  if (filters.kullanim) params.set("kullanim", filters.kullanim);
  if (filters.lisans) params.set("lisans", filters.lisans);
  if (filters.kisisellestirme) params.set("kisisellestirme", "true");
  if (filters.stok) params.set("stok", "true");
  if (filters.minFiyat) params.set("minFiyat", filters.minFiyat);
  if (filters.maxFiyat) params.set("maxFiyat", filters.maxFiyat);
  if (filters.sirala !== "onerilen") params.set("sirala", filters.sirala);
  return params;
}

export function filterAndSortProducts<T extends SearchableProduct>(
  products: T[],
  filters: CatalogFilterState
): T[] {
  const minKurus = filters.minFiyat ? Number(filters.minFiyat) * 100 : null;
  const maxKurus = filters.maxFiyat ? Number(filters.maxFiyat) * 100 : null;

  const scored = products
    .map((product) => ({
      product,
      score: scoreProductMatch(product, filters.q),
    }))
    .filter(({ product, score }) => {
      if (filters.q.trim() && score === 0) return false;
      if (filters.tur !== "all" && product.type !== filters.tur) return false;
      if (filters.kategori) {
        if (filters.kategori === "dijital-nakis-desenleri") {
          if (product.type !== "digital") return false;
        } else if (filters.kategori === "kisiye-ozel-urunler") {
          if (!product.personalizable && product.categorySlug !== filters.kategori)
            return false;
        } else if (product.categorySlug !== filters.kategori) {
          return false;
        }
      }
      if (minKurus !== null && !Number.isNaN(minKurus) && product.priceKurus < minKurus) {
        return false;
      }
      if (maxKurus !== null && !Number.isNaN(maxKurus) && product.priceKurus > maxKurus) {
        return false;
      }
      if (filters.format) {
        if (!product.embroidery?.formats.includes(filters.format)) return false;
      }
      if (filters.makine) {
        if (!product.embroidery?.supportedMachines.includes(filters.makine)) return false;
      }
      if (filters.kasnak) {
        // "Kasnağıma sığanlar": the design must fit inside the shopper's hoop.
        const hoopMm = hoopLabelToMm(filters.kasnak);
        if (!hoopMm || !designFitsHoop(product, hoopMm)) return false;
      }
      if (filters.olcu) {
        if (product.embroidery?.patternSizeCategory !== filters.olcu) return false;
      }
      if (filters.renkSayisi) {
        const count = product.embroidery?.colorCount;
        if (count === undefined) return false;
        if (filters.renkSayisi === "1-3" && count > 3) return false;
        if (filters.renkSayisi === "4-6" && (count < 4 || count > 6)) return false;
        if (filters.renkSayisi === "7+" && count < 7) return false;
      }
      if (filters.kullanim) {
        if (!product.usageAreas.includes(filters.kullanim)) return false;
      }
      if (filters.lisans) {
        if (!product.embroidery?.licenses.includes(filters.lisans)) return false;
      }
      if (filters.kisisellestirme && !product.personalizable) return false;
      if (filters.stok) {
        if (product.type === "physical" && !product.physical?.inStock) return false;
      }
      return true;
    });

  scored.sort((a, b) => {
    if (filters.sirala === "fiyat-artan") {
      return a.product.priceKurus - b.product.priceKurus;
    }
    if (filters.sirala === "fiyat-azalan") {
      return b.product.priceKurus - a.product.priceKurus;
    }
    if (filters.sirala === "yeni") {
      return (b.product.isNew ? 1 : 0) - (a.product.isNew ? 1 : 0);
    }
    if (filters.q.trim() && b.score !== a.score) {
      return b.score - a.score;
    }
    return (b.product.isFeatured ? 1 : 0) - (a.product.isFeatured ? 1 : 0);
  });

  return scored.map((entry) => entry.product);
}

/** Number of products each option would return with the other active filters kept. */
export function countFacet<K extends keyof CatalogFilterState>(
  products: Product[],
  filters: CatalogFilterState,
  key: K,
  values: CatalogFilterState[K][]
): Map<CatalogFilterState[K], number> {
  const out = new Map<CatalogFilterState[K], number>();
  for (const v of values) {
    out.set(v, filterAndSortProducts(products, { ...filters, [key]: v }).length);
  }
  return out;
}

export interface SearchSuggestion {
  label: string;
  href: string;
  kind: "kategori" | "filtre" | "urun";
}

/** Query-aware shortcuts shown under the search box (categories, filters, products). */
export function buildSuggestions(
  products: Product[],
  categories: { slug: string; name: string }[],
  rawQuery: string,
  limit = 6
): SearchSuggestion[] {
  const norm = normalizeTurkish(rawQuery);
  if (norm.length < 2) return [];
  const out: SearchSuggestion[] = [];
  const intent = parseQueryIntent(rawQuery);
  if (intent.hoopMm) {
    const cm = `${intent.hoopMm[0] / 10}x${intent.hoopMm[1] / 10} cm`;
    out.push({ label: `${cm} kasnağa sığan desenler`, href: `/koleksiyon?tur=dijital&kasnak=${encodeURIComponent(cm)}`, kind: "filtre" });
  }
  for (const c of categories) {
    if (normalizeTurkish(c.name).includes(norm) || norm.split(" ").some((t) => t.length > 2 && normalizeTurkish(c.name).includes(t))) {
      out.push({ label: c.name, href: `/koleksiyon?kategori=${c.slug}`, kind: "kategori" });
    }
  }
  for (const p of products) {
    if (scoreProductMatch(p, rawQuery) > 0) out.push({ label: p.name, href: `/urun/${p.slug}`, kind: "urun" });
  }
  return out.slice(0, limit);
}
