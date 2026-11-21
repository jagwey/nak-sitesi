"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  adminFetch, errMsg, fieldErrors, btnCls, inputCls, textareaCls, selectCls, FormField, Notice, Panel, ConfirmDialog, PRODUCT_TYPE_LABEL, ProductStatusBadge,
} from "@/components/admin";
import { kurusToTlInput, parseTlToKurus } from "@/lib/money";
import { slugifyTr } from "@/lib/slug";
import type { AdminProduct, FormOptions } from "@/server/modules/admin-catalog/products";
import { formatBytes, ProductFiles } from "./ProductFiles";
import { ProductImages } from "./ProductImages";

type OptionRow = { key: string; label: string; type: "TEXT" | "SELECT" | "COLOR"; required: boolean; minLength: string; maxLength: string; choices: string; priceDelta: string };
type VariantRow = { id?: string; name: string; sku: string; size: string; color: string; price: string; active: boolean };

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));
const PHYSICAL_TYPES = ["PHYSICAL", "PERSONALIZED", "TEXTILE_PRINT"];

function Check({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-11 items-center gap-2 text-sm text-ink">
      <input id={id} type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

export function ProductForm({ options, product, canWrite = true, canFiles = true }: { options: FormOptions; product?: AdminProduct; canWrite?: boolean; canFiles?: boolean }) {
  const router = useRouter();
  const p = product;
  const emb = p?.embroidery;
  const phys = (p?.physicalInfo ?? {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

  const [name, setName] = useState(p?.name ?? "");
  const [slug, setSlug] = useState(p?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!p);
  const [type, setType] = useState<string>(p?.type ?? "DIGITAL_EMBROIDERY");
  const [status, setStatus] = useState(p?.status ?? "DRAFT");
  const [sku, setSku] = useState(p?.sku ?? "");
  const [shortDescription, setShort] = useState(p?.shortDescription ?? "");
  const [description, setDescription] = useState(p?.description ?? "");
  const [highlights, setHighlights] = useState((p?.highlights ?? []).join("\n"));
  const [usageAreas, setUsageAreas] = useState((p?.usageAreas ?? []).join(", "));
  const [price, setPrice] = useState(p ? kurusToTlInput(p.priceKurus) : "");
  const [compare, setCompare] = useState(p?.compareAtPriceKurus != null ? kurusToTlInput(p.compareAtPriceKurus) : "");
  const [shopierUrl, setShopierUrl] = useState(p?.shopierUrl ?? "");
  const [personalizable, setPersonalizable] = useState(p?.personalizable ?? false);
  const [isNew, setIsNew] = useState(p?.isNew ?? false);
  const [isFeatured, setIsFeatured] = useState(p?.isFeatured ?? false);
  const [categoryId, setCategoryId] = useState(p?.categoryId ?? "");
  const [collectionIds, setCollectionIds] = useState<string[]>(p?.collectionIds ?? []);
  const [tagIds, setTagIds] = useState<string[]>(p?.tagIds ?? []);
  const [licenseIds, setLicenseIds] = useState<string[]>(p?.licenseIds ?? []);
  const [formatCodes, setFormatCodes] = useState<string[]>(p?.declaredFormats.map((f) => f.code) ?? []);
  const [seoTitle, setSeoTitle] = useState(p?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(p?.seoDescription ?? "");
  const [variants, setVariants] = useState<VariantRow[]>((p?.variants ?? []).map((v) => ({ id: v.id, name: v.name, sku: v.sku, size: v.size, color: v.color, price: v.priceKurus != null ? kurusToTlInput(v.priceKurus) : "", active: v.active })));
  const [opts, setOpts] = useState<OptionRow[]>((p?.options ?? []).map((o) => ({ key: o.key, label: o.label, type: o.type as OptionRow["type"], required: o.required, minLength: o.minLength?.toString() ?? "", maxLength: o.maxLength?.toString() ?? "", choices: (o.choices ?? []).join("\n"), priceDelta: kurusToTlInput(o.priceDeltaKurus) })));
  const [e, setE] = useState({
    w: emb?.designWidthMm?.toString() ?? "", h: emb?.designHeightMm?.toString() ?? "", stitches: emb?.stitchCount?.toString() ?? "", colors: emb?.colorCount?.toString() ?? "",
    changes: emb?.colorChanges?.toString() ?? "", hoop: emb?.hoopSizeId ?? "", technique: emb?.technique ?? "", fabric: emb?.fabricRecommendations ?? "", terms: emb?.downloadTerms ?? "",
    usage: (emb?.usageInstructions ?? []).join("\n"),
  });
  const [ph, setPh] = useState({
    colors: arr(phys.colors).join(", "), sizes: arr(phys.sizes).join(", "), material: (phys.material as string) ?? "", productionTime: (phys.productionTime as string) ?? "",
    shippingEstimate: (phys.shippingEstimate as string) ?? "", stockNote: (phys.stockNote as string) ?? "", care: arr(phys.careInstructions).join("\n"),
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<null | "archive" | "hard">(null);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const isDigitalEmb = type === "DIGITAL_EMBROIDERY";
  const isPhysical = PHYSICAL_TYPES.includes(type);

  function buildPayload() {
    const priceKurus = parseTlToKurus(price);
    if (priceKurus === null) throw new Error("Fiyat geçerli bir TL tutarı olmalı (örn. 1.234,50).");
    let compareAtPriceKurus: number | null = null;
    if (compare.trim()) {
      compareAtPriceKurus = parseTlToKurus(compare);
      if (compareAtPriceKurus === null) throw new Error("Karşılaştırma fiyatı geçerli bir TL tutarı olmalı.");
    }
    const vs = variants.map((v, i) => {
      let pk: number | null = null;
      if (v.price.trim()) { pk = parseTlToKurus(v.price); if (pk === null) throw new Error(`Varyant ${i + 1}: fiyat geçersiz.`); }
      return { ...(v.id ? { id: v.id } : {}), name: v.name, sku: v.sku, size: v.size || undefined, color: v.color || undefined, priceKurus: pk, active: v.active };
    });
    const os = opts.map((o, i) => {
      const d = o.priceDelta.trim() ? (o.priceDelta.trim().startsWith("-") ? -(parseTlToKurus(o.priceDelta.trim().slice(1)) ?? NaN) : parseTlToKurus(o.priceDelta)) : 0;
      if (d === null || Number.isNaN(d)) throw new Error(`Seçenek ${i + 1}: fiyat farkı geçersiz.`);
      return { key: o.key, label: o.label, type: o.type, required: o.required, minLength: numOrNull(o.minLength), maxLength: numOrNull(o.maxLength), choices: o.type === "SELECT" ? lines(o.choices) : null, priceDeltaKurus: d };
    });
    const body = {
      name, ...(slug.trim() ? { slug: slug.trim() } : {}), sku, type, shortDescription, description, highlights: lines(highlights), usageAreas: csv(usageAreas),
      priceKurus, compareAtPriceKurus, seoTitle: seoTitle.trim() || null, seoDescription: seoDescription.trim() || null, personalizable, isNew, isFeatured,
      shopierUrl: isDigitalEmb && !p?.isDemo ? shopierUrl.trim() || null : null,
      categoryId: categoryId || null, collectionIds, tagIds, licenseIds: isDigitalEmb ? licenseIds : [], formatCodes: isDigitalEmb ? formatCodes : [],
      variants: vs, options: os,
      embroidery: isDigitalEmb ? {
        designWidthMm: numOrNull(e.w), designHeightMm: numOrNull(e.h), stitchCount: numOrNull(e.stitches), colorCount: numOrNull(e.colors), colorChanges: numOrNull(e.changes),
        hoopSizeId: e.hoop || null, technique: e.technique.trim() || null, fabricRecommendations: e.fabric.trim() || null, downloadTerms: e.terms.trim() || null, usageInstructions: lines(e.usage),
      } : null,
      physicalInfo: isPhysical ? { colors: csv(ph.colors), sizes: csv(ph.sizes), material: ph.material, productionTime: ph.productionTime, shippingEstimate: ph.shippingEstimate, stockNote: ph.stockNote, careInstructions: lines(ph.care) } : null,
    };
    return body;
  }

  async function save(nextStatus?: string) {
    setError(null); setErrs({}); setSaved(false);
    let body;
    try { body = buildPayload(); } catch (err) { setError((err as Error).message); return; }
    setBusy(true);
    try {
      if (!p) {
        const created = await adminFetch<AdminProduct>("/api/admin/products", { method: "POST", body });
        router.push(`/admin/urunler/${created.id}`);
        return;
      }
      const st = nextStatus ?? status;
      await adminFetch(`/api/admin/products/${p.id}`, { method: "PATCH", body: { ...body, status: st } });
      setStatus(st as typeof status);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
      setErrs(fieldErrors(err));
    }
    setBusy(false);
  }

  async function destroy(mode: "archive" | "hard") {
    if (!p) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/products/${p.id}?mode=${mode}`, { method: "DELETE" });
      router.push("/admin/urunler");
      router.refresh();
    } catch (err) { setError(errMsg(err)); setBusy(false); setConfirm(null); }
  }

  const dis = !canWrite || busy;
  const grid2 = "grid grid-cols-1 gap-4 sm:grid-cols-2";

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); void save(); }} className="space-y-5" noValidate>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {saved ? <Notice tone="success">Kaydedildi.</Notice> : null}
      {p && p.status !== "ACTIVE" && p.publishIssues.length > 0 ? (
        <Notice tone="warn" title="Yayına almadan önce tamamlanması gerekenler">
          <ul className="list-disc pl-5">{p.publishIssues.map((i) => <li key={i}>{i}</li>)}</ul>
        </Notice>
      ) : null}

      <Panel title="Temel bilgiler">
        <div className="space-y-4">
          <div className={grid2}>
            <FormField label="Ürün adı" htmlFor="name" required error={errs.name}>
              <input id="name" className={inputCls} value={name} disabled={dis} onChange={(ev) => { setName(ev.target.value); if (!slugTouched) setSlug(slugifyTr(ev.target.value)); }} />
            </FormField>
            <FormField label="Bağlantı (slug)" htmlFor="slug" hint="Boş bırakırsanız addan üretilir." error={errs.slug}>
              <input id="slug" className={inputCls} value={slug} disabled={dis} onChange={(ev) => { setSlugTouched(true); setSlug(ev.target.value); }} />
            </FormField>
            <FormField label="Tür" htmlFor="type" required>
              <select id="type" className={selectCls} value={type} disabled={dis || (!!p && p.hasOrders)} onChange={(ev) => setType(ev.target.value)}>
                {Object.entries(PRODUCT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </FormField>
            <FormField label="SKU" htmlFor="sku" required error={errs.sku}>
              <input id="sku" className={inputCls} value={sku} disabled={dis} onChange={(ev) => setSku(ev.target.value)} />
            </FormField>
            {p ? (
              <FormField label="Durum" htmlFor="status" hint="Yayına almak için fiyat, görsel (ve dijital nakışta güncel dosya) gerekir.">
                <select id="status" className={selectCls} value={status} disabled={dis} onChange={(ev) => setStatus(ev.target.value as typeof status)}>
                  <option value="DRAFT">Taslak</option><option value="ACTIVE">Yayında</option><option value="ARCHIVED">Arşiv</option>
                </select>
              </FormField>
            ) : <FormField label="Durum"><p className="flex min-h-11 items-center text-sm text-umber">Yeni ürün taslak olarak başlar.</p></FormField>}
          </div>
          <FormField label="Kısa açıklama" htmlFor="short" error={errs.shortDescription}>
            <textarea id="short" rows={2} className={textareaCls} value={shortDescription} disabled={dis} onChange={(ev) => setShort(ev.target.value)} />
          </FormField>
          {isDigitalEmb && !p?.isDemo && (
            <FormField label="Shopier ürün bağlantısı" htmlFor="shopierUrl" hint={p?.shopierProductId ? `Shopier ürün no: ${p.shopierProductId}. Adresi elle de girebilirsiniz.` : "Shopier’de listelediğiniz ürünün adresini girin. Vitrinde Shopier’den satın alma düğmesi görünür."} error={errs.shopierUrl}>
              <input id="shopierUrl" type="url" className={inputCls} value={shopierUrl} disabled={dis} onChange={(ev) => setShopierUrl(ev.target.value)} />
            </FormField>
          )}
          <FormField label="Açıklama" htmlFor="desc" error={errs.description}>
            <textarea id="desc" rows={6} className={textareaCls} value={description} disabled={dis} onChange={(ev) => setDescription(ev.target.value)} />
          </FormField>
          <div className={grid2}>
            <FormField label="Öne çıkan özellikler" htmlFor="hl" hint="Her satıra bir madde.">
              <textarea id="hl" rows={3} className={textareaCls} value={highlights} disabled={dis} onChange={(ev) => setHighlights(ev.target.value)} />
            </FormField>
            <FormField label="Kullanım alanları" htmlFor="ua" hint="Virgülle ayırın.">
              <textarea id="ua" rows={3} className={textareaCls} value={usageAreas} disabled={dis} onChange={(ev) => setUsageAreas(ev.target.value)} />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-x-6">
            <Check id="isnew" label="Yeni ürün rozeti" checked={isNew} onChange={setIsNew} />
            <Check id="feat" label="Öne çıkan" checked={isFeatured} onChange={setIsFeatured} />
            <Check id="pers" label="Kişiselleştirilebilir" checked={personalizable} onChange={setPersonalizable} />
          </div>
        </div>
      </Panel>

      <Panel title="Fiyat">
        <div className={grid2}>
          <FormField label="Satış fiyatı (TL)" htmlFor="price" required hint="Örn. 1.234,50" error={errs.priceKurus}>
            <input id="price" inputMode="decimal" className={inputCls + " tabular-nums"} value={price} disabled={dis} onChange={(ev) => setPrice(ev.target.value)} />
          </FormField>
          <FormField label="Karşılaştırma fiyatı (TL)" htmlFor="compare" hint="İndirim öncesi fiyat; boş bırakılabilir.">
            <input id="compare" inputMode="decimal" className={inputCls + " tabular-nums"} value={compare} disabled={dis} onChange={(ev) => setCompare(ev.target.value)} />
          </FormField>
        </div>
      </Panel>

      <Panel title="Sınıflandırma">
        <div className="space-y-4">
          <FormField label="Kategori" htmlFor="cat">
            <select id="cat" className={selectCls} value={categoryId} disabled={dis} onChange={(ev) => setCategoryId(ev.target.value)}>
              <option value="">Kategorisiz</option>
              {options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-ink">Koleksiyonlar</legend>
            {options.collections.length === 0 ? <p className="text-sm text-umber">Henüz koleksiyon yok.</p> : null}
            <div className="flex flex-wrap gap-x-5">{options.collections.map((c) => <Check key={c.id} id={`col-${c.id}`} label={c.title} checked={collectionIds.includes(c.id)} onChange={() => toggle(collectionIds, setCollectionIds, c.id)} />)}</div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-ink">Etiketler</legend>
            {options.tags.length === 0 ? <p className="text-sm text-umber">Henüz etiket yok.</p> : null}
            <div className="flex flex-wrap gap-x-5">{options.tags.map((t) => <Check key={t.id} id={`tag-${t.id}`} label={t.name} checked={tagIds.includes(t.id)} onChange={() => toggle(tagIds, setTagIds, t.id)} />)}</div>
          </fieldset>
        </div>
      </Panel>

      {isDigitalEmb ? (
        <Panel title="Nakış bilgileri" description="Dosya yüklediğinizde ölçüler dosyadan okunmaya çalışılır; okunamazsa elle girin.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <FormField label="Genişlik (mm)" htmlFor="ew"><input id="ew" inputMode="numeric" className={inputCls} value={e.w} disabled={dis} onChange={(ev) => setE({ ...e, w: ev.target.value })} /></FormField>
              <FormField label="Yükseklik (mm)" htmlFor="eh"><input id="eh" inputMode="numeric" className={inputCls} value={e.h} disabled={dis} onChange={(ev) => setE({ ...e, h: ev.target.value })} /></FormField>
              <FormField label="Dikiş sayısı" htmlFor="es"><input id="es" inputMode="numeric" className={inputCls} value={e.stitches} disabled={dis} onChange={(ev) => setE({ ...e, stitches: ev.target.value })} /></FormField>
              <FormField label="Renk sayısı" htmlFor="ec"><input id="ec" inputMode="numeric" className={inputCls} value={e.colors} disabled={dis} onChange={(ev) => setE({ ...e, colors: ev.target.value })} /></FormField>
              <FormField label="Renk değişimi" htmlFor="ech"><input id="ech" inputMode="numeric" className={inputCls} value={e.changes} disabled={dis} onChange={(ev) => setE({ ...e, changes: ev.target.value })} /></FormField>
            </div>
            {emb?.metadataSource ? <p className="text-xs text-stone">Ölçü kaynağı: {emb.metadataSource === "PARSED" ? "Dosyadan okundu" : "Elle girildi"}</p> : null}
            <div className={grid2}>
              <FormField label="Çember boyutu" htmlFor="hoop">
                <select id="hoop" className={selectCls} value={e.hoop} disabled={dis} onChange={(ev) => setE({ ...e, hoop: ev.target.value })}>
                  <option value="">Seçilmedi</option>
                  {options.hoops.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
                </select>
              </FormField>
              <FormField label="Teknik" htmlFor="tech"><input id="tech" className={inputCls} value={e.technique} disabled={dis} onChange={(ev) => setE({ ...e, technique: ev.target.value })} /></FormField>
            </div>
            <FormField label="Önerilen kumaşlar" htmlFor="fab"><input id="fab" className={inputCls} value={e.fabric} disabled={dis} onChange={(ev) => setE({ ...e, fabric: ev.target.value })} /></FormField>
            <FormField label="İndirme koşulları" htmlFor="terms"><textarea id="terms" rows={2} className={textareaCls} value={e.terms} disabled={dis} onChange={(ev) => setE({ ...e, terms: ev.target.value })} /></FormField>
            <FormField label="Kullanım talimatları" htmlFor="usage" hint="Her satıra bir adım."><textarea id="usage" rows={3} className={textareaCls} value={e.usage} disabled={dis} onChange={(ev) => setE({ ...e, usage: ev.target.value })} /></FormField>
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-ink">Sunulan biçimler</legend>
              <div className="flex flex-wrap gap-x-5">{options.formats.map((f) => <Check key={f} id={`fmt-${f}`} label={f} checked={formatCodes.includes(f)} onChange={() => toggle(formatCodes, setFormatCodes, f)} />)}</div>
              <p className="mt-1 text-xs text-stone">Yalnızca gerçekten sahip olduğunuz biçimleri işaretleyin. Dosya yüklenmemiş biçimler aşağıda &quot;yalnızca beyan&quot; olarak görünür.</p>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-ink">Lisanslar</legend>
              <div className="flex flex-wrap gap-x-5">{options.licenses.map((l) => <Check key={l.id} id={`lic-${l.id}`} label={l.name} checked={licenseIds.includes(l.id)} onChange={() => toggle(licenseIds, setLicenseIds, l.id)} />)}</div>
            </fieldset>
          </div>
        </Panel>
      ) : null}

      {isPhysical ? (
        <Panel title="Ürün bilgileri">
          <div className="space-y-4">
            <div className={grid2}>
              <FormField label="Renkler" htmlFor="phc" hint="Virgülle ayırın."><input id="phc" className={inputCls} value={ph.colors} disabled={dis} onChange={(ev) => setPh({ ...ph, colors: ev.target.value })} /></FormField>
              <FormField label="Bedenler / ölçüler" htmlFor="phs" hint="Virgülle ayırın."><input id="phs" className={inputCls} value={ph.sizes} disabled={dis} onChange={(ev) => setPh({ ...ph, sizes: ev.target.value })} /></FormField>
              <FormField label="Malzeme" htmlFor="phm"><input id="phm" className={inputCls} value={ph.material} disabled={dis} onChange={(ev) => setPh({ ...ph, material: ev.target.value })} /></FormField>
              <FormField label="Hazırlık süresi" htmlFor="pht"><input id="pht" className={inputCls} value={ph.productionTime} disabled={dis} onChange={(ev) => setPh({ ...ph, productionTime: ev.target.value })} /></FormField>
              <FormField label="Kargo tahmini" htmlFor="phsh"><input id="phsh" className={inputCls} value={ph.shippingEstimate} disabled={dis} onChange={(ev) => setPh({ ...ph, shippingEstimate: ev.target.value })} /></FormField>
              <FormField label="Stok notu" htmlFor="phn"><input id="phn" className={inputCls} value={ph.stockNote} disabled={dis} onChange={(ev) => setPh({ ...ph, stockNote: ev.target.value })} /></FormField>
            </div>
            <FormField label="Bakım önerileri" htmlFor="phcare" hint="Her satıra bir madde."><textarea id="phcare" rows={3} className={textareaCls} value={ph.care} disabled={dis} onChange={(ev) => setPh({ ...ph, care: ev.target.value })} /></FormField>
          </div>
        </Panel>
      ) : null}

      <Panel title="Varyantlar" description="Beden/renk gibi satılabilir seçenekler. Stok Stok sayfasından yönetilir.">
        <div className="space-y-3">
          {variants.length === 0 ? <p className="text-sm text-umber">Varyant yok; ürün tek seçenekle satılır.</p> : null}
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-hairline p-3 sm:grid-cols-6">
              <input aria-label="Varyant adı" placeholder="Ad" className={inputCls + " col-span-2"} value={v.name} disabled={dis} onChange={(ev) => setVariants(variants.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))} />
              <input aria-label="Varyant SKU" placeholder="SKU" className={inputCls} value={v.sku} disabled={dis} onChange={(ev) => setVariants(variants.map((x, j) => (j === i ? { ...x, sku: ev.target.value } : x)))} />
              <input aria-label="Beden" placeholder="Beden" className={inputCls} value={v.size} disabled={dis} onChange={(ev) => setVariants(variants.map((x, j) => (j === i ? { ...x, size: ev.target.value } : x)))} />
              <input aria-label="Renk" placeholder="Renk" className={inputCls} value={v.color} disabled={dis} onChange={(ev) => setVariants(variants.map((x, j) => (j === i ? { ...x, color: ev.target.value } : x)))} />
              <input aria-label="Varyant fiyatı (TL)" placeholder="Fiyat (ops.)" inputMode="decimal" className={inputCls + " tabular-nums"} value={v.price} disabled={dis} onChange={(ev) => setVariants(variants.map((x, j) => (j === i ? { ...x, price: ev.target.value } : x)))} />
              <div className="col-span-2 flex items-center justify-between sm:col-span-6">
                <Check id={`va-${i}`} label="Aktif" checked={v.active} onChange={(c) => setVariants(variants.map((x, j) => (j === i ? { ...x, active: c } : x)))} />
                <button type="button" disabled={dis} className={btnCls("ghost", "text-red-800")} onClick={() => setVariants(variants.filter((_, j) => j !== i))}>Kaldır</button>
              </div>
            </div>
          ))}
          <button type="button" disabled={dis} className={btnCls("secondary")} onClick={() => setVariants([...variants, { name: "", sku: "", size: "", color: "", price: "", active: true }])}>Varyant ekle</button>
        </div>
      </Panel>

      {personalizable || opts.length > 0 ? (
        <Panel title="Kişiselleştirme seçenekleri" description="Müşterinin sipariş sırasında dolduracağı alanlar.">
          <div className="space-y-3">
            {opts.map((o, i) => {
              const set = (patch: Partial<OptionRow>) => setOpts(opts.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-hairline p-3 sm:grid-cols-4">
                  <input aria-label="Anahtar" placeholder="Anahtar (örn. isim)" className={inputCls} value={o.key} disabled={dis} onChange={(ev) => set({ key: ev.target.value })} />
                  <input aria-label="Etiket" placeholder="Etiket" className={inputCls} value={o.label} disabled={dis} onChange={(ev) => set({ label: ev.target.value })} />
                  <select aria-label="Tür" className={selectCls} value={o.type} disabled={dis} onChange={(ev) => set({ type: ev.target.value as OptionRow["type"] })}>
                    <option value="TEXT">Metin</option><option value="SELECT">Seçim</option><option value="COLOR">Renk</option>
                  </select>
                  <input aria-label="Fiyat farkı (TL)" placeholder="Fiyat farkı (TL)" inputMode="decimal" className={inputCls + " tabular-nums"} value={o.priceDelta} disabled={dis} onChange={(ev) => set({ priceDelta: ev.target.value })} />
                  {o.type === "TEXT" ? (
                    <>
                      <input aria-label="En az karakter" placeholder="En az karakter" inputMode="numeric" className={inputCls} value={o.minLength} disabled={dis} onChange={(ev) => set({ minLength: ev.target.value })} />
                      <input aria-label="En çok karakter" placeholder="En çok karakter" inputMode="numeric" className={inputCls} value={o.maxLength} disabled={dis} onChange={(ev) => set({ maxLength: ev.target.value })} />
                    </>
                  ) : <textarea aria-label="Seçenekler" placeholder="Her satıra bir seçenek" rows={3} className={textareaCls + " col-span-2"} value={o.choices} disabled={dis} onChange={(ev) => set({ choices: ev.target.value })} />}
                  <div className="col-span-2 flex items-center justify-between sm:col-span-4">
                    <Check id={`or-${i}`} label="Zorunlu" checked={o.required} onChange={(c) => set({ required: c })} />
                    <button type="button" disabled={dis} className={btnCls("ghost", "text-red-800")} onClick={() => setOpts(opts.filter((_, j) => j !== i))}>Kaldır</button>
                  </div>
                </div>
              );
            })}
            <button type="button" disabled={dis} className={btnCls("secondary")} onClick={() => setOpts([...opts, { key: "", label: "", type: "TEXT", required: false, minLength: "", maxLength: "40", choices: "", priceDelta: "" }])}>Seçenek ekle</button>
          </div>
        </Panel>
      ) : null}

      <Panel title="Arama motoru (SEO)">
        <div className="space-y-4">
          <FormField label="SEO başlığı" htmlFor="seot" hint="Boşsa ürün adı kullanılır."><input id="seot" className={inputCls} value={seoTitle} disabled={dis} onChange={(ev) => setSeoTitle(ev.target.value)} /></FormField>
          <FormField label="SEO açıklaması" htmlFor="seod"><textarea id="seod" rows={2} className={textareaCls} value={seoDescription} disabled={dis} onChange={(ev) => setSeoDescription(ev.target.value)} /></FormField>
        </div>
      </Panel>

      {p ? (
        <>
          <Panel title="Görseller" description="İlk görsel kapak olarak kullanılır. Sürükleyerek veya oklarla sıralayın.">
            <ProductImages productId={p.id} initial={p.images} canWrite={canWrite} />
          </Panel>
          {isDigitalEmb ? (
            <Panel title="Nakış dosyaları" description="İndirilebilir dosyalar özel depoda saklanır.">
              <ProductFiles productId={p.id} declared={p.declaredFormats} canWrite={canFiles} />
              {p.files.length > 0 ? (
                <ul className="mt-4 divide-y divide-hairline text-sm">
                  {p.files.filter((f) => f.status !== "DELETED").map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="min-w-0 truncate">{f.originalName}</span>
                      <span className="text-xs text-stone tabular-nums">{f.formatCode} · v{f.version} · {formatBytes(f.sizeBytes)} · {f.sha256.slice(0, 8)}{f.isCurrent ? " · güncel" : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Panel>
          ) : null}
        </>
      ) : (
        <Notice>Görseller ve dosyalar, ürün kaydedildikten sonra eklenir.</Notice>
      )}

      {canWrite ? (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-hairline bg-ivory/95 px-4 py-3 sm:mx-0 sm:rounded-lg sm:border">
          <button type="submit" disabled={busy} className={btnCls("primary")}>{busy ? "Kaydediliyor…" : p ? "Kaydet" : "Taslak olarak oluştur"}</button>
          {p && p.status !== "ACTIVE" ? <button type="button" disabled={busy} className={btnCls("secondary")} onClick={() => void save("ACTIVE")}>Kaydet ve yayına al</button> : null}
          {p ? <span className="ml-auto flex items-center gap-2"><ProductStatusBadge status={p.status} />
            {p.status !== "ARCHIVED" ? <button type="button" disabled={busy} className={btnCls("secondary")} onClick={() => setConfirm("archive")}>Arşive al</button> : null}
            {!p.hasOrders ? <button type="button" disabled={busy} className={btnCls("danger")} onClick={() => setConfirm("hard")}>Kalıcı sil</button> : null}
          </span> : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        busy={busy}
        danger
        title={confirm === "hard" ? "Ürün kalıcı olarak silinsin mi?" : "Ürün arşive alınsın mı?"}
        message={confirm === "hard" ? "Bu işlem geri alınamaz. Görseller ve dosyalar da silinir." : "Ürün mağazadan kalkar; daha sonra yeniden yayına alabilirsiniz."}
        confirmLabel={confirm === "hard" ? "Kalıcı sil" : "Arşive al"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void destroy(confirm ?? "archive")}
      />
    </form>
  );
}
