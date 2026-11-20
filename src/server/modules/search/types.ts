import type { CatalogFilterState, SearchSuggestion } from "@/lib/search";

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 60;

export interface SearchParams {
  filters: CatalogFilterState;
  page: number;
  pageSize: number;
  /** Compute server-side facet counts (one extra round of queries). */
  facets?: boolean;
}

/** Counts per filter dimension. Keys "all" (tur) and "" (kategori, kasnak) hold the unfiltered total of that dimension. */
export interface Facets {
  tur: Record<string, number>;
  kategori: Record<string, number>;
  format: Record<string, number>;
  makine: Record<string, number>;
  kasnak: Record<string, number>;
  olcu: Record<string, number>;
  renkSayisi: Record<string, number>;
  kullanim: Record<string, number>;
  lisans: Record<string, number>;
}

export interface SearchHit {
  id: string;
  score: number;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Facets;
}

/**
 * Engine seam: today Postgres (ILIKE + pg_trgm). A Meilisearch implementation only has to
 * return ids/scores/facets for the same params; hydration into DTOs stays in the catalog service.
 */
export interface SearchEngine {
  search(params: SearchParams): Promise<SearchResult>;
  suggest(query: string, limit: number): Promise<SearchSuggestion[]>;
}
