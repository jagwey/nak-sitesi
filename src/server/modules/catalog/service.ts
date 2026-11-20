import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { CATEGORIES, type CategoryItem, type CuratedCollection } from "@/data/categories";
import type { Product } from "@/data/products";
import { DEFAULT_FILTERS, type CatalogFilterState, type SearchSuggestion } from "@/lib/search";
import { getSearchEngine, DEFAULT_PAGE_SIZE, type Facets } from "../search";
import { productInclude, toProductDto, type BrandsByFormat, type ProductRow } from "./dto";

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Facets;
}

async function brandsByFormat(): Promise<BrandsByFormat> {
  const rows = await db.machineModelFormat.findMany({
    select: { format: { select: { code: true } }, model: { select: { brand: { select: { name: true } } } } },
  });
  const map: BrandsByFormat = new Map();
  for (const r of rows) {
    const list = map.get(r.format.code) ?? [];
    if (!list.includes(r.model.brand.name)) list.push(r.model.brand.name);
    map.set(r.format.code, list);
  }
  return map;
}

async function hydrate(rows: ProductRow[]): Promise<Product[]> {
  if (rows.length === 0) return [];
  const brands = await brandsByFormat();
  return rows.map((r) => toProductDto(r, brands));
}

/** Fetch ACTIVE products by id, preserving the requested order. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const rows = await db.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, include: productInclude });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return hydrate(ids.map((id) => byId.get(id)).filter((r): r is ProductRow => !!r));
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  const rows = await db.product.findMany({ where: { slug: { in: slugs }, status: "ACTIVE" }, include: productInclude });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return hydrate(slugs.map((s) => bySlug.get(s)).filter((r): r is ProductRow => !!r));
}

/** Public lookup: only ACTIVE products exist as far as visitors are concerned. */
export async function findPublicProductBySlug(slug: string): Promise<Product | null> {
  const row = await db.product.findFirst({ where: { slug, status: "ACTIVE" }, include: productInclude });
  if (!row) return null;
  return (await hydrate([row]))[0] ?? null;
}

export async function getPublicProductBySlug(slug: string): Promise<Product> {
  const p = await findPublicProductBySlug(slug);
  if (!p) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
  return p;
}

export async function searchCatalog(
  filters: CatalogFilterState,
  opts: { page?: number; pageSize?: number; facets?: boolean } = {}
): Promise<ProductPage> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const res = await getSearchEngine().search({ filters, page, pageSize, facets: opts.facets });
  const items = await getProductsByIds(res.hits.map((h) => h.id));
  return { items, total: res.total, page, pageSize, facets: res.facets };
}

export async function getSuggestions(query: string, limit = 6): Promise<SearchSuggestion[]> {
  return getSearchEngine().suggest(query, limit);
}

/** Same category (3) + same type (2) + shared tags (1 each); ties by featured then sku. */
export async function getRelatedProducts(slug: string, limit = 4): Promise<Product[]> {
  const base = await db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true, type: true, categoryId: true, tags: { select: { tagId: true } } },
  });
  if (!base) throw new AppError("NOT_FOUND", "Ürün bulunamadı.");
  const tagIds = new Set(base.tags.map((t) => t.tagId));
  const candidates = await db.product.findMany({
    where: { status: "ACTIVE", id: { not: base.id } },
    select: { id: true, type: true, categoryId: true, isFeatured: true, sku: true, tags: { select: { tagId: true } } },
  });
  const scored = candidates
    .map((c) => ({
      id: c.id,
      sku: c.sku,
      featured: c.isFeatured,
      score:
        (c.categoryId && c.categoryId === base.categoryId ? 3 : 0) +
        (c.type === base.type ? 2 : 0) +
        c.tags.filter((t) => tagIds.has(t.tagId)).length,
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.featured) - Number(a.featured) || a.sku.localeCompare(b.sku))
    .slice(0, limit);
  return getProductsByIds(scored.map((s) => s.id));
}

export interface CategoryNode extends CategoryItem {
  productCount: number;
}

/** Active categories with counts of ACTIVE products (a parent counts its children's products too). */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const [cats, grouped] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    db.product.groupBy({ by: ["categoryId"], where: { status: "ACTIVE" }, _count: { _all: true } }),
  ]);
  const own = new Map(grouped.map((g) => [g.categoryId, g._count._all]));
  const staticBySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));
  return cats
    .filter((c) => !c.parentId)
    .map((c) => {
      const children = cats.filter((k) => k.parentId === c.id);
      const productCount = (own.get(c.id) ?? 0) + children.reduce((n, k) => n + (own.get(k.id) ?? 0), 0);
      const fallback = staticBySlug.get(c.slug);
      return {
        slug: c.slug,
        name: c.name,
        shortDescription: c.description ?? fallback?.shortDescription ?? "",
        image: c.image ?? fallback?.image ?? "",
        imageAlt: c.imageAlt ?? fallback?.imageAlt ?? "",
        subcategories: children.length ? children.map((k) => k.name) : (fallback?.subcategories ?? []),
        featuredType: (c.featuredType as CategoryItem["featuredType"]) ?? fallback?.featuredType,
        productCount,
      };
    });
}

export async function getCollections(): Promise<CuratedCollection[]> {
  const rows = await db.collection.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
  return rows.map((c) => ({
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle ?? "",
    filterQuery: c.filterQuery ?? "",
    image: c.image ?? "",
    imageAlt: c.imageAlt ?? "",
  }));
}

export interface HomepageData {
  categories: CategoryNode[];
  collections: CuratedCollection[];
  tabs: { new: Product[]; digital: Product[]; physical: Product[]; personalizable: Product[] };
}

const first = (f: Partial<CatalogFilterState>, n = 4, facets = false) =>
  searchCatalog({ ...DEFAULT_FILTERS, ...f }, { pageSize: n, facets }).then((r) => r.items);

export async function getHomepageData(): Promise<HomepageData> {
  const [categories, collections, isNew, digital, physical, personalizable] = await Promise.all([
    getCategoryTree(),
    getCollections(),
    db.product
      .findMany({ where: { status: "ACTIVE", isNew: true }, orderBy: [{ publishedAt: "desc" }, { sku: "asc" }], take: 4, select: { id: true } })
      .then((r) => getProductsByIds(r.map((x) => x.id))),
    first({ tur: "digital" }),
    first({ tur: "physical" }),
    first({ kisisellestirme: true }),
  ]);
  return { categories, collections, tabs: { new: isNew, digital, physical, personalizable } };
}

export async function getSitemapEntries(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, orderBy: { slug: "asc" } });
}
