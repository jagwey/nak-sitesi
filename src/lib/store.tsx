"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { EmbroideryFormat, LicenseType, Product } from "@/data/products";
import { apiFetch, ApiError } from "@/lib/api";

export interface CartPersonalization {
  text: string;
  fontStyle: string;
  threadColorName: string;
  threadColorHex: string;
  motif: string;
}

/** One cart line. `key` is the SERVER line id; prices always come from the server. */
export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  type: "digital" | "physical";
  image: string;
  unitPriceKurus: number;
  quantity: number;
  selectedFormat?: EmbroideryFormat;
  selectedLicense?: LicenseType;
  selectedColor?: string;
  selectedSize?: string;
  personalization?: CartPersonalization;
  lineTotalKurus?: number;
  issues?: string[];
  blocking?: boolean;
}

/** What the storefront may send: no price field exists on purpose. */
export type AddToCartInput = Omit<CartItem, "key" | "unitPriceKurus" | "lineTotalKurus" | "issues" | "blocking"> & {
  unitPriceKurus?: number;
};

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
}

interface ServerLine {
  id: string;
  productId: string;
  slug: string;
  name: string;
  kind: "DIGITAL" | "PHYSICAL";
  image: string | null;
  formatCode: string | null;
  licenseName: string | null;
  color: string | null;
  size: string | null;
  personalization: Record<string, unknown> | null;
  unitPriceKurus: number;
  quantity: number;
  lineTotalKurus: number;
  issues: string[];
  blocking: boolean;
}
interface ServerCart {
  items: ServerLine[];
  couponCode: string | null;
  couponError: string | null;
  subtotalKurus: number;
  discountKurus: number;
  shippingKurus: number;
  totalKurus: number;
  hasPhysical: boolean;
  hasDigital: boolean;
  itemCount: number;
  blocking: boolean;
  freeShippingThresholdKurus: number;
}

interface StoreContextValue {
  cart: CartItem[];
  favorites: string[];
  recentSearches: string[];
  couponCode: string | null;
  couponError: string | null;
  cartOpen: boolean;
  favoritesOpen: boolean;
  searchOpen: boolean;
  toast: string | null;
  cartLoading: boolean;
  cartBlocking: boolean;
  freeShippingThresholdKurus: number;
  user: AuthUser | null;
  authReady: boolean;
  setCartOpen: (open: boolean) => void;
  setFavoritesOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  addToCart: (item: AddToCartInput) => Promise<boolean>;
  quickAddProduct: (product: Product) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => void;
  refreshCart: () => Promise<void>;
  refreshAuth: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  showToast: (message: string) => void;
  cartCount: number;
  subtotalKurus: number;
  discountKurus: number;
  hasPhysicalItems: boolean;
  hasDigitalItems: boolean;
  shippingKurus: number;
  totalKurus: number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const STORAGE_FAVS = "tb_store_favs_v1";
const STORAGE_SEARCHES = "tb_store_recent_searches_v1";

const EMPTY: ServerCart = {
  items: [], couponCode: null, couponError: null, subtotalKurus: 0, discountKurus: 0, shippingKurus: 0, totalKurus: 0,
  hasPhysical: false, hasDigital: false, itemCount: 0, blocking: false, freeShippingThresholdKurus: 0,
};

function toItem(l: ServerLine): CartItem {
  const p = l.personalization ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const opts = (p as { options?: Record<string, unknown> }).options ?? p;
  const hasPers = !!(str(opts.text) || str((p as { text?: unknown }).text));
  return {
    key: l.id,
    productId: l.productId,
    slug: l.slug,
    name: l.name,
    type: l.kind === "DIGITAL" ? "digital" : "physical",
    image: l.image ?? "",
    unitPriceKurus: l.unitPriceKurus,
    quantity: l.quantity,
    selectedFormat: (l.formatCode as EmbroideryFormat | null) ?? undefined,
    selectedLicense: (l.licenseName as LicenseType | null) ?? undefined,
    selectedColor: l.color ?? undefined,
    selectedSize: l.size ?? undefined,
    personalization: hasPers
      ? {
          text: str(opts.text),
          fontStyle: str(opts.fontStyle),
          threadColorName: str(opts.threadColorName),
          threadColorHex: str(opts.threadColorHex),
          motif: str(opts.motif),
        }
      : undefined,
    lineTotalKurus: l.lineTotalKurus,
    issues: l.issues,
    blocking: l.blocking,
  };
}

const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [server, setServer] = useState<ServerCart>(EMPTY);
  const [cartLoading, setCartLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const serverRef = useRef(server);
  serverRef.current = server;
  const favRef = useRef(favorites);
  favRef.current = favorites;

  const showToast = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const refreshCart = useCallback(async () => {
    try {
      const r = await apiFetch<{ cart: ServerCart }>("/api/cart");
      setServer(r.cart);
    } catch {
      /* keep what we have; the cart page shows its own error state */
    } finally {
      setCartLoading(false);
    }
  }, []);

  const loadServerFavorites = useCallback(async () => {
    try {
      const r = await apiFetch<{ productIds: string[] }>("/api/favorites");
      setFavorites(r.productIds ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    let u: AuthUser | null = null;
    try {
      u = (await apiFetch<{ user: AuthUser | null }>("/api/auth/me")).user;
    } catch {
      u = null;
    }
    setUser(u);
    setAuthReady(true);
    return u;
  }, []);

  // initial load: local UI prefs, session, cart
  useEffect(() => {
    try {
      const f = localStorage.getItem(STORAGE_FAVS);
      const s = localStorage.getItem(STORAGE_SEARCHES);
      if (f) setFavorites(JSON.parse(f));
      if (s) setRecentSearches(JSON.parse(s));
    } catch {
      /* private mode */
    }
    setHydrated(true);
    void (async () => {
      await refreshAuth();
      await refreshCart();
    })();
  }, [refreshAuth, refreshCart]);

  // when a user signs in: push guest favorites to the account once, then load the account's list
  const lastUserId = useRef<string | null>(null);
  useEffect(() => {
    if (!authReady) return;
    if (user && lastUserId.current !== user.id) {
      lastUserId.current = user.id;
      void (async () => {
        const local = favRef.current;
        await Promise.all(local.map((id) => apiFetch("/api/favorites", { method: "POST", body: { productId: id } }).catch(() => undefined)));
        await loadServerFavorites();
        await refreshCart();
      })();
    }
    if (!user) lastUserId.current = null;
  }, [user, authReady, loadServerFavorites, refreshCart]);

  useEffect(() => {
    if (!hydrated || user) return; // signed-in favorites live on the server
    try {
      localStorage.setItem(STORAGE_FAVS, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites, hydrated, user]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_SEARCHES, JSON.stringify(recentSearches));
    } catch {
      /* ignore */
    }
  }, [recentSearches, hydrated]);

  const addToCart = useCallback(
    async (incoming: AddToCartInput): Promise<boolean> => {
      const body: Record<string, unknown> = {
        productId: incoming.slug || incoming.productId,
        quantity: incoming.type === "digital" ? 1 : incoming.quantity,
      };
      if (incoming.selectedFormat) body.format = incoming.selectedFormat;
      if (incoming.selectedLicense) body.license = incoming.selectedLicense;
      if (incoming.selectedColor) body.color = incoming.selectedColor;
      if (incoming.selectedSize) body.size = incoming.selectedSize;
      if (incoming.personalization) body.personalization = incoming.personalization;
      try {
        const r = await apiFetch<{ cart: ServerCart }>("/api/cart/items", { method: "POST", body });
        setServer(r.cart);
        setCartOpen(true);
        showToast(`"${incoming.name}" sepetinize eklendi.`);
        return true;
      } catch (e) {
        showToast(errMsg(e, "Ürün sepete eklenemedi."));
        return false;
      }
    },
    [showToast]
  );

  const quickAddProduct = useCallback(
    (product: Product) => {
      if (product.type === "digital" && product.embroidery) {
        void addToCart({
          productId: product.id, slug: product.slug, name: product.name, type: "digital", image: product.images[0].url,
          quantity: 1, selectedFormat: product.embroidery.formats[0], selectedLicense: "Kişisel Kullanım",
        });
      } else {
        void addToCart({
          productId: product.id, slug: product.slug, name: product.name, type: "physical", image: product.images[0].url,
          quantity: 1, selectedColor: product.physical?.colors[0]?.name, selectedSize: product.physical?.sizes[0],
        });
      }
    },
    [addToCart]
  );

  const removeFromCart = useCallback(
    (key: string) => {
      const before = serverRef.current;
      setServer({ ...before, items: before.items.filter((i) => i.id !== key) }); // optimistic; totals re-sync below
      apiFetch<{ cart: ServerCart }>(`/api/cart/items/${encodeURIComponent(key)}`, { method: "DELETE" })
        .then((r) => setServer(r.cart))
        .catch((e) => {
          setServer(before);
          showToast(errMsg(e, "Ürün sepetten çıkarılamadı."));
        });
    },
    [showToast]
  );

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      if (quantity <= 0) return removeFromCart(key);
      const before = serverRef.current;
      setServer({ ...before, items: before.items.map((i) => (i.id === key ? { ...i, quantity: i.kind === "DIGITAL" ? 1 : Math.min(20, quantity) } : i)) });
      apiFetch<{ cart: ServerCart }>(`/api/cart/items/${encodeURIComponent(key)}`, { method: "PATCH", body: { quantity } })
        .then((r) => setServer(r.cart))
        .catch((e) => {
          setServer(before);
          showToast(errMsg(e, "Adet güncellenemedi."));
        });
    },
    [removeFromCart, showToast]
  );

  const clearCart = useCallback(() => {
    const ids = serverRef.current.items.map((i) => i.id);
    setServer(EMPTY);
    void Promise.all(ids.map((id) => apiFetch(`/api/cart/items/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined))).then(() => refreshCart());
  }, [refreshCart]);

  const toggleFavorite = useCallback(
    (productId: string) => {
      const before = favRef.current;
      const exists = before.includes(productId);
      const next = exists ? before.filter((id) => id !== productId) : [productId, ...before];
      setFavorites(next);
      showToast(exists ? "Ürün favorilerinizden çıkarıldı." : "Ürün favorilerinize kaydedildi.");
      if (!user) return;
      const req = exists
        ? apiFetch(`/api/favorites?productId=${encodeURIComponent(productId)}`, { method: "DELETE" })
        : apiFetch("/api/favorites", { method: "POST", body: { productId } });
      req.catch((e) => {
        setFavorites(before);
        showToast(errMsg(e, "Favoriler güncellenemedi."));
      });
    },
    [showToast, user]
  );

  const isFavorite = useCallback((productId: string) => favorites.includes(productId), [favorites]);

  const addRecentSearch = useCallback((term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    setRecentSearches((prev) => [cleaned, ...prev.filter((t) => t.toLowerCase() !== cleaned.toLowerCase())].slice(0, 6));
  }, []);
  const clearRecentSearches = useCallback(() => setRecentSearches([]), []);

  const applyCoupon = useCallback(async (code: string) => {
    try {
      const r = await apiFetch<{ cart: ServerCart }>("/api/cart/coupon", { method: "POST", body: { code } });
      setServer(r.cart);
      if (r.cart.couponError) return { ok: false, message: r.cart.couponError };
      return { ok: true, message: "Kupon uygulandı." };
    } catch (e) {
      return { ok: false, message: errMsg(e, "Kupon uygulanamadı.") };
    }
  }, []);

  const removeCoupon = useCallback(() => {
    apiFetch<{ cart: ServerCart }>("/api/cart/coupon", { method: "DELETE" })
      .then((r) => setServer(r.cart))
      .catch((e) => showToast(errMsg(e, "Kupon kaldırılamadı.")));
  }, [showToast]);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* the cookie may already be gone */
    }
    setUser(null);
    setFavorites([]);
    await refreshCart();
  }, [refreshCart]);

  const cart = useMemo(() => server.items.map(toItem), [server.items]);

  return (
    <StoreContext.Provider
      value={{
        cart,
        favorites,
        recentSearches,
        couponCode: server.couponCode,
        couponError: server.couponError,
        cartOpen,
        favoritesOpen,
        searchOpen,
        toast,
        cartLoading,
        cartBlocking: server.blocking,
        freeShippingThresholdKurus: server.freeShippingThresholdKurus,
        user,
        authReady,
        setCartOpen,
        setFavoritesOpen,
        setSearchOpen,
        addToCart,
        quickAddProduct,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleFavorite,
        isFavorite,
        addRecentSearch,
        clearRecentSearches,
        applyCoupon,
        removeCoupon,
        refreshCart,
        refreshAuth,
        logout,
        showToast,
        cartCount: cart.reduce((s, i) => s + i.quantity, 0),
        subtotalKurus: server.subtotalKurus,
        discountKurus: server.discountKurus,
        hasPhysicalItems: server.hasPhysical,
        hasDigitalItems: server.hasDigital,
        shippingKurus: server.shippingKurus,
        totalKurus: server.totalKurus,
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border border-hairline-strong bg-espresso px-5 py-3 text-[0.875rem] text-[#F6F2EA] shadow-sm transition-[opacity,transform] duration-200"
        >
          {toast}
        </div>
      )}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
