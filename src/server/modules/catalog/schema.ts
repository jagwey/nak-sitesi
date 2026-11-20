import { z } from "zod";
import { MAX_PAGE_SIZE } from "../search/types";

const s = (max = 100) => z.string().max(max).optional();

/** Public list query. Values are normalized by parseFiltersFromParams (unknown values fall back to defaults). */
export const productListQuery = z.strictObject({
  q: s(100),
  tur: s(20),
  kategori: s(80),
  format: s(10),
  makine: s(40),
  kasnak: s(20),
  olcu: s(40),
  renkSayisi: s(10),
  kullanim: s(40),
  lisans: s(40),
  kisisellestirme: s(10),
  stok: s(10),
  minFiyat: s(8),
  maxFiyat: s(8),
  sirala: s(20),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(24),
  facets: s(5),
});
export type ProductListQuery = z.infer<typeof productListQuery>;

export const slugParams = z.strictObject({ slug: z.string().min(1).max(160).regex(/^[a-z0-9-]+$/) });
export const suggestQuery = z.strictObject({
  q: z.string().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(12).default(6),
});
export const relatedQuery = z.strictObject({ limit: z.coerce.number().int().min(1).max(12).default(4) });
