import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { ALL_USAGE_AREAS } from "@/data/products";
import {
  hoopLabelToMm,
  normalizeTurkish,
  parseQueryIntent,
  type CatalogFilterState,
  type SearchSuggestion,
} from "@/lib/search";
import type { Facets, SearchEngine, SearchParams, SearchResult } from "./types";

type Sql = Prisma.Sql;
const sql = Prisma.sql;
const raw = Prisma.raw;

/** Types sold as downloadable files. Constants only: safe to inline. */
const DIGITAL_LIST = raw(`'DIGITAL_EMBROIDERY','DIGITAL_PRINT','BUNDLE'`);
const IS_DIGITAL = sql`p."type" IN (${DIGITAL_LIST})`;
const FROM = sql`FROM "Product" p LEFT JOIN "EmbroideryMetadata" em ON em."productId" = p."id"`;

const escLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
const and = (parts: Sql[]): Sql => (parts.length ? Prisma.join(parts, " AND ") : sql`TRUE`);

/** A format counts for a product when a current ACTIVE file exists for it; with no files at all, the declared list applies. */
function effectiveFormat(extra: Sql): Sql {
  return sql`EXISTS (
    SELECT 1 FROM "FileFormat" ff WHERE ${extra} AND (
      EXISTS (SELECT 1 FROM "DigitalFile" d WHERE d."productId" = p."id" AND d."formatId" = ff."id" AND d."isCurrent" AND d."status" = 'ACTIVE')
      OR (
        NOT EXISTS (SELECT 1 FROM "DigitalFile" d2 WHERE d2."productId" = p."id" AND d2."isCurrent" AND d2."status" = 'ACTIVE')
        AND EXISTS (SELECT 1 FROM "ProductFormat" pf WHERE pf."productId" = p."id" AND pf."formatId" = ff."id")
      )
    )
  )`;
}

/** Brand reads (any model of it) at least one of the product's formats. */
function brandReads(brandNameOrSlug: string): Sql {
  const key = brandNameOrSlug.toLowerCase();
  return effectiveFormat(sql`EXISTS (
    SELECT 1 FROM "MachineModelFormat" mf
    JOIN "MachineModel" mm ON mm."id" = mf."modelId"
    JOIN "MachineBrand" mb ON mb."id" = mm."brandId"
    WHERE mf."formatId" = ff."id" AND (lower(mb."name") = ${key} OR mb."slug" = ${key})
  )`);
}

function fitsHoop(mm: [number, number]): Sql {
  const [W, H] = mm;
  return sql`(em."designWidthMm" IS NOT NULL AND em."designHeightMm" IS NOT NULL AND (
    (em."designWidthMm" <= ${W} AND em."designHeightMm" <= ${H}) OR (em."designWidthMm" <= ${H} AND em."designHeightMm" <= ${W})
  ))`;
}

type Dim = "tur" | "kategori" | "format" | "makine" | "kasnak" | "olcu" | "renkSayisi" | "kullanim" | "lisans";

/** Condition for one value of one dimension. Mirrors the legacy client-side semantics. */
function dimCondition(dim: Dim, v: string): Sql {
  switch (dim) {
    case "tur":
      return v === "digital" ? IS_DIGITAL : v === "physical" ? sql`NOT (${IS_DIGITAL})` : sql`TRUE`;
    case "kategori":
      if (v === "dijital-nakis-desenleri") return IS_DIGITAL;
      if (v === "kisiye-ozel-urunler") {
        return sql`(p."personalizable" OR p."categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = ${v}))`;
      }
      return sql`p."categoryId" IN (
        SELECT c."id" FROM "Category" c WHERE c."slug" = ${v}
        OR c."parentId" = (SELECT c2."id" FROM "Category" c2 WHERE c2."slug" = ${v})
      )`;
    case "format":
      return effectiveFormat(sql`ff."code" = ${v.toUpperCase()}`);
    case "makine":
      return brandReads(v);
    case "kasnak": {
      const mm = hoopLabelToMm(v);
      return mm ? fitsHoop(mm) : sql`FALSE`;
    }
    case "olcu": {
      const m = sql`GREATEST(em."designWidthMm", em."designHeightMm")`;
      if (v.startsWith("Küçük")) return sql`(${m} IS NOT NULL AND ${m} < 100)`;
      if (v.startsWith("Orta")) return sql`(${m} BETWEEN 100 AND 180)`;
      if (v.startsWith("Büyük")) return sql`(${m} > 180)`;
      return sql`FALSE`;
    }
    case "renkSayisi":
      if (v === "1-3") return sql`(em."colorCount" IS NOT NULL AND em."colorCount" <= 3)`;
      if (v === "4-6") return sql`(em."colorCount" BETWEEN 4 AND 6)`;
      if (v === "7+") return sql`(em."colorCount" >= 7)`;
      return sql`FALSE`;
    case "kullanim":
      return sql`p."usageAreas" @> ARRAY[${v}]::text[]`;
    case "lisans":
      return sql`EXISTS (SELECT 1 FROM "ProductLicense" pl JOIN "License" l ON l."id" = pl."licenseId"
        WHERE pl."productId" = p."id" AND (l."name" = ${v} OR l."code" = ${v.toUpperCase()}))`;
  }
}

function activeValue(f: CatalogFilterState, dim: Dim): string | null {
  if (dim === "tur") return f.tur === "all" ? null : f.tur;
  return f[dim] ? String(f[dim]) : null;
}

const NAME_NORM = sql`lower(translate(p."name", 'ÇĞİIÖŞÜçğıöşü', 'cgiiosucgiosu'))`;

interface Prepared {
  /** Always-on conditions (status, q, intent, price, flags). */
  base: Sql[];
  /** Per-token score expressions. */
  scores: Sql[];
}

function prepare(f: CatalogFilterState, brands: { name: string; slug: string }[]): Prepared {
  const base: Sql[] = [sql`p."status" = 'ACTIVE'`];
  const scores: Sql[] = [];
  const q = f.q.trim().slice(0, 100);
  if (q) {
    const intent = parseQueryIntent(q);
    if (intent.hoopMm) base.push(fitsHoop(intent.hoopMm));
    if (intent.type === "digital") base.push(IS_DIGITAL);
    if (intent.type === "physical") base.push(sql`NOT (${IS_DIGITAL})`);
    if (intent.personal) base.push(sql`p."personalizable"`);
    const brandWords = new Map<string, string>();
    for (const b of brands) {
      const n = normalizeTurkish(b.name);
      brandWords.set(n, b.slug);
      for (const w of n.split(" ")) if (w.length > 2) brandWords.set(w, b.slug);
    }
    for (const tok of intent.tokens.slice(0, 8)) {
      const slug = brandWords.get(tok);
      if (slug) {
        base.push(brandReads(slug));
        continue;
      }
      const like = `%${escLike(tok)}%`;
      // Typo tolerance only for longer tokens: 3-letter ones ("vp3") would match far too much.
      const fuzzy = tok.length >= 4 ? sql` OR word_similarity(${tok}, p."searchText") >= 0.5` : sql``;
      base.push(sql`(p."searchText" ILIKE ${like}${fuzzy})`);
      scores.push(
        sql`(CASE WHEN ${NAME_NORM} ILIKE ${like} THEN 2 ELSE 0 END + CASE WHEN p."searchText" ILIKE ${like} THEN 1 ELSE 0 END + word_similarity(${tok}, p."searchText"))`
      );
    }
  }
  const min = f.minFiyat && /^\d{1,7}$/.test(f.minFiyat) ? Number(f.minFiyat) * 100 : null;
  const max = f.maxFiyat && /^\d{1,7}$/.test(f.maxFiyat) ? Number(f.maxFiyat) * 100 : null;
  if (min !== null) base.push(sql`p."priceKurus" >= ${min}`);
  if (max !== null) base.push(sql`p."priceKurus" <= ${max}`);
  if (f.kisisellestirme) base.push(sql`p."personalizable"`);
  if (f.stok) {
    base.push(sql`(${IS_DIGITAL} OR COALESCE(
      (SELECT (i."onHand" - i."reserved") > 0 FROM "Inventory" i WHERE i."productId" = p."id"),
      (p."physicalInfo"->>'inStock') = 'true', FALSE))`);
  }
  return { base, scores };
}

const DIMS: Dim[] = ["tur", "kategori", "format", "makine", "kasnak", "olcu", "renkSayisi", "kullanim", "lisans"];

function whereFor(f: CatalogFilterState, prep: Prepared, except?: Dim): Sql {
  const parts = [...prep.base];
  for (const d of DIMS) {
    if (d === except) continue;
    const v = activeValue(f, d);
    if (v !== null) parts.push(dimCondition(d, v));
  }
  return and(parts);
}

function orderFor(f: CatalogFilterState, hasScore: boolean): Sql {
  switch (f.sirala) {
    case "fiyat-artan":
      return sql`p."priceKurus" ASC, p."sku" ASC`;
    case "fiyat-azalan":
      return sql`p."priceKurus" DESC, p."sku" ASC`;
    case "yeni":
      return sql`p."isNew" DESC, p."publishedAt" DESC NULLS LAST, p."sku" ASC`;
    default:
      return hasScore
        ? sql`score DESC, p."isFeatured" DESC, p."sku" ASC`
        : sql`p."isFeatured" DESC, p."createdAt" ASC, p."sku" ASC`;
  }
}

const num = (v: unknown) => Number(v ?? 0);

async function countByValues(
  f: CatalogFilterState,
  prep: Prepared,
  dim: Dim,
  values: string[]
): Promise<Record<string, number>> {
  if (values.length === 0) return {};
  const cols = values.map((v, i) => sql`count(*) FILTER (WHERE ${dimCondition(dim, v)}) AS ${raw(`v${i}`)}`);
  const rows = await db.$queryRaw<Record<string, bigint | number>[]>(
    sql`SELECT count(*) AS "all", ${Prisma.join(cols)} ${FROM} WHERE ${whereFor(f, prep, dim)}`
  );
  const r = rows[0] ?? {};
  const out: Record<string, number> = {};
  values.forEach((v, i) => (out[v] = num(r[`v${i}`])));
  out[dim === "tur" ? "all" : ""] = num(r.all);
  return out;
}

const DEFAULTS: CatalogFilterState = {
  q: "", tur: "all", kategori: "", format: "", makine: "", kasnak: "", olcu: "", renkSayisi: "",
  kullanim: "", lisans: "", kisisellestirme: false, stok: false, minFiyat: "", maxFiyat: "", sirala: "onerilen",
};

export class PostgresSearchEngine implements SearchEngine {
  async search({ filters, page, pageSize, facets }: SearchParams): Promise<SearchResult> {
    const brands = await db.machineBrand.findMany({ select: { name: true, slug: true } });
    const prep = prepare(filters, brands);
    const where = whereFor(filters, prep);
    const score = prep.scores.length ? Prisma.join(prep.scores, " + ") : sql`0`;
    const offset = (page - 1) * pageSize;

    const [rows, countRows, facetData] = await Promise.all([
      db.$queryRaw<{ id: string; score: number }[]>(
        sql`SELECT p."id", (${score})::float8 AS score ${FROM} WHERE ${where}
            ORDER BY ${orderFor(filters, prep.scores.length > 0)} LIMIT ${pageSize} OFFSET ${offset}`
      ),
      db.$queryRaw<{ n: bigint }[]>(sql`SELECT count(*) AS n ${FROM} WHERE ${where}`),
      facets ? this.facets(filters, prep) : Promise.resolve(undefined),
    ]);
    return {
      hits: rows.map((r) => ({ id: r.id, score: Number(r.score) })),
      total: num(countRows[0]?.n),
      page,
      pageSize,
      facets: facetData,
    };
  }

  private async facets(f: CatalogFilterState, prep: Prepared): Promise<Facets> {
    const [cats, formats, hoops, licenses, brands] = await Promise.all([
      db.category.findMany({ where: { active: true }, select: { slug: true } }),
      db.fileFormat.findMany({ select: { code: true }, orderBy: { sort: "asc" } }),
      db.hoopSize.findMany({ select: { label: true }, orderBy: { widthMm: "asc" } }),
      db.license.findMany({ select: { name: true }, orderBy: { sort: "asc" } }),
      db.machineBrand.findMany({ select: { name: true }, orderBy: { sort: "asc" } }),
    ]);
    const [tur, kategori, format, makine, kasnak, olcu, renkSayisi, kullanim, lisans] = await Promise.all([
      countByValues(f, prep, "tur", ["digital", "physical"]),
      countByValues(f, prep, "kategori", cats.map((c) => c.slug)),
      countByValues(f, prep, "format", formats.map((x) => x.code)),
      countByValues(f, prep, "makine", brands.map((b) => b.name)),
      countByValues(f, prep, "kasnak", hoops.map((h) => h.label)),
      countByValues(f, prep, "olcu", ["Küçük (< 10 cm)", "Orta (10–18 cm)", "Büyük (> 18 cm)"]),
      countByValues(f, prep, "renkSayisi", ["1-3", "4-6", "7+"]),
      countByValues(f, prep, "kullanim", [...ALL_USAGE_AREAS]),
      countByValues(f, prep, "lisans", licenses.map((l) => l.name)),
    ]);
    return { tur, kategori, format, makine, kasnak, olcu, renkSayisi, kullanim, lisans };
  }

  async suggest(query: string, limit: number): Promise<SearchSuggestion[]> {
    const norm = normalizeTurkish(query);
    if (norm.length < 2) return [];
    const out: SearchSuggestion[] = [];
    const intent = parseQueryIntent(query);
    if (intent.hoopMm) {
      const cm = `${intent.hoopMm[0] / 10}x${intent.hoopMm[1] / 10} cm`;
      out.push({ label: `${cm} kasnağa sığan desenler`, href: `/koleksiyon?tur=dijital&kasnak=${encodeURIComponent(cm)}`, kind: "filtre" });
    }
    const cats = await db.category.findMany({ where: { active: true }, select: { slug: true, name: true }, orderBy: { sort: "asc" } });
    for (const c of cats) {
      const n = normalizeTurkish(c.name);
      if (n.includes(norm) || norm.split(" ").some((t) => t.length > 2 && n.includes(t))) {
        out.push({ label: c.name, href: `/koleksiyon?kategori=${c.slug}`, kind: "kategori" });
      }
    }
    const res = await this.search({ filters: { ...DEFAULTS, q: query }, page: 1, pageSize: Math.max(limit, 6) });
    if (res.hits.length) {
      const prods = await db.product.findMany({
        where: { id: { in: res.hits.map((h) => h.id) } },
        select: { id: true, name: true, slug: true },
      });
      const byId = new Map(prods.map((p) => [p.id, p]));
      for (const h of res.hits) {
        const p = byId.get(h.id);
        if (p) out.push({ label: p.name, href: `/urun/${p.slug}`, kind: "urun" });
      }
    }
    return out.slice(0, limit);
  }
}

let engine: SearchEngine | undefined;
export function getSearchEngine(): SearchEngine {
  return (engine ??= new PostgresSearchEngine());
}
export function __setSearchEngineForTests(e: SearchEngine | undefined) {
  engine = e;
}
