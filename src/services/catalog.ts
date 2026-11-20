import "server-only";
/**
 * Catalog service — the seam between server components and the catalog module.
 * Backed by Postgres via src/server/modules/catalog. Server-only: client
 * components talk to /api/products and /api/search/suggest instead.
 */
import type { Product } from "@/data/products";
import type { CatalogFilterState, SearchSuggestion } from "@/lib/search";
import {
  findPublicProductBySlug,
  getRelatedProducts as relatedBySlug,
  getSuggestions as suggest,
  searchCatalog,
} from "@/server/modules/catalog";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listProducts(
  filters: CatalogFilterState,
  page = 1,
  pageSize = 24
): Promise<Page<Product>> {
  const res = await searchCatalog(filters, { page, pageSize, facets: false });
  return { items: res.items, total: res.total, page: res.page, pageSize: res.pageSize };
}

export async function getProduct(slug: string): Promise<Product | null> {
  return findPublicProductBySlug(slug);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  return relatedBySlug(product.slug, limit);
}

export async function getSuggestions(query: string, limit = 6): Promise<SearchSuggestion[]> {
  return suggest(query, limit);
}
