"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Heart, LogOut, MapPin, Package, Shield, User } from "lucide-react";
import { hasAnyAdminPermission } from "@/lib/admin-roles";
import { apiFetch, ApiError } from "@/lib/api";
import { formatTRY } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useProductsByIds } from "@/lib/useProductsByIds";
import { MyCustomRequests } from "@/components/custom-order/MyCustomRequests";
import { ProductCard } from "@/components/catalog/ProductCard";
import { Field, FormMessage, inputCls, primaryBtn, secondaryBtn } from "@/components/auth/ui";

type Tab = "profil" | "siparisler" | "ozel" | "indirmeler" | "favoriler" | "adresler";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: "siparisler", label: "Siparişlerim", icon: Package },
  { id: "ozel", label: "Özel taleplerim", icon: Package },
  { id: "indirmeler", label: "Dijital İndirmelerim", icon: Download },
  { id: "favoriler", label: "Favorilerim", icon: Heart },
  { id: "adresler", label: "Adreslerim", icon: MapPin },
  { id: "profil", label: "Profil", icon: User },
];

const STATUS_TR: Record<string, string> = {
  PENDING_PAYMENT: "Ödeme bekleniyor",
  PAID: "Ödendi",
  PROCESSING: "Hazırlanıyor",
  IN_PRODUCTION: "Üretimde",
  SHIPPED: "Kargoda",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal edildi",
  REFUNDED: "İade edildi",
};

const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");
const errText = (e: unknown, fb: string) => (e instanceof ApiError ? e.message : fb);

export function AccountClient({ initialTab, initialOrder }: { initialTab?: string; initialOrder?: string }) {
  const router = useRouter();
  const { user, authReady, logout } = useStore();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initialTab) ? (initialTab as Tab) : "siparisler");

  useEffect(() => {
    if (authReady && !user) router.replace("/giris?next=/hesabim");
  }, [authReady, user, router]);

  if (!authReady || !user) {
    return <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10 text-umber">Yükleniyor…</div>;
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      <div className="border-b border-hairline pb-7">
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.2rem)] leading-tight text-ink">Hesabım</h1>
        <p className="mt-2 text-[1rem] text-umber">{user.name ? `${user.name} · ` : ""}{user.email}</p>
        {!user.emailVerified && (
          <p className="mt-3 text-[0.875rem] text-umber">E-posta adresiniz henüz doğrulanmadı; doğrulama bağlantısı kayıt sırasında e-postanıza gönderildi.</p>
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <nav aria-label="Hesap bölümleri" className="lg:col-span-3">
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t lg:border-hairline lg:pb-0">
            {hasAnyAdminPermission(user) && (
              <li className="shrink-0 lg:border-b lg:border-hairline">
                <Link href="/admin" className="flex h-11 items-center gap-2.5 px-3 text-[0.9rem] font-medium text-ink hover:bg-linen">
                  <Shield className="h-4 w-4 text-gold-text" strokeWidth={1.6} />
                  Yönetim Paneli
                </Link>
              </li>
            )}
            {TABS.map(({ id, label, icon: Icon }) => (
              <li key={id} className="shrink-0 lg:border-b lg:border-hairline">
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={`flex h-11 w-full items-center gap-2.5 px-3 text-left text-[0.9rem] transition-colors duration-200 ${tab === id ? "bg-linen font-medium text-ink" : "text-umber hover:text-ink"}`}
                >
                  <Icon className="h-4 w-4 text-gold-text" strokeWidth={1.6} />
                  {label}
                </button>
              </li>
            ))}
            <li className="shrink-0 lg:border-b lg:border-hairline">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/");
                  router.refresh();
                }}
                className="flex h-11 w-full items-center gap-2.5 px-3 text-left text-[0.9rem] text-umber transition-colors duration-200 hover:text-ink"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.6} />
                Çıkış yap
              </button>
            </li>
          </ul>
        </nav>

        <section className="lg:col-span-9" aria-live="polite">
          {tab === "siparisler" && <OrdersTab initialOrder={initialOrder} />}
          {tab === "ozel" && <MyCustomRequests />}
          {tab === "indirmeler" && <DownloadsTab />}
          {tab === "favoriler" && <FavoritesTab />}
          {tab === "adresler" && <AddressesTab />}
          {tab === "profil" && <ProfileTab />}
        </section>
      </div>
    </div>
  );
}

function Empty({ title, text, href, cta }: { title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="py-10">
      <p className="font-display text-[1.6rem] text-ink">{title}</p>
      <p className="mt-2 max-w-[46ch] text-umber">{text}</p>
      {href && (
        <Link href={href} className={`${primaryBtn} mt-6 max-w-[260px]`}>
          {cta}
        </Link>
      )}
    </div>
  );
}

/* ───────────── Orders ───────────── */
interface OrderItem {
  id: string;
  productName: string;
  format: string | null;
  license: string | null;
  quantity: number;
  lineTotalKurus: number;
  kind: string;
}
interface Order {
  number: string;
  status: string;
  totalKurus: number;
  subtotalKurus: number;
  discountKurus: number;
  shippingKurus: number;
  couponCode: string | null;
  placedAt: string;
  items: OrderItem[];
  shipments: { id: string; carrier: string | null; trackingNumber: string | null; status: string }[];
}

function OrdersTab({ initialOrder }: { initialOrder?: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(initialOrder ?? null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiFetch<{ orders: Order[] }>("/api/me/orders")
      .then((r) => setOrders(r.orders))
      .catch((e) => setError(errText(e, "Siparişler yüklenemedi.")));
  }, []);
  useEffect(load, [load]);

  async function cancel(number: string) {
    if (!window.confirm("Ödemesi tamamlanmamış bu siparişi iptal etmek istiyor musunuz?")) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/orders/${encodeURIComponent(number)}/cancel`, { method: "POST" });
      load();
    } catch (e) {
      setError(errText(e, "Sipariş iptal edilemedi."));
    } finally {
      setBusy(false);
    }
  }

  if (error && !orders) return <FormMessage kind="error">{error}</FormMessage>;
  if (!orders) return <p className="text-umber">Yükleniyor…</p>;
  if (orders.length === 0) return <Empty title="Henüz siparişiniz yok." text="Verdiğiniz siparişler burada listelenir." href="/koleksiyon" cta="Koleksiyonu keşfet" />;

  return (
    <div className="space-y-3">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {orders.map((o) => {
        const isOpen = open === o.number;
        return (
          <article key={o.number} className="border border-hairline">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : o.number)}
              aria-expanded={isOpen}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left"
            >
              <span>
                <span className="block font-medium tabular-nums text-ink">{o.number}</span>
                <span className="text-[0.8125rem] text-umber">{fmtDate(o.placedAt)}</span>
              </span>
              <span className="text-[0.875rem] text-umber">{STATUS_TR[o.status] ?? o.status}</span>
              <span className="tabular-nums text-ink">{formatTRY(o.totalKurus)}</span>
            </button>
            {isOpen && (
              <div className="border-t border-hairline px-4 py-4">
                <ul className="divide-y divide-hairline text-[0.9rem]">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-4 py-2.5">
                      <span className="text-ink">
                        {i.productName}
                        {i.quantity > 1 ? ` × ${i.quantity}` : ""}
                        {i.format || i.license ? <span className="text-umber"> · {[i.format, i.license].filter(Boolean).join(" · ")}</span> : null}
                      </span>
                      <span className="tabular-nums text-ink">{formatTRY(i.lineTotalKurus)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 space-y-1 border-t border-hairline pt-3 text-[0.875rem]">
                  <Row k="Ara toplam" v={formatTRY(o.subtotalKurus)} />
                  {o.discountKurus > 0 && <Row k={`İndirim${o.couponCode ? ` (${o.couponCode})` : ""}`} v={`−${formatTRY(o.discountKurus)}`} />}
                  <Row k="Kargo" v={o.shippingKurus > 0 ? formatTRY(o.shippingKurus) : "Ücretsiz"} />
                  <Row k="Toplam" v={formatTRY(o.totalKurus)} strong />
                </dl>
                {o.shipments.map((s) => (
                  <p key={s.id} className="mt-3 text-[0.875rem] text-umber">
                    Gönderi: {s.carrier ?? "—"} {s.trackingNumber ? `· ${s.trackingNumber}` : ""} · {s.status}
                  </p>
                ))}
                {o.status === "PENDING_PAYMENT" && (
                  <button type="button" disabled={busy} onClick={() => cancel(o.number)} className={`${secondaryBtn} mt-4`}>
                    Siparişi iptal et
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-medium" : ""}`}>
      <dt className="text-umber">{k}</dt>
      <dd className="tabular-nums text-ink">{v}</dd>
    </div>
  );
}

/* ───────────── Downloads ───────────── */
interface Entitlement {
  id: string;
  productName: string;
  format: string | null;
  license: string | null;
  orderNumber: string;
  remaining: number;
  expiresAt: string | null;
  available: boolean;
  revoked: boolean;
  expired: boolean;
}

function DownloadsTab() {
  const [items, setItems] = useState<Entitlement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<{ downloads: Entitlement[] }>("/api/me/downloads")
      .then((r) => setItems(r.downloads))
      .catch((e) => setError(errText(e, "İndirmeler yüklenemedi.")));
  }, []);
  useEffect(load, [load]);

  async function download(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const r = await apiFetch<{ url: string }>(`/api/downloads/${encodeURIComponent(id)}/link`, { method: "POST" });
      window.location.assign(r.url);
    } catch (e) {
      setError(errText(e, "İndirme bağlantısı oluşturulamadı."));
    } finally {
      setBusyId(null);
      load();
    }
  }

  if (error && !items) return <FormMessage kind="error">{error}</FormMessage>;
  if (!items) return <p className="text-umber">Yükleniyor…</p>;
  if (items.length === 0) return <Empty title="İndirilebilir dosyanız yok." text="Dijital nakış desenleri ödemeniz onaylandıktan sonra burada görünür." href="/koleksiyon" cta="Koleksiyonu keşfet" />;

  return (
    <div className="space-y-3">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <ul className="divide-y divide-hairline border-y border-hairline">
        {items.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium text-ink">{d.productName}</p>
              <p className="text-[0.8125rem] text-umber">
                {[d.format, d.license].filter(Boolean).join(" · ")} · Sipariş {d.orderNumber}
              </p>
              <p className="text-[0.8125rem] text-umber">
                {d.revoked ? "İptal edildi" : d.expired ? "Süresi doldu" : `Kalan indirme hakkı: ${d.remaining}`}
                {d.expiresAt && !d.expired ? ` · Son tarih ${fmtDate(d.expiresAt)}` : ""}
              </p>
            </div>
            <button type="button" disabled={!d.available || busyId === d.id} onClick={() => download(d.id)} className={secondaryBtn}>
              {busyId === d.id ? "Hazırlanıyor…" : "İndir"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Favorites ───────────── */
function FavoritesTab() {
  const { favorites, quickAddProduct } = useStore();
  const { products, loading } = useProductsByIds(favorites);
  const list = products.filter((p) => favorites.includes(p.id));
  if (loading && list.length === 0 && favorites.length > 0) return <p className="text-umber">Yükleniyor…</p>;
  if (list.length === 0) return <Empty title="Favori listeniz boş." text="Ürünlerdeki kalp simgesiyle favorilere ekleyebilirsiniz." href="/koleksiyon" cta="Koleksiyonu keşfet" />;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3">
      {list.map((p) => (
        <div key={p.id} className="flex flex-col">
          <ProductCard product={p} />
          <button type="button" onClick={() => quickAddProduct(p)} className={`${secondaryBtn} mt-3 w-full`}>
            Sepete ekle
          </button>
        </div>
      ))}
    </div>
  );
}

/* ───────────── Addresses ───────────── */
interface Addr {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  district: string;
  postalCode: string | null;
}
const blank = { label: "", fullName: "", phone: "", line1: "", line2: "", city: "", district: "", postalCode: "" };

function AddressesTab() {
  const [list, setList] = useState<Addr[] | null>(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiFetch<{ addresses: Addr[] }>("/api/me/addresses")
      .then((r) => setList(r.addresses))
      .catch((e) => setError(errText(e, "Adresler yüklenemedi.")));
  }, []);
  useEffect(load, [load]);

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      label: form.label.trim() || null,
      fullName: form.fullName,
      phone: form.phone,
      line1: form.line1,
      line2: form.line2.trim() || null,
      city: form.city,
      district: form.district,
      postalCode: form.postalCode.trim() || null,
    };
    try {
      if (editing === "new") await apiFetch("/api/me/addresses", { method: "POST", body });
      else await apiFetch(`/api/me/addresses/${encodeURIComponent(editing!)}`, { method: "PATCH", body });
      setEditing(null);
      load();
    } catch (err) {
      setError(errText(err, "Adres kaydedilemedi."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Bu adresi silmek istiyor musunuz?")) return;
    try {
      await apiFetch(`/api/me/addresses/${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(errText(err, "Adres silinemedi."));
    }
  }

  if (!list) return error ? <FormMessage kind="error">{error}</FormMessage> : <p className="text-umber">Yükleniyor…</p>;

  if (editing) {
    return (
      <form onSubmit={save} className="max-w-[640px] space-y-4">
        <h2 className="font-display text-[1.5rem] text-ink">{editing === "new" ? "Yeni adres" : "Adresi düzenle"}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Başlık (isteğe bağlı)" id="ad-label">
            <input id="ad-label" className={inputCls} value={form.label} onChange={set("label")} maxLength={50} />
          </Field>
          <Field label="Ad soyad" id="ad-name">
            <input id="ad-name" required className={inputCls} value={form.fullName} onChange={set("fullName")} />
          </Field>
          <Field label="Telefon" id="ad-phone">
            <input id="ad-phone" required className={inputCls} value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="İl" id="ad-city">
            <input id="ad-city" required className={inputCls} value={form.city} onChange={set("city")} />
          </Field>
          <Field label="İlçe" id="ad-district">
            <input id="ad-district" required className={inputCls} value={form.district} onChange={set("district")} />
          </Field>
          <Field label="Posta kodu (isteğe bağlı)" id="ad-zip">
            <input id="ad-zip" className={inputCls} value={form.postalCode} onChange={set("postalCode")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Adres" id="ad-l1">
              <input id="ad-l1" required className={inputCls} value={form.line1} onChange={set("line1")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Adres satırı 2 (isteğe bağlı)" id="ad-l2">
              <input id="ad-l2" className={inputCls} value={form.line2} onChange={set("line2")} />
            </Field>
          </div>
        </div>
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className={`${primaryBtn} max-w-[200px]`}>
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button type="button" onClick={() => setEditing(null)} className={secondaryBtn}>
            Vazgeç
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {list.length === 0 ? (
        <Empty title="Kayıtlı adresiniz yok." text="Fiziksel ürün siparişlerinde kullanmak için adres ekleyin." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((a) => (
            <li key={a.id} className="border border-hairline p-4 text-[0.9rem]">
              <p className="font-medium text-ink">{a.label || a.fullName}</p>
              <p className="mt-1 text-umber">
                {a.fullName} · {a.phone}
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.district} / {a.city} {a.postalCode ?? ""}
              </p>
              <div className="mt-3 flex gap-4 text-[0.8125rem]">
                <button
                  type="button"
                  className="text-cocoa underline underline-offset-4"
                  onClick={() => {
                    setForm({ label: a.label ?? "", fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, district: a.district, postalCode: a.postalCode ?? "" });
                    setEditing(a.id);
                  }}
                >
                  Düzenle
                </button>
                <button type="button" className="text-umber underline underline-offset-4" onClick={() => remove(a.id)}>
                  Sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className={secondaryBtn}
        onClick={() => {
          setForm(blank);
          setEditing("new");
        }}
      >
        Yeni adres ekle
      </button>
    </div>
  );
}

/* ───────────── Profile ───────────── */
function ProfileTab() {
  const { user, refreshAuth } = useStore();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch("/api/me/profile", { method: "PATCH", body: { ...(name.trim() ? { name: name.trim() } : {}), phone: phone.trim() || null } });
      await refreshAuth();
      setMsg({ kind: "ok", text: "Profiliniz güncellendi." });
    } catch (err) {
      setMsg({ kind: "error", text: errText(err, "Profil güncellenemedi.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-[440px] space-y-5">
      <Field label="E-posta" id="pf-email" hint="E-posta adresi değiştirilemez.">
        <input id="pf-email" className={`${inputCls} text-umber`} value={user?.email ?? ""} disabled readOnly />
      </Field>
      <Field label="Ad soyad" id="pf-name">
        <input id="pf-name" autoComplete="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      </Field>
      <Field label="Telefon" id="pf-phone">
        <input id="pf-phone" autoComplete="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
      <button type="submit" disabled={busy} className={`${primaryBtn} max-w-[200px]`}>
        {busy ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </form>
  );
}
