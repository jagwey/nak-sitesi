"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

interface NavItem { href: string; label: string; perm: string }

const NAV: NavItem[] = [
  { href: "/admin", label: "Panel", perm: "*" },
  { href: "/admin/urunler", label: "Ürünler", perm: "product:read" },
  { href: "/admin/kategoriler", label: "Kategoriler", perm: "product:read" },
  { href: "/admin/koleksiyonlar", label: "Koleksiyonlar", perm: "product:read" },
  { href: "/admin/etiketler", label: "Etiketler", perm: "product:read" },
  { href: "/admin/dosyalar", label: "Dijital Dosyalar", perm: "file:write" },
  { href: "/admin/stok", label: "Stok", perm: "product:read" },
  { href: "/admin/toplu-islem", label: "Toplu İşlemler", perm: "product:write" },
  { href: "/admin/siparisler", label: "Siparişler", perm: "order:read" },
  { href: "/admin/musteriler", label: "Müşteriler", perm: "customer:read" },
  { href: "/admin/kuponlar", label: "Kuponlar", perm: "coupon:write" },
  { href: "/admin/ozel-siparisler", label: "Kişiye Özel Talepler", perm: "customorder:read" },
  { href: "/admin/indirmeler", label: "İndirme Kayıtları", perm: "order:read" },
  { href: "/admin/icerik", label: "İçerik", perm: "settings:read" },
  { href: "/admin/ayarlar", label: "Ayarlar", perm: "settings:read" },
  { href: "/admin/yoneticiler", label: "Yöneticiler", perm: "user:read" },
  { href: "/admin/denetim", label: "Denetim Kaydı", perm: "audit:read" },
];

function Nav({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Yönetim menüsü">
      <ul className="space-y-0.5">
        {items.map((it) => {
          const active = it.href === "/admin" ? pathname === "/admin" : pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-md px-3 text-sm transition-colors ${active ? "bg-linen font-semibold text-ink" : "text-umber hover:bg-linen/60 hover:text-ink"}`}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Admin chrome: left nav (hidden items without permission), mobile drawer, top bar. Used by app/admin/layout.tsx. */
export function AdminShell({ permissions, userLabel, children }: { permissions: string[]; userLabel: string; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const set = new Set(permissions);
  const items = NAV.filter((n) => n.perm === "*" || set.has(n.perm));

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const brand = (
    <Link href="/admin" className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/tulay-birer-monogram.png" alt="Tülay Birer" className="h-9 w-auto" />
      <span className="font-display text-lg leading-none text-ink">Yönetim</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-white px-4 lg:hidden">
        {brand}
        <button type="button" onClick={() => setOpen(true)} aria-label="Menüyü aç" aria-expanded={open} className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-linen/60">
          <Menu size={22} aria-hidden />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Yönetim menüsü">
          <button type="button" aria-label="Menüyü kapat" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Menüyü kapat" className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-linen/60">
                <X size={22} aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto"><Nav items={items} pathname={pathname} onNavigate={() => setOpen(false)} /></div>
            <p className="mt-3 truncate border-t border-hairline pt-3 text-xs text-stone">{userLabel}</p>
          </div>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-hairline bg-white p-4 lg:flex">
        <div className="mb-5 px-1">{brand}</div>
        <div className="min-h-0 flex-1 overflow-y-auto"><Nav items={items} pathname={pathname} /></div>
        <div className="mt-3 border-t border-hairline pt-3 text-xs text-stone">
          <p className="truncate">{userLabel}</p>
          <Link href="/" className="mt-1 inline-block min-h-6 text-gold-text underline underline-offset-2">Mağazaya dön</Link>
        </div>
      </aside>

      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
