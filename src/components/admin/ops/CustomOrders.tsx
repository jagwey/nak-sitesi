"use client";

import { useState } from "react";
import Link from "next/link";
import { adminFetch, btnCls, DataTable, FormField, inputCls, Panel, selectCls, textareaCls } from "@/components/admin";
import { formatTRY } from "@/lib/format";
import { Badge, CUSTOM_STATUS, Dl, Feedback, fmtDate, fmtDay, LoadState, useAction, useLoad } from "./shared";

interface Row { id: string; createdAt: string; name: string; email: string; status: string; productType: string | null; quoteKurus: number | null; attachmentCount: number }

export function CustomOrdersList() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page) });
  if (status) qs.set("status", status);
  const { data, error, loading } = useLoad<{ requests: Row[]; pageSize?: number }>(`/api/admin/custom-orders?${qs}`);
  return (
    <div className="space-y-4">
      <FormField label="Durum" htmlFor="co-st" className="max-w-xs">
        <select id="co-st" className={selectCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tümü</option>
          {Object.entries(CUSTOM_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </FormField>
      <LoadState loading={loading} error={error} data={data}>
        {data && (
          <>
            <DataTable<Row>
              rows={data.requests}
              rowKey={(r) => r.id}
              empty="Talep yok."
              columns={[
                { key: "n", header: "Müşteri", primary: true, cell: (r) => <Link className="font-semibold text-gold-text underline underline-offset-2" href={`/admin/ozel-siparisler/${r.id}`}>{r.name}</Link> },
                { key: "e", header: "E-posta", hideOnMobile: true, cell: (r) => r.email },
                { key: "t", header: "Tür", cell: (r) => r.productType ?? "-" },
                { key: "s", header: "Durum", cell: (r) => <Badge map={CUSTOM_STATUS} value={r.status} /> },
                { key: "q", header: "Teklif", className: "tabular-nums", cell: (r) => (r.quoteKurus ? formatTRY(r.quoteKurus) : "-") },
                { key: "d", header: "Tarih", hideOnMobile: true, cell: (r) => fmtDate(r.createdAt) },
              ]}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnCls("secondary")} disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</button>
              <button type="button" className={btnCls("secondary")} disabled={data.requests.length < (data.pageSize ?? 20)} onClick={() => setPage(page + 1)}>Sonraki</button>
            </div>
          </>
        )}
      </LoadState>
    </div>
  );
}

interface Detail {
  id: string; createdAt: string; name: string; email: string; phone?: string | null; status: string; productType: string | null; text?: string; size?: string | null;
  threadColor?: string | null; deadline?: string | null; budgetKurus?: number | null; orderNumber?: string | null;
  quote?: { priceKurus: number; prepDays: number | null; note: string | null; validUntil: string | null } | null;
  attachments: { id: string; name: string; sizeBytes: number; mimeType: string; url: string }[];
}

export function CustomOrderDetail({ id, canWrite }: { id: string; canWrite: boolean }) {
  const base = `/api/admin/custom-orders/${encodeURIComponent(id)}`;
  const { data, error, loading, reload } = useLoad<{ request: Detail }>(base);
  const r = data?.request ?? null;
  const act = useAction(reload);
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("7");
  const [note, setNote] = useState("");
  const [valid, setValid] = useState("");
  const post = (p: string, body: unknown, msg: string) => act.run(() => adminFetch(`${base}${p}`, { method: "POST", body }), msg);
  const kurus = Math.round(Number(price.replace(",", ".")) * 100);
  const canQuote = r && ["NEW", "REVIEWING", "QUOTED"].includes(r.status);

  return (
    <LoadState loading={loading} error={error} data={r}>
      {r && (
        <div className="space-y-5">
          <Feedback error={act.error} done={act.done} />
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Talep">
              <Dl
                rows={[
                  ["Durum", <Badge key="s" map={CUSTOM_STATUS} value={r.status} />],
                  ["Müşteri", r.name],
                  ["E-posta", r.email],
                  ["Telefon", r.phone ?? "-"],
                  ["Ürün türü", r.productType ?? "-"],
                  ["Ölçü", r.size ?? "-"],
                  ["İplik rengi", r.threadColor ?? "-"],
                  ["İstenen tarih", fmtDay(r.deadline)],
                  ["Tarih", fmtDate(r.createdAt)],
                  ...(r.orderNumber ? ([["Sipariş", r.orderNumber]] as [string, string][]) : []),
                ]}
              />
              {r.text && <p className="mt-3 whitespace-pre-line text-sm text-ink">{r.text}</p>}
            </Panel>
            <Panel title={`Referans görselleri (${r.attachments.length})`}>
              {r.attachments.length === 0 ? (
                <p className="text-sm text-umber">Görsel yüklenmemiş.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3">
                  {r.attachments.map((a) => (
                    <li key={a.id}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="block border border-hairline">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.url} alt={a.name} className="aspect-square w-full object-cover" loading="lazy" />
                      </a>
                      <p className="mt-1 truncate text-xs text-umber">{a.name}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {r.quote && (
            <Panel title="Verilen teklif">
              <Dl rows={[["Tutar", formatTRY(r.quote.priceKurus)], ["Hazırlık", `${r.quote.prepDays ?? "-"} gün`], ["Geçerlilik", fmtDay(r.quote.validUntil)], ["Not", r.quote.note ?? "-"]]} />
            </Panel>
          )}

          {canWrite && (
            <div className="grid gap-5 lg:grid-cols-2">
              {canQuote && (
                <Panel title={r.status === "QUOTED" ? "Teklifi güncelle" : "Teklif ver"} description="Müşteriye e-posta ile gönderilir. Müşteri kabul ederse ödemesi bekleyen sipariş oluşur.">
                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      post("/quote", { priceKurus: kurus, prepDays: Number(days), note: note.trim() || undefined, validUntil: valid }, "Teklif gönderildi.");
                    }}
                  >
                    <FormField label="Fiyat (TL)" htmlFor="q-p" required><input id="q-p" inputMode="decimal" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} required /></FormField>
                    <FormField label="Hazırlık süresi (gün)" htmlFor="q-d" required><input id="q-d" inputMode="numeric" className={inputCls} value={days} onChange={(e) => setDays(e.target.value)} required /></FormField>
                    <FormField label="Geçerlilik tarihi" htmlFor="q-v" required><input id="q-v" type="date" className={inputCls} value={valid} onChange={(e) => setValid(e.target.value)} required /></FormField>
                    <FormField label="Müşteriye not" htmlFor="q-n" className="sm:col-span-2"><textarea id="q-n" rows={3} className={textareaCls} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
                    <div className="sm:col-span-2">
                      <button type="submit" className={btnCls("primary")} disabled={act.busy || !(kurus >= 100)}>Teklifi gönder</button>
                    </div>
                  </form>
                </Panel>
              )}
              {["NEW", "REVIEWING", "QUOTED"].includes(r.status) && (
                <Panel title="Durum">
                  <div className="flex flex-wrap gap-3">
                    {r.status === "NEW" && <button type="button" className={btnCls("secondary")} disabled={act.busy} onClick={() => post("/status", { status: "REVIEWING" }, "İncelemeye alındı.")}>İncelemeye al</button>}
                    <button type="button" className={btnCls("danger")} disabled={act.busy} onClick={() => { if (window.confirm("Talep reddedilsin mi?")) post("/status", { status: "REJECTED" }, "Talep reddedildi."); }}>Reddet</button>
                    <button type="button" className={btnCls("secondary")} disabled={act.busy} onClick={() => { if (window.confirm("Talep iptal edilsin mi?")) post("/status", { status: "CANCELLED" }, "Talep iptal edildi."); }}>İptal et</button>
                  </div>
                </Panel>
              )}
            </div>
          )}
        </div>
      )}
    </LoadState>
  );
}
