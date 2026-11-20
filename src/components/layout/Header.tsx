"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { useStore } from "@/lib/store";
import { MegaMenu } from "./MegaMenu";

const PRIMARY_NAV = [
  { label: "Nakış Desenleri", href: "/koleksiyon?tur=dijital" },
  { label: "Fiziksel Ürünler", href: "/koleksiyon?tur=fiziksel" },
  { label: "Kişiye Özel Tasarım", href: "/kisiye-ozel" },
  { label: "Baskı Ürünleri", href: "/koleksiyon?kategori=baski-tasarimlari" },
  { label: "Hakkımızda", href: "/hakkimizda" },
];

export function Header({ storeName, logoUrl }: { storeName: string; logoUrl: string }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const {
    cartCount,
    favorites,
    setCartOpen,
    setFavoritesOpen,
    setSearchOpen,
    user,
  } = useStore();

  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMegaOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [megaOpen]);

  useEffect(() => {
    setMegaOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const [menuPad, setMenuPad] = useState(76);
  useEffect(() => {
    if (mobileMenuOpen && headerRef.current) setMenuPad(Math.max(76, Math.round(headerRef.current.getBoundingClientRect().bottom) - 4));
  }, [mobileMenuOpen]);

  const solidHeader = !isHome || scrolled || megaOpen || mobileMenuOpen;

  return (
    <>
      <header
        onMouseLeave={() => setMegaOpen(false)}
        ref={headerRef}
        className={`absolute inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-200 ${
          solidHeader
            ? "border-b border-hairline bg-ivory/96 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[80px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          {/* Left: Mobile menu toggle and store identity */}
          <div className="flex min-w-0 items-center gap-2 lg:gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={mobileMenuOpen}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-ink transition-colors duration-200 hover:text-gold-text lg:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" strokeWidth={1.6} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.6} />
              )}
            </button>

            <Link
              prefetch={false}
              href="/"
              aria-label={`${storeName} Ana Sayfa`}
              className="group flex min-h-8 min-w-0 items-center gap-2 py-1 sm:min-h-11"
            >
              {logoUrl && <Image src={logoUrl} alt="" width={40} height={40} unoptimized className="h-7 w-7 shrink-0 object-contain sm:h-10 sm:w-10" />}
              <span className="font-display truncate text-[1.15rem] font-medium leading-none tracking-[-0.01em] text-ink transition-colors duration-200 group-hover:text-gold-text sm:text-[1.6rem]">
                {storeName}
              </span>
            </Link>
          </div>

          {/* Center: Single-line Desktop Navigation */}
          <nav
            aria-label="Ana gezinme"
            className="hidden shrink-0 items-center gap-6 xl:gap-8 lg:flex"
          >
            <button
              type="button"
              onClick={() => setMegaOpen((v) => !v)}
              aria-expanded={megaOpen}
              className={`inline-flex h-11 items-center gap-1 whitespace-nowrap text-[0.9375rem] font-medium transition-colors duration-200 hover:text-gold-text ${
                megaOpen ? "text-gold-text" : "text-ink"
              }`}
            >
              Kategoriler
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  megaOpen ? "rotate-180 text-gold-text" : ""
                }`}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </button>

            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                prefetch={false}
                href={item.href}
                onMouseEnter={() => setMegaOpen(false)}
                className={`whitespace-nowrap text-[0.9375rem] font-medium transition-colors duration-200 hover:text-gold-text ${
                  pathname === item.href ? "text-gold-text" : "text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right: Search, Favorites, Account, Cart */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Ürün veya desen ara"
              className="inline-flex h-11 items-center gap-2 px-2.5 text-[0.875rem] font-medium text-ink transition-colors duration-200 hover:text-gold-text"
            >
              <Search className="h-[19px] w-[19px]" strokeWidth={1.6} aria-hidden="true" />
              <span className="hidden xl:inline">Ara</span>
            </button>

            <button
              type="button"
              onClick={() => setFavoritesOpen(true)}
              aria-label={`Favoriler (${favorites.length})`}
              className="relative inline-flex h-11 w-11 items-center justify-center text-ink transition-colors duration-200 hover:text-gold-text"
            >
              <Heart className="h-[19px] w-[19px]" strokeWidth={1.6} aria-hidden="true" />
              {favorites.length > 0 && (
                <span className="tabular-nums absolute right-1.5 top-2 text-[0.75rem] font-semibold leading-none text-gold-text">
                  {favorites.length}
                </span>
              )}
            </button>

            <Link
              prefetch={false}
              href={user ? "/hesabim" : "/giris"}
              aria-label="Hesabım"
              className="hidden h-11 w-11 items-center justify-center text-ink transition-colors duration-200 hover:text-gold-text sm:inline-flex"
            >
              <User className="h-[19px] w-[19px]" strokeWidth={1.6} aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Sepet (${cartCount} ürün)`}
              className="relative inline-flex h-11 items-center gap-1.5 px-2.5 text-[0.875rem] font-medium text-ink transition-colors duration-200 hover:text-gold-text"
            >
              <ShoppingBag className="h-[19px] w-[19px]" strokeWidth={1.6} aria-hidden="true" />
              <span className="hidden sm:inline">Sepet</span>
              {cartCount > 0 && (
                <span className="tabular-nums text-[0.875rem] font-semibold text-gold-text">
                  ({cartCount})
                </span>
              )}
            </button>
          </div>
        </div>

        <MegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} />
      </header>

      {/* Mobile Full-Height Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-ivory pt-[76px] lg:hidden"
          style={{ paddingTop: menuPad }}
          role="dialog"
          aria-modal="true"
          aria-label="Mobil menü"
        >
          <div className="flex h-full flex-col overflow-y-auto px-6 pb-10 pt-4">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(true);
              }}
              className="mb-6 flex h-12 w-full items-center gap-3 border-b border-hairline-strong text-left text-[0.9375rem] text-umber"
            >
              <Search className="h-4 w-4 text-ink" strokeWidth={1.6} aria-hidden="true" />
              Desen, VP3 formatı veya ürün ara...
            </button>

            <div className="space-y-1 border-b border-hairline pb-6">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  prefetch={false}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-display block py-2 text-[1.6rem] leading-tight text-ink"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                prefetch={false}
                href="/koleksiyon"
                onClick={() => setMobileMenuOpen(false)}
                className="font-display block py-2 text-[1.6rem] leading-tight text-gold-text"
              >
                Tüm Koleksiyon
              </Link>
            </div>

            <div className="border-b border-hairline py-6">
              <p className="mb-3 text-[0.875rem] font-medium text-umber">
                Kategoriler
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.slug}
                    prefetch={false}
                    href={`/koleksiyon?kategori=${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-1 text-[0.9375rem] text-ink"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-6 text-[0.9375rem] font-medium text-ink">
              <Link
                prefetch={false}
                href={user ? "/hesabim" : "/giris"}
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-2 py-2"
              >
                <User className="h-4 w-4" strokeWidth={1.6} />
                Hesabım
              </Link>
              <Link
                prefetch={false}
                href="/favoriler"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-2 py-2"
              >
                <Heart className="h-4 w-4" strokeWidth={1.6} />
                Favorilerim ({favorites.length})
              </Link>
              <Link
                prefetch={false}
                href="/sepet"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-2 py-2"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.6} />
                Sepetim ({cartCount})
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
