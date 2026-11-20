"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/products";
import { apiFetch } from "@/lib/api";

/** Resolves product cards for DB ids via the public API (stale ids silently drop out). */
export function useProductsByIds(ids: string[]): { products: Product[]; loading: boolean } {
  const key = ids.join(",");
  const [state, setState] = useState<{ key: string; products: Product[] }>({ key: "", products: [] });
  useEffect(() => {
    if (!key) return;
    let alive = true;
    apiFetch<{ items: Product[] }>(`/api/me/favorite-products?ids=${encodeURIComponent(key)}`)
      .then((r) => alive && setState({ key, products: r.items }))
      .catch(() => alive && setState({ key, products: [] }));
    return () => {
      alive = false;
    };
  }, [key]);
  if (!key) return { products: [], loading: false };
  return { products: state.key === key ? state.products : state.products.filter((p) => ids.includes(p.id)), loading: state.key !== key };
}
