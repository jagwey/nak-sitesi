"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { formatTRY } from "@/lib/format";
import { FormMessage, primaryBtn, secondaryBtn } from "@/components/auth/ui";

export interface CustomRequestView {
  id: string;
  createdAt: string;
  status: string;
  productType: string | null;
  text: string;
  size: string | null;
  threadColor: string | null;
  deadline: string | null;
  attachmentCount: number;
  quote: { priceKurus: number; prepDays: number | null; note: string | null; validUntil: string | null } | null;
  orderNumber: string | null;
}

export const CUSTOM_STATUS_TR: Record<string, string> = {
  NEW: "Talep alındı",
  REVIEWING: "İnceleniyor",
  QUOTED: "Teklif hazır",
  ACCEPTED: "Kabul edildi",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal edildi",
  CONVERTED: "Siparişe dönüştü",
};

const errText = (e: unknown, fb: string) => (e instanceof ApiError ? e.message : fb);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("tr-TR");

/** Quote card + accept/reject. `decide` is either the logged-in endpoint or the guest token endpoint. */
export function RequestCard({
  r,
  decide,
  busy,
}: {
  r: CustomRequestView;
  decide: (decision: "ACCEPT" | "REJECT") => void;
  busy: boolean;
}) {
  return (
    <div className="border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-ink">{r.productType ?? "Kişiye özel talep"}</p>
        <span className="text-[0.8125rem] font-medium text-gold-text">{CUSTOM_STATUS_TR[r.status] ?? r.status}</span>
      </div>
      <p className="mt-1 text-[0.8125rem] text-umber">
        {fmtDate(r.createdAt)}
        {r.size ? ` · ${r.size}` : ""}
        {r.threadColor ? ` · ${r.threadColor}` : ""}
        {r.attachmentCount ? ` · ${r.attachmentCount} referans görseli` : ""}
      </p>
      <p className="mt-2 whitespace-pre-line text-[0.9375rem] text-ink">{r.text}</p>

      {r.quote && (
        <dl className="mt-4 divide-y divide-hairline border-y border-hairline text-[0.9375rem]">
          <div className="flex justify-between py-2.5">
            <dt className="text-umber">Teklif tutarı</dt>
            <dd className="font-medium tabular-nums text-ink">{formatTRY(r.quote.priceKurus)}</dd>
          </div>
          {r.quote.prepDays != null && (
            <div className="flex justify-between py-2.5">
              <dt className="text-umber">Hazırlık süresi</dt>
              <dd className="tabular-nums text-ink">{r.quote.prepDays} gün</dd>
            </div>
          )}
          {r.quote.validUntil && (
            <div className="flex justify-between py-2.5">
              <dt className="text-umber">Geçerlilik tarihi</dt>
              <dd className="tabular-nums text-ink">{fmtDate(r.quote.validUntil)}</dd>
            </div>
          )}
          {r.quote.note && (
            <div className="py-2.5">
              <dt className="text-umber">Atölye notu</dt>
              <dd className="mt-1 whitespace-pre-line text-ink">{r.quote.note}</dd>
            </div>
          )}
        </dl>
      )}

      {r.status === "QUOTED" && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => decide("ACCEPT")} className={`${primaryBtn} sm:max-w-[240px]`}>
            Teklifi kabul et
          </button>
          <button type="button" disabled={busy} onClick={() => decide("REJECT")} className={secondaryBtn}>
            Reddet
          </button>
        </div>
      )}
      {r.status === "CONVERTED" && r.orderNumber && (
        <p className="mt-4 text-[0.9375rem] text-umber">
          Sipariş numaranız <strong className="tabular-nums text-ink">{r.orderNumber}</strong>. Ödeme tamamlanana kadar sipariş onaylanmış sayılmaz.
        </p>
      )}
    </div>
  );
}

export function MyCustomRequests() {
  const [items, setItems] = useState<CustomRequestView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<{ requests: CustomRequestView[] }>("/api/me/custom-orders")
      .then((r) => setItems(r.requests))
      .catch((e) => setError(errText(e, "Talepleriniz yüklenemedi.")));
  }, []);
  useEffect(load, [load]);

  async function decide(id: string, decision: "ACCEPT" | "REJECT") {
    if (decision === "ACCEPT" && !window.confirm("Teklifi kabul ederek ödemesi bekleyen bir sipariş oluşturulacak. Devam edilsin mi?")) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await apiFetch<{ status: string; orderNumber?: string }>(`/api/me/custom-orders/${encodeURIComponent(id)}`, { method: "POST", body: { decision } });
      setDone(r.orderNumber ? `Sipariş oluşturuldu: ${r.orderNumber}. Ödeme bekleniyor.` : "Yanıtınız kaydedildi.");
      load();
    } catch (e) {
      setError(errText(e, "İşlem tamamlanamadı."));
    } finally {
      setBusy(false);
    }
  }

  if (error && !items) return <FormMessage kind="error">{error}</FormMessage>;
  if (!items) return <p className="text-umber">Yükleniyor…</p>;
  if (items.length === 0) {
    return (
      <div className="py-10">
        <p className="font-display text-[1.6rem] text-ink">Henüz özel talebiniz yok.</p>
        <p className="mt-2 max-w-[46ch] text-umber">İsim, monogram veya kurum logosu için talep oluşturduğunuzda teklifi burada görürsünüz.</p>
        <Link href="/kisiye-ozel" className={`${primaryBtn} mt-6 max-w-[260px]`}>
          Talep oluştur
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {done && <FormMessage kind="ok">{done}</FormMessage>}
      {items.map((r) => (
        <RequestCard key={r.id} r={r} busy={busy} decide={(d) => decide(r.id, d)} />
      ))}
    </div>
  );
}
