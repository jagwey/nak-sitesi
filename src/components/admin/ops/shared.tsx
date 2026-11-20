"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { adminFetch, errMsg, Notice, StatusBadge, type Tone } from "@/components/admin";

/** Loads JSON from an admin API; `reload` refetches. */
export function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    if (!path) return;
    setLoading(true);
    adminFetch<T>(path)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [path]);
  useEffect(reload, [reload]);
  return { data, error, loading, reload };
}

export function LoadState({ loading, error, data, children }: { loading: boolean; error: string | null; data: unknown; children: ReactNode }) {
  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!data && loading) return <p className="text-sm text-umber">Yükleniyor…</p>;
  return <>{children}</>;
}

export const fmtDate = (s: string | Date | null | undefined) => (s ? new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "-");
export const fmtDay = (s: string | Date | null | undefined) => (s ? new Date(s).toLocaleDateString("tr-TR") : "-");

export const ORDER_STATUS: Record<string, [string, Tone]> = {
  PENDING_PAYMENT: ["Ödeme bekliyor", "warn"],
  PAID: ["Ödendi", "success"],
  PROCESSING: ["Hazırlanıyor", "neutral"],
  IN_PRODUCTION: ["Üretimde", "neutral"],
  SHIPPED: ["Kargoda", "neutral"],
  COMPLETED: ["Tamamlandı", "success"],
  CANCELLED: ["İptal", "danger"],
  REFUNDED: ["İade edildi", "danger"],
};
export const PAYMENT_STATUS: Record<string, string> = {
  UNPAID: "Ödenmedi", PENDING: "Bekliyor", PAID: "Ödendi", FAILED: "Başarısız", REFUNDED: "İade edildi", PARTIALLY_REFUNDED: "Kısmi iade",
};
export const CUSTOM_STATUS: Record<string, [string, Tone]> = {
  NEW: ["Yeni", "warn"],
  REVIEWING: ["İnceleniyor", "neutral"],
  QUOTED: ["Teklif verildi", "neutral"],
  ACCEPTED: ["Kabul edildi", "success"],
  REJECTED: ["Reddedildi", "danger"],
  CANCELLED: ["İptal", "danger"],
  CONVERTED: ["Siparişe dönüştü", "success"],
};
export function Badge({ map, value }: { map: Record<string, [string, Tone]>; value: string }) {
  const [label, tone] = map[value] ?? [value, "neutral" as Tone];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

export function Dl({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-hairline text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
          <dt className="text-umber">{k}</dt>
          <dd className="min-w-0 break-words text-right tabular-nums text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Runs a mutation with busy/error state. */
export function useAction(after: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>, okMsg = "Kaydedildi.") {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await fn();
      setDone(okMsg);
      after();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, done, run };
}

export function Feedback({ error, done }: { error: string | null; done: string | null }) {
  if (error) return <Notice tone="danger">{error}</Notice>;
  if (done) return <Notice tone="success">{done}</Notice>;
  return null;
}
