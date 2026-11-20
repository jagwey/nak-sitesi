"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch, errMsg, btnCls, inputCls, selectCls, FormField, Notice, StatusBadge, ConfirmDialog } from "@/components/admin";
import { formatBytes } from "./ProductFiles";

/* ───────── Stok ───────── */
export interface StockRowDto { inventoryId: string | null; productId: string; variantId: string | null; productName: string; variantName: string | null; sku: string; onHand: number; reserved: number; available: number; threshold: number; low: boolean }

export function StockTable({ rows, canWrite }: { rows: StockRowDto[]; canWrite: boolean }) {
  const router = useRouter();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [onHand, setOnHand] = useState("");
  const [threshold, setThreshold] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const keyOf = (r: StockRowDto) => r.variantId ?? r.productId;

  function open(r: StockRowDto) { setEditKey(keyOf(r)); setOnHand(String(r.onHand)); setThreshold(String(r.threshold)); setReason(""); setError(null); setOk(null); }

  async function save(r: StockRowDto) {
    const n = Number(onHand), t = Number(threshold);
    if (!Number.isInteger(n) || n < 0) { setError("Eldeki adet 0 veya daha büyük bir tam sayı olmalı."); return; }
    if (!Number.isInteger(t) || t < 0) { setError("Düşük stok eşiği geçerli bir tam sayı olmalı."); return; }
    if (reason.trim().length < 3) { setError("Değişiklik nedeni zorunludur (en az 3 karakter)."); return; }
    setBusy(true); setError(null);
    try {
      await adminFetch("/api/admin/inventory", { method: "PUT", body: { ...(r.variantId ? { variantId: r.variantId } : { productId: r.productId }), onHand: n, lowStockThreshold: t, reason: reason.trim() } });
      setOk("Stok güncellendi."); setEditKey(null); router.refresh();
    } catch (e) { setError(errMsg(e)); }
    setBusy(false);
  }

  return (
    <div>
      {ok ? <div className="mb-3"><Notice tone="success">{ok}</Notice></div> : null}
      {error ? <div className="mb-3"><Notice tone="danger">{error}</Notice></div> : null}
      <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-white">
        {rows.map((r) => {
          const k = keyOf(r);
          const editing = editKey === k;
          return (
            <li key={k} className="px-3 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{r.productName}{r.variantName ? ` · ${r.variantName}` : ""}</p>
                  <p className="text-xs text-stone">{r.sku}</p>
                </div>
                <dl className="flex gap-4 text-xs text-umber tabular-nums">
                  <div><dt>Eldeki</dt><dd className="text-sm font-semibold text-ink">{r.onHand}</dd></div>
                  <div><dt>Rezerve</dt><dd className="text-sm font-semibold text-ink">{r.reserved}</dd></div>
                  <div><dt>Satılabilir</dt><dd className="text-sm font-semibold text-ink">{r.available}</dd></div>
                </dl>
                {r.low ? <StatusBadge tone="warn">Düşük stok</StatusBadge> : null}
                {canWrite && !editing ? <button type="button" className={btnCls("secondary")} onClick={() => open(r)}>Düzenle</button> : null}
              </div>
              {editing ? (
                <div className="mt-3 grid grid-cols-1 gap-3 rounded-md bg-ivory p-3 sm:grid-cols-[8rem_8rem_1fr_auto] sm:items-end">
                  <FormField label="Eldeki adet" htmlFor={`oh-${k}`}><input id={`oh-${k}`} inputMode="numeric" className={inputCls} value={onHand} onChange={(e) => setOnHand(e.target.value)} /></FormField>
                  <FormField label="Düşük stok eşiği" htmlFor={`th-${k}`}><input id={`th-${k}`} inputMode="numeric" className={inputCls} value={threshold} onChange={(e) => setThreshold(e.target.value)} /></FormField>
                  <FormField label="Neden (zorunlu)" htmlFor={`rs-${k}`}><input id={`rs-${k}`} className={inputCls} value={reason} placeholder="örn. sayım düzeltmesi" onChange={(e) => setReason(e.target.value)} /></FormField>
                  <div className="flex gap-2">
                    <button type="button" disabled={busy} className={btnCls("primary")} onClick={() => void save(r)}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
                    <button type="button" className={btnCls("ghost")} onClick={() => setEditKey(null)}>Vazgeç</button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────── Dijital dosyalar ───────── */
export interface FileRowDto { id: string; productId: string; productName: string; productSku: string; formatCode: string; version: number; sizeBytes: number; sha256: string; isCurrent: boolean; status: string; originalName: string; createdAt: string }

export function FilesTable({ rows }: { rows: FileRowDto[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [del, setDel] = useState<FileRowDto | null>(null);
  const [busy, setBusy] = useState(false);

  async function download(f: FileRowDto) {
    setError(null);
    try {
      const r = await adminFetch<{ url: string }>(`/api/admin/files/${f.id}`);
      window.open(r.url, "_blank", "noopener");
    } catch (e) { setError(errMsg(e)); }
  }
  async function remove() {
    if (!del) return;
    setBusy(true);
    try { await adminFetch(`/api/admin/files/${del.id}`, { method: "DELETE" }); router.refresh(); } catch (e) { setError(errMsg(e)); }
    setBusy(false); setDel(null);
  }

  return (
    <div>
      {error ? <div className="mb-3"><Notice tone="danger">{error}</Notice></div> : null}
      <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-white">
        {rows.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{f.productName} <span className="font-normal text-stone">{f.productSku}</span></p>
              <p className="truncate text-xs text-stone tabular-nums">{f.formatCode} · v{f.version} · {formatBytes(f.sizeBytes)} · sha256 {f.sha256.slice(0, 10)}… · {new Date(f.createdAt).toLocaleDateString("tr-TR")}</p>
            </div>
            {f.isCurrent ? <StatusBadge tone="success">Güncel</StatusBadge> : <StatusBadge>Eski sürüm</StatusBadge>}
            <div className="flex gap-2">
              <button type="button" className={btnCls("secondary")} onClick={() => void download(f)}>İndir</button>
              <a className={btnCls("secondary")} href={`/admin/urunler/${f.productId}`}>Değiştir</a>
              <button type="button" className={btnCls("ghost", "text-red-800")} onClick={() => setDel(f)}>Sil</button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog open={!!del} busy={busy} danger title="Dosya silinsin mi?" message={del ? `${del.productName} · ${del.formatCode} v${del.version} dosyası depolamadan kaldırılır.` : ""} confirmLabel="Sil" onCancel={() => setDel(null)} onConfirm={() => void remove()} />
    </div>
  );
}

/* ───────── CSV toplu içe aktarma ───────── */
interface Preview { delimiter: string; totalRows: number; createCount: number; updateCount: number; invalidCount: number; errors: { row: number; column?: string; message: string }[]; rows: { row: number; sku: string; name: string; action: string }[] }
interface CommitResult { created: number; updated: number; skipped: number; errorCsv: string | null; createdSkus: string[] }

function downloadText(name: string, text: string) {
  const blob = new Blob(["﻿" + text.replace(/^﻿/, "")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function ImportWizard({ canWrite }: { canWrite: boolean }) {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"all_or_nothing" | "valid_only">("valid_only");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function onFile(f: File | undefined) {
    setPreview(null); setResult(null); setError(null);
    if (!f) return;
    if (f.size > 1_500_000) { setError("Dosya en fazla 1,5 MB olabilir."); return; }
    setFileName(f.name);
    const text = await f.text();
    setCsv(text);
    setBusy(true);
    try { setPreview(await adminFetch<Preview>("/api/admin/import/preview", { method: "POST", body: { csv: text } })); } catch (e) { setError(errMsg(e)); }
    setBusy(false);
  }

  async function commit() {
    setBusy(true); setError(null);
    try {
      setResult(await adminFetch<CommitResult>("/api/admin/import/commit", { method: "POST", body: { csv, mode } }));
      setPreview(null); setCsv(""); setFileName("");
    } catch (e) { setError(errMsg(e)); }
    setBusy(false); setConfirm(false);
  }

  const canCommit = canWrite && preview && (mode === "valid_only" ? preview.createCount + preview.updateCount > 0 : preview.invalidCount === 0 && preview.totalRows > 0);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-hairline bg-white p-4">
        <h2 className="font-display text-lg text-espresso">Şablonu indirin</h2>
        <p className="mt-1 text-sm text-umber">Noktalı virgül (;) ayraçlı, Excel ile uyumlu UTF-8 CSV. Ürünler her zaman taslak olarak oluşturulur.</p>
        <a href="/api/admin/import/template" className={btnCls("secondary", "mt-3")} download>Şablonu indir</a>
      </div>

      <div className="rounded-lg border border-hairline bg-white p-4">
        <h2 className="font-display text-lg text-espresso">CSV yükleyin</h2>
        <FormField label="CSV dosyası" htmlFor="csv-file" className="mt-2">
          <input id="csv-file" type="file" accept=".csv,text/csv" disabled={!canWrite || busy} className={inputCls + " py-2"} onChange={(e) => void onFile(e.target.files?.[0])} />
        </FormField>
        {fileName ? <p className="mt-1 text-xs text-stone">{fileName}</p> : null}
        {busy ? <p className="mt-2 text-sm text-umber">İşleniyor…</p> : null}
        {error ? <div className="mt-3"><Notice tone="danger">{error}</Notice></div> : null}
      </div>

      {preview ? (
        <div className="rounded-lg border border-hairline bg-white p-4">
          <h2 className="font-display text-lg text-espresso">Önizleme</h2>
          <p className="mt-1 text-sm text-umber">Henüz hiçbir şey kaydedilmedi.</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[["Toplam satır", preview.totalRows], ["Yeni ürün", preview.createCount], ["Güncellenecek", preview.updateCount], ["Hatalı", preview.invalidCount]].map(([l, v]) => (
              <div key={String(l)} className="rounded-md bg-ivory p-3"><dt className="text-xs text-umber">{l}</dt><dd className="text-xl font-semibold tabular-nums text-ink">{v}</dd></div>
            ))}
          </dl>
          {preview.errors.length ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-ink">Satır hataları</h3>
              <ul className="mt-2 max-h-64 divide-y divide-hairline overflow-auto rounded-md border border-hairline text-sm">
                {preview.errors.slice(0, 200).map((e, i) => <li key={i} className="px-3 py-2"><span className="tabular-nums font-semibold">Satır {e.row}</span>{e.column ? ` · ${e.column}` : ""}: {e.message}</li>)}
              </ul>
            </div>
          ) : null}
          {preview.rows.length ? (
            <ul className="mt-4 max-h-56 divide-y divide-hairline overflow-auto rounded-md border border-hairline text-sm">
              {preview.rows.slice(0, 100).map((r) => <li key={r.row} className="flex justify-between gap-3 px-3 py-2"><span className="truncate">{r.sku} · {r.name}</span><StatusBadge tone={r.action === "create" ? "success" : "neutral"}>{r.action === "create" ? "Yeni" : "Güncelle"}</StatusBadge></li>)}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs text-umber">Hata varsa
              <select className={selectCls + " mt-1 min-w-56"} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                <option value="valid_only">Yalnızca geçerli satırları al</option>
                <option value="all_or_nothing">Hepsi ya da hiçbiri</option>
              </select>
            </label>
            <button type="button" disabled={!canCommit || busy} className={btnCls("primary")} onClick={() => setConfirm(true)}>İçe aktar</button>
          </div>
        </div>
      ) : null}

      {result ? (
        <Notice tone={result.skipped ? "warn" : "success"} title={`${result.created} ürün oluşturuldu (taslak), ${result.updated} güncellendi, ${result.skipped} atlandı.`}>
          {result.errorCsv ? <button type="button" className={btnCls("secondary", "mt-2")} onClick={() => downloadText("hata-raporu.csv", result.errorCsv!)}>Hata raporunu indir</button> : null}
        </Notice>
      ) : null}

      <ConfirmDialog open={confirm} busy={busy} title="İçe aktarılsın mı?" message={preview ? `${preview.createCount} yeni ürün taslak olarak oluşturulacak, ${preview.updateCount} ürün güncellenecek.` : ""} confirmLabel="İçe aktar" onCancel={() => setConfirm(false)} onConfirm={() => void commit()} />
    </div>
  );
}
