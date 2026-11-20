"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  adminFetch, errMsg, fieldErrors, btnCls, inputCls, textareaCls, selectCls, FormField, Notice, Panel, ConfirmDialog, StatusBadge, Uploader, EmptyState,
} from "@/components/admin";

/* ───────── shared helpers ───────── */
function useCrud(base: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [ok, setOk] = useState<string | null>(null);
  async function run(method: "POST" | "PUT" | "DELETE", id: string | null, body?: unknown, msg = "Kaydedildi.") {
    setBusy(true); setError(null); setErrs({}); setOk(null);
    try {
      await adminFetch(id ? `${base}/${id}` : base, { method, body });
      setOk(msg);
      router.refresh();
      return true;
    } catch (e) { setError(errMsg(e)); setErrs(fieldErrors(e)); return false; } finally { setBusy(false); }
  }
  return { busy, error, errs, ok, run };
}

/* ───────── Categories ───────── */
export interface CategoryDto { id: string; slug: string; name: string; description: string | null; image: string | null; imageAlt: string | null; seoTitle: string | null; seoDescription: string | null; featuredType: string | null; parentId: string | null; sort: number; active: boolean; productCount: number }

const emptyCat = { id: "", name: "", slug: "", description: "", image: "", imageAlt: "", seoTitle: "", seoDescription: "", featuredType: "", parentId: "", sort: "0", active: true };

export function CategoryManager({ items }: { items: CategoryDto[] }) {
  const { busy, error, errs, ok, run } = useCrud("/api/admin/categories");
  const [f, setF] = useState(emptyCat);
  const [del, setDel] = useState<CategoryDto | null>(null);
  const byParent = (pid: string | null) => items.filter((c) => (c.parentId ?? null) === pid);
  const depthRows: { c: CategoryDto; depth: number }[] = [];
  const walk = (pid: string | null, depth: number, seen: Set<string>) => { for (const c of byParent(pid)) { if (seen.has(c.id)) continue; seen.add(c.id); depthRows.push({ c, depth }); walk(c.id, depth + 1, seen); } };
  walk(null, 0, new Set());
  for (const c of items) if (!depthRows.some((r) => r.c.id === c.id)) depthRows.push({ c, depth: 0 });

  function edit(c: CategoryDto) {
    setF({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", image: c.image ?? "", imageAlt: c.imageAlt ?? "", seoTitle: c.seoTitle ?? "", seoDescription: c.seoDescription ?? "", featuredType: c.featuredType ?? "", parentId: c.parentId ?? "", sort: String(c.sort), active: c.active });
  }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const body = {
      name: f.name, ...(f.slug.trim() ? { slug: f.slug.trim() } : {}), description: f.description.trim() || null, image: f.image.trim() || null, imageAlt: f.imageAlt.trim() || null,
      seoTitle: f.seoTitle.trim() || null, seoDescription: f.seoDescription.trim() || null,
      featuredType: (f.featuredType || null) as "digital" | "physical" | "all" | null, parentId: f.parentId || null, sort: Number(f.sort) || 0, active: f.active,
    };
    if (await run(f.id ? "PUT" : "POST", f.id || null, body)) setF(emptyCat);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_24rem]">
      <div>
        {items.length === 0 ? <EmptyState title="Henüz kategori yok" description="Sağdaki formdan ilk kategoriyi ekleyin." /> : (
          <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-white">
            {depthRows.map(({ c, depth }) => (
              <li key={c.id} className="flex items-center gap-2 px-3 py-2" style={{ paddingLeft: 12 + depth * 20 }}>
                <button type="button" onClick={() => edit(c)} className="min-h-11 min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                  <span className="block truncate text-xs text-stone">/{c.slug} · {c.productCount} ürün · sıra {c.sort}</span>
                </button>
                {!c.active ? <StatusBadge tone="warn">Pasif</StatusBadge> : null}
                <button type="button" className={btnCls("ghost", "text-red-800")} onClick={() => setDel(c)}>Sil</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Panel title={f.id ? "Kategoriyi düzenle" : "Yeni kategori"}>
        <form onSubmit={submit} className="space-y-3" noValidate>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {ok ? <Notice tone="success">{ok}</Notice> : null}
          <FormField label="Ad" htmlFor="c-name" required error={errs.name}><input id="c-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></FormField>
          <FormField label="Bağlantı (slug)" htmlFor="c-slug" error={errs.slug} hint="Boşsa addan üretilir."><input id="c-slug" className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></FormField>
          <FormField label="Üst kategori" htmlFor="c-parent">
            <select id="c-parent" className={selectCls} value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })}>
              <option value="">Üst kategori yok</option>
              {items.filter((c) => c.id !== f.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Açıklama" htmlFor="c-desc"><textarea id="c-desc" rows={3} className={textareaCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></FormField>
          <FormField label="Vitrin türü" htmlFor="c-ft">
            <select id="c-ft" className={selectCls} value={f.featuredType} onChange={(e) => setF({ ...f, featuredType: e.target.value })}>
              <option value="">Belirtilmedi</option><option value="digital">Dijital</option><option value="physical">Fiziksel</option><option value="all">Tümü</option>
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Sıra" htmlFor="c-sort"><input id="c-sort" inputMode="numeric" className={inputCls} value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} /></FormField>
            <label className="mt-6 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Aktif</label>
          </div>
          <ImageField value={f.image} alt={f.imageAlt} kind="category" onChange={(image, imageAlt) => setF({ ...f, image, imageAlt })} />
          <FormField label="SEO başlığı" htmlFor="c-seot" hint="Boşsa kategori adı kullanılır."><input id="c-seot" className={inputCls} value={f.seoTitle} onChange={(e) => setF({ ...f, seoTitle: e.target.value })} /></FormField>
          <FormField label="SEO açıklaması" htmlFor="c-seod"><textarea id="c-seod" rows={2} className={textareaCls} value={f.seoDescription} onChange={(e) => setF({ ...f, seoDescription: e.target.value })} /></FormField>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btnCls("primary")}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
            {f.id ? <button type="button" className={btnCls("secondary")} onClick={() => setF(emptyCat)}>Yeni kategori</button> : null}
          </div>
        </form>
      </Panel>
      <ConfirmDialog open={!!del} busy={busy} danger title="Kategori silinsin mi?" message={del ? `${del.name} silinir. ${del.productCount ? "Bu kategorideki ürünler kategorisiz kalır." : ""}` : ""} confirmLabel="Sil"
        onCancel={() => setDel(null)} onConfirm={async () => { if (del) { await run("DELETE", del.id, undefined, "Silindi."); if (f.id === del.id) setF(emptyCat); } setDel(null); }} />
    </div>
  );
}

function ImageField({ value, alt, kind, onChange }: { value: string; alt: string; kind: "category" | "collection"; onChange: (url: string, alt: string) => void }) {
  return (
    <div className="space-y-2 rounded-md border border-dashed border-hairline-strong p-3">
      <p className="text-sm font-medium text-ink">Görsel</p>
      {value ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={value} alt={alt} className="h-24 w-24 rounded object-cover" /> : <p className="text-xs text-stone">Görsel yok.</p>}
      <Uploader url="/api/admin/uploads" accept="image/jpeg,image/png,image/webp" label="Görsel yükle" fields={{ kind }} onUploaded={(r) => onChange((r as { url: string }).url, alt)} />
      <FormField label="Görsel açıklaması (alt)" htmlFor={`img-alt-${kind}`}><input id={`img-alt-${kind}`} className={inputCls} value={alt} onChange={(e) => onChange(value, e.target.value)} /></FormField>
      {value ? <button type="button" className={btnCls("ghost")} onClick={() => onChange("", "")}>Görseli kaldır</button> : null}
    </div>
  );
}

/* ───────── Collections ───────── */
export interface CollectionDto { id: string; slug: string; title: string; subtitle: string | null; image: string | null; imageAlt: string | null; sort: number; active: boolean; productCount: number }
export interface PickProduct { id: string; name: string; sku: string }

const emptyCol = { id: "", title: "", slug: "", subtitle: "", image: "", imageAlt: "", sort: "0", active: true };

export function CollectionManager({ items, allProducts }: { items: CollectionDto[]; allProducts: PickProduct[] }) {
  const { busy, error, errs, ok, run } = useCrud("/api/admin/collections");
  const [f, setF] = useState(emptyCol);
  const [picked, setPicked] = useState<PickProduct[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);
  const [search, setSearch] = useState("");
  const [del, setDel] = useState<CollectionDto | null>(null);
  const [picksMsg, setPicksMsg] = useState<string | null>(null);
  const [picksErr, setPicksErr] = useState<string | null>(null);

  async function edit(c: CollectionDto) {
    setF({ id: c.id, title: c.title, slug: c.slug, subtitle: c.subtitle ?? "", image: c.image ?? "", imageAlt: c.imageAlt ?? "", sort: String(c.sort), active: c.active });
    setPicked([]); setLoadingPicks(true); setPicksMsg(null); setPicksErr(null);
    try { const full = await adminFetch<{ products: PickProduct[] }>(`/api/admin/collections/${c.id}`); setPicked(full.products); } catch (e) { setPicksErr(errMsg(e)); }
    setLoadingPicks(false);
  }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const body = { title: f.title, ...(f.slug.trim() ? { slug: f.slug.trim() } : {}), subtitle: f.subtitle.trim() || null, image: f.image.trim() || null, imageAlt: f.imageAlt.trim() || null, sort: Number(f.sort) || 0, active: f.active };
    if (await run(f.id ? "PUT" : "POST", f.id || null, body)) { if (!f.id) setF(emptyCol); }
  }
  async function savePicks() {
    setPicksErr(null); setPicksMsg(null);
    try { await adminFetch(`/api/admin/collections/${f.id}/products`, { method: "PUT", body: { productIds: picked.map((p) => p.id) } }); setPicksMsg("Ürün sırası kaydedildi."); } catch (e) { setPicksErr(errMsg(e)); }
  }
  const move = (i: number, d: -1 | 1) => setPicked((cur) => { const j = i + d; if (j < 0 || j >= cur.length) return cur; const n = [...cur]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const candidates = search.trim() ? allProducts.filter((p) => !picked.some((x) => x.id === p.id) && (p.name + " " + p.sku).toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8) : [];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_26rem]">
      <div>
        {items.length === 0 ? <EmptyState title="Henüz koleksiyon yok" description="Sağdaki formdan ilk koleksiyonu ekleyin." /> : (
          <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-white">
            {items.map((c) => (
              <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => void edit(c)} className="min-h-11 min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-ink">{c.title}</span>
                  <span className="block truncate text-xs text-stone">/{c.slug} · {c.productCount} ürün · sıra {c.sort}</span>
                </button>
                {!c.active ? <StatusBadge tone="warn">Pasif</StatusBadge> : null}
                <button type="button" className={btnCls("ghost", "text-red-800")} onClick={() => setDel(c)}>Sil</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-5">
        <Panel title={f.id ? "Koleksiyonu düzenle" : "Yeni koleksiyon"}>
          <form onSubmit={submit} className="space-y-3" noValidate>
            {error ? <Notice tone="danger">{error}</Notice> : null}
            {ok ? <Notice tone="success">{ok}</Notice> : null}
            <FormField label="Başlık" htmlFor="k-title" required error={errs.title}><input id="k-title" className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></FormField>
            <FormField label="Bağlantı (slug)" htmlFor="k-slug" error={errs.slug}><input id="k-slug" className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></FormField>
            <FormField label="Alt başlık" htmlFor="k-sub"><input id="k-sub" className={inputCls} value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Sıra" htmlFor="k-sort"><input id="k-sort" inputMode="numeric" className={inputCls} value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} /></FormField>
              <label className="mt-6 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Aktif</label>
            </div>
            <ImageField value={f.image} alt={f.imageAlt} kind="collection" onChange={(image, imageAlt) => setF({ ...f, image, imageAlt })} />
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className={btnCls("primary")}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
              {f.id ? <button type="button" className={btnCls("secondary")} onClick={() => { setF(emptyCol); setPicked([]); }}>Yeni koleksiyon</button> : null}
            </div>
          </form>
        </Panel>
        {f.id ? (
          <Panel title="Koleksiyondaki ürünler" description="Sıra, vitrinde görünme sırasıdır.">
            {picksErr ? <Notice tone="danger">{picksErr}</Notice> : null}
            {picksMsg ? <Notice tone="success">{picksMsg}</Notice> : null}
            {loadingPicks ? <p className="text-sm text-umber">Yükleniyor…</p> : picked.length === 0 ? <p className="text-sm text-umber">Henüz ürün seçilmedi.</p> : (
              <ol className="mt-2 divide-y divide-hairline">
                {picked.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">{p.name} <span className="text-xs text-stone">{p.sku}</span></span>
                    <button type="button" className={btnCls("ghost", "!min-h-9 !px-2")} onClick={() => move(i, -1)} aria-label="Yukarı">↑</button>
                    <button type="button" className={btnCls("ghost", "!min-h-9 !px-2")} onClick={() => move(i, 1)} aria-label="Aşağı">↓</button>
                    <button type="button" className={btnCls("ghost", "!min-h-9 !px-2 text-red-800")} onClick={() => setPicked(picked.filter((x) => x.id !== p.id))} aria-label="Çıkar">×</button>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-3 space-y-2">
              <input className={inputCls} placeholder="Ürün ara (ad veya SKU)" aria-label="Ürün ara" value={search} onChange={(e) => setSearch(e.target.value)} />
              {candidates.map((p) => (
                <button key={p.id} type="button" className={btnCls("secondary", "w-full !justify-between")} onClick={() => { setPicked([...picked, p]); setSearch(""); }}>
                  <span className="truncate">{p.name}</span><span className="text-xs text-stone">{p.sku} · ekle</span>
                </button>
              ))}
            </div>
            <div className="mt-3"><button type="button" className={btnCls("primary")} onClick={() => void savePicks()}>Ürünleri kaydet</button></div>
          </Panel>
        ) : null}
      </div>
      <ConfirmDialog open={!!del} busy={busy} danger title="Koleksiyon silinsin mi?" message={del ? `${del.title} silinir; ürünler silinmez.` : ""} confirmLabel="Sil"
        onCancel={() => setDel(null)} onConfirm={async () => { if (del) { await run("DELETE", del.id, undefined, "Silindi."); if (f.id === del.id) { setF(emptyCol); setPicked([]); } } setDel(null); }} />
    </div>
  );
}

/* ───────── Tags ───────── */
export interface TagDto { id: string; slug: string; name: string; productCount: number }

export function TagManager({ items }: { items: TagDto[] }) {
  const { busy, error, errs, ok, run } = useCrud("/api/admin/tags");
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [del, setDel] = useState<TagDto | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (await run(editId ? "PUT" : "POST", editId, { name })) { setName(""); setEditId(null); }
  }
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
      <div>
        {items.length === 0 ? <EmptyState title="Henüz etiket yok" description="Sağdaki formdan etiket ekleyin." /> : (
          <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-white">
            {items.map((t) => (
              <li key={t.id} className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => { setEditId(t.id); setName(t.name); }} className="min-h-11 min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-ink">{t.name}</span>
                  <span className="block truncate text-xs text-stone">/{t.slug} · {t.productCount} ürün</span>
                </button>
                <button type="button" className={btnCls("ghost", "text-red-800")} onClick={() => setDel(t)}>Sil</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Panel title={editId ? "Etiketi düzenle" : "Yeni etiket"}>
        <form onSubmit={submit} className="space-y-3" noValidate>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {ok ? <Notice tone="success">{ok}</Notice> : null}
          <FormField label="Ad" htmlFor="t-name" required error={errs.name}><input id="t-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></FormField>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btnCls("primary")}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
            {editId ? <button type="button" className={btnCls("secondary")} onClick={() => { setEditId(null); setName(""); }}>Vazgeç</button> : null}
          </div>
        </form>
      </Panel>
      <ConfirmDialog open={!!del} busy={busy} danger title="Etiket silinsin mi?" message={del ? `${del.name} etiketi ürünlerden kaldırılır.` : ""} confirmLabel="Sil"
        onCancel={() => setDel(null)} onConfirm={async () => { if (del) await run("DELETE", del.id, undefined, "Silindi."); setDel(null); }} />
    </div>
  );
}
