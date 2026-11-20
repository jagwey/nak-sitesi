"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { FormMessage } from "@/components/auth/ui";
import { RequestCard, type CustomRequestView } from "./MyCustomRequests";

/** Tokenized quote page for guests. The token comes from the emailed link; only its hash is stored. */
export function GuestQuote({ token }: { token: string }) {
  const [r, setR] = useState<CustomRequestView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const path = `/api/custom-orders/quote/${encodeURIComponent(token)}`;

  useEffect(() => {
    apiFetch<{ request: CustomRequestView }>(path)
      .then((x) => setR(x.request))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Teklif yüklenemedi."));
  }, [path]);

  async function decide(decision: "ACCEPT" | "REJECT") {
    if (decision === "ACCEPT" && !window.confirm("Teklifi kabul ederek ödemesi bekleyen bir sipariş oluşturulacak. Devam edilsin mi?")) return;
    setBusy(true);
    setError(null);
    try {
      const x = await apiFetch<{ status: string; orderNumber?: string }>(path, { method: "POST", body: { decision } });
      setDone(x.orderNumber ? `Sipariş oluşturuldu: ${x.orderNumber}. Ödeme bekleniyor; ayrıntılar e-posta adresinize gönderildi.` : "Yanıtınız kaydedildi.");
      const again = await apiFetch<{ request: CustomRequestView }>(path).catch(() => null);
      if (again) setR(again.request);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 pb-24 pt-[112px] sm:px-6">
      <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] leading-[1.08] text-ink">Kişiye özel teklifiniz</h1>
      <div className="mt-6 space-y-4">
        {error && <FormMessage kind="error">{error}</FormMessage>}
        {done && <FormMessage kind="ok">{done}</FormMessage>}
        {!r && !error && <p className="text-umber">Yükleniyor…</p>}
        {r && <RequestCard r={r} busy={busy} decide={decide} />}
      </div>
    </div>
  );
}
