"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { adminFetch, errMsg, btnCls, inputCls, Notice, Uploader, FormField, ConfirmDialog } from "@/components/admin";

export interface ImageDto { id: string; url: string; alt: string; sort: number; uploaded: boolean }

/** Image manager: upload (alt text required), cover = first image, drag or button reorder, alt edit, delete. */
export function ProductImages({ productId, initial, canWrite }: { productId: string; initial: ImageDto[]; canWrite: boolean }) {
  const [images, setImages] = useState<ImageDto[]>(initial);
  const [newAlt, setNewAlt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ImageDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  async function persistOrder(next: ImageDto[]) {
    const prev = images;
    setImages(next);
    try {
      await adminFetch(`/api/admin/products/${productId}/images`, { method: "PUT", body: { ids: next.map((i) => i.id) } });
      setError(null);
    } catch (e) { setImages(prev); setError(errMsg(e)); }
  }
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[idx], next[j]] = [next[j], next[idx]];
    void persistOrder(next);
  };
  const makeCover = (idx: number) => { if (idx > 0) { const next = [...images]; const [it] = next.splice(idx, 1); next.unshift(it); void persistOrder(next); } };
  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = images.findIndex((i) => i.id === dragId);
    const to = images.findIndex((i) => i.id === targetId);
    const next = [...images];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setDragId(null);
    void persistOrder(next);
  };

  async function saveAlt(img: ImageDto) {
    const alt = (edits[img.id] ?? img.alt).trim();
    if (alt === img.alt) return;
    try {
      await adminFetch(`/api/admin/products/${productId}/images/${img.id}`, { method: "PATCH", body: { alt } });
      setImages((cur) => cur.map((i) => (i.id === img.id ? { ...i, alt } : i)));
      setError(null);
    } catch (e) { setError(errMsg(e)); }
  }

  async function remove() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/products/${productId}/images/${toDelete.id}`, { method: "DELETE" });
      setImages((cur) => cur.filter((i) => i.id !== toDelete.id));
      setError(null);
    } catch (e) { setError(errMsg(e)); }
    setBusy(false);
    setToDelete(null);
  }

  const altOk = newAlt.trim().length >= 3;
  return (
    <div className="space-y-4">
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {images.length === 0 ? <p className="text-sm text-umber">Henüz görsel yok. Yayına almak için en az bir görsel gerekir.</p> : null}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {images.map((img, idx) => (
          <li
            key={img.id}
            draggable={canWrite}
            onDragStart={() => setDragId(img.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(img.id)}
            className={`flex gap-3 rounded-md border bg-white p-2 ${dragId === img.id ? "border-gold" : "border-hairline"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt} className="h-24 w-24 shrink-0 rounded bg-linen object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gold-text">{idx === 0 ? "Kapak görseli" : `Görsel ${idx + 1}`}</p>
              <input
                className={inputCls + " mt-1 h-10"}
                value={edits[img.id] ?? img.alt}
                disabled={!canWrite}
                aria-label="Görsel açıklaması (alt metin)"
                onChange={(e) => setEdits((s) => ({ ...s, [img.id]: e.target.value }))}
                onBlur={() => void saveAlt(img)}
              />
              {canWrite ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button type="button" className={btnCls("ghost", "!min-h-9 !px-2")} onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Yukarı taşı"><ArrowUp size={16} /></button>
                  <button type="button" className={btnCls("ghost", "!min-h-9 !px-2")} onClick={() => move(idx, 1)} disabled={idx === images.length - 1} aria-label="Aşağı taşı"><ArrowDown size={16} /></button>
                  {idx > 0 ? <button type="button" className={btnCls("ghost", "!min-h-9 !px-2")} onClick={() => makeCover(idx)}>Kapak yap</button> : null}
                  <button type="button" className={btnCls("ghost", "!min-h-9 !px-2 text-red-800")} onClick={() => setToDelete(img)} aria-label="Görseli sil"><Trash2 size={16} /></button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {canWrite ? (
        <div className="rounded-md border border-dashed border-hairline-strong p-3">
          <FormField label="Yeni görsel açıklaması (alt metin)" htmlFor="new-alt" required hint="Ekran okuyucular ve arama için görseli kısaca tarif edin (en az 3 karakter).">
            <input id="new-alt" className={inputCls} value={newAlt} onChange={(e) => setNewAlt(e.target.value)} />
          </FormField>
          <div className="mt-3">
            <Uploader
              url={`/api/admin/products/${productId}/images`}
              accept="image/jpeg,image/png,image/webp"
              multiple
              label="Görsel yükle"
              hint="JPG, PNG veya WebP · en fazla 10 MB · ürün başına 12 görsel"
              disabled={!altOk}
              fields={() => ({ alt: newAlt.trim() })}
              onUploaded={(r) => setImages((cur) => [...cur, r as ImageDto])}
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog open={!!toDelete} busy={busy} danger title="Görsel silinsin mi?" message="Görsel depolamadan da kaldırılır." confirmLabel="Sil" onCancel={() => setToDelete(null)} onConfirm={() => void remove()} />
    </div>
  );
}
