"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch, errMsg, btnCls, inputCls, selectCls, Notice, ProductStatusBadge, PRODUCT_TYPE_LABEL, ConfirmDialog } from "@/components/admin";
import { formatTRY } from "@/lib/format";
import { parseTlToKurus } from "@/lib/money";

export interface ProductRow {
  id: string; name: string; sku: string; type: string; status: string; priceKurus: number; isDemo: boolean;
  categoryName: string | null; imageUrl: string | null; imageAlt: string;
}

type Action = "price" | "category" | "publish" | "unpublish" | "archive";
type Mode = "set" | "increase_percent" | "decrease_percent";

interface BulkResult { updated: number; skipped: { id: string; name: string; reason: string }[] }

export function ProductList({ rows, categories, canWrite }: { rows: ProductRow[]; categories: { id: string; name: string }[]; canWrite: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<Action>("price");
  const [mode, setMode] = useState<Mode>("increase_percent");
  const [amount, setAmount] = useState("");
  const [round, setRound] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  const allSelected = rows.length > 0 && sel.size === rows.length;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  function buildBody() {
    const productIds = [...sel];
    if (action === "price") {
      if (mode === "set") {
        const k = parseTlToKurus(amount);
        if (k === null || k <= 0) throw new Error("Geçerli bir TL tutarı girin (örn. 1.234,50).");
        return { action, productIds, mode, amountKurus: k, roundToLira: round };
      }
      const p = Number(amount.replace(",", "."));
      if (!Number.isFinite(p) || p <= 0 || p > 1000) throw new Error("Yüzde 0'dan büyük olmalı.");
      return { action, productIds, mode, percent: p, roundToLira: round };
    }
    if (action === "category") return { action, productIds, categoryId: categoryId || null };
    return { action, productIds };
  }

  function ask() {
    setError(null);
    setResult(null);
    try { buildBody(); } catch (e) { setError((e as Error).message); return; }
    setConfirm(true);
  }

  async function run() {
    setBusy(true);
    try {
      const r = await adminFetch<BulkResult>("/api/admin/bulk", { method: "POST", body: buildBody() });
      setResult(r);
      setSel(new Set());
      router.refresh();
    } catch (e) { setError(errMsg(e)); }
    setBusy(false);
    setConfirm(false);
  }

  const actionLabel: Record<Action, string> = { price: "Fiyat değiştir", category: "Kategori ata", publish: "Yayına al", unpublish: "Taslağa çek", archive: "Arşive al" };

  return (
    <div>
      {canWrite && sel.size > 0 ? (
        <div className="sticky top-14 z-20 mb-3 rounded-lg border border-hairline-strong bg-white p-3 shadow-sm lg:top-2">
          <p className="mb-2 text-sm font-semibold tabular-nums">{sel.size} ürün seçili</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-umber">İşlem
              <select className={selectCls + " mt-1 min-w-40"} value={action} onChange={(e) => setAction(e.target.value as Action)}>
                {(Object.keys(actionLabel) as Action[]).map((a) => <option key={a} value={a}>{actionLabel[a]}</option>)}
              </select>
            </label>
            {action === "price" ? (
              <>
                <label className="text-xs text-umber">Yöntem
                  <select className={selectCls + " mt-1 min-w-40"} value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                    <option value="increase_percent">Yüzde artır</option>
                    <option value="decrease_percent">Yüzde azalt</option>
                    <option value="set">Sabit fiyat (TL)</option>
                  </select>
                </label>
                <label className="text-xs text-umber">{mode === "set" ? "Tutar (TL)" : "Yüzde (%)"}
                  <input className={inputCls + " mt-1 w-32"} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={round} onChange={(e) => setRound(e.target.checked)} className="h-4 w-4" /> Tam TL&apos;ye yuvarla
                </label>
              </>
            ) : null}
            {action === "category" ? (
              <label className="text-xs text-umber">Kategori
                <select className={selectCls + " mt-1 min-w-48"} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Kategorisiz</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            ) : null}
            <button type="button" className={btnCls("primary")} onClick={ask}>Uygula</button>
            <button type="button" className={btnCls("ghost")} onClick={() => setSel(new Set())}>Seçimi temizle</button>
          </div>
        </div>
      ) : null}

      {error ? <div className="mb-3"><Notice tone="danger">{error}</Notice></div> : null}
      {result ? (
        <div className="mb-3">
          <Notice tone={result.skipped.length ? "warn" : "success"} title={`${result.updated} ürün güncellendi${result.skipped.length ? `, ${result.skipped.length} atlandı` : ""}.`}>
            {result.skipped.length ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {result.skipped.slice(0, 20).map((s) => <li key={s.id}>{s.name}: {s.reason}</li>)}
              </ul>
            ) : null}
          </Notice>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-hairline bg-white">
        {canWrite ? (
          <label className="flex min-h-11 items-center gap-3 border-b border-hairline bg-linen/40 px-3 text-xs font-semibold uppercase tracking-wide text-umber">
            <input type="checkbox" className="h-4 w-4" checked={allSelected} onChange={() => setSel(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} aria-label="Tümünü seç" />
            Tümünü seç
          </label>
        ) : null}
        <ul className="divide-y divide-hairline">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-ivory">
              {canWrite ? <input type="checkbox" className="h-4 w-4 shrink-0" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label={`${r.name} seç`} /> : null}
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-linen">
                {r.imageUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.imageUrl} alt={r.imageAlt} className="h-full w-full object-cover" /> : null}
              </div>
              <Link href={`/admin/urunler/${r.id}`} className="min-w-0 flex-1 py-1">
                <span className="block truncate text-sm font-semibold text-ink">{r.name}{r.isDemo ? <span className="ml-2 text-xs font-normal text-stone">(demo)</span> : null}</span>
                <span className="block truncate text-xs text-stone">{r.sku} · {PRODUCT_TYPE_LABEL[r.type] ?? r.type}{r.categoryName ? ` · ${r.categoryName}` : ""}</span>
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm tabular-nums text-ink">{formatTRY(r.priceKurus)}</span>
                <ProductStatusBadge status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={confirm}
        busy={busy}
        danger={action === "archive"}
        title={`${actionLabel[action]}: ${sel.size} ürün`}
        message="Bu işlem seçili ürünlerin hepsine uygulanır ve denetim kaydına yazılır."
        confirmLabel="Uygula"
        onCancel={() => setConfirm(false)}
        onConfirm={() => void run()}
      />
    </div>
  );
}
