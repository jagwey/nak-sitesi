"use client";

import { useState } from "react";
import Link from "next/link";
import { adminFetch, btnCls, ConfirmDialog, DataTable, FormField, inputCls, Panel, selectCls } from "@/components/admin";
import { formatTRY } from "@/lib/format";
import { Badge, Dl, Feedback, fmtDate, LoadState, ORDER_STATUS, PAYMENT_STATUS, useAction, useLoad } from "./shared";

interface Row {
  id: string; number: string; email: string; status: string; paymentStatus: string; totalKurus: number; placedAt: string; itemCount: number;
}

export function OrdersList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page) });
  if (search.trim()) qs.set("search", search.trim());
  if (status) qs.set("status", status);
  const { data, error, loading } = useLoad<{ total: number; pageSize: number; orders: Row[] }>(`/api/admin/orders?${qs}`);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <FormField label="Ara (sipariş no veya e-posta)" htmlFor="o-search">
          <input id="o-search" className={inputCls} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </FormField>
        <FormField label="Durum" htmlFor="o-status">
          <select id="o-status" className={selectCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tümü</option>
            {Object.entries(ORDER_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </FormField>
      </div>
      <LoadState loading={loading} error={error} data={data}>
        {data && (
          <>
            <DataTable<Row>
              rows={data.orders}
              rowKey={(r) => r.id}
              columns={[
                { key: "n", header: "Sipariş", primary: true, cell: (r) => <Link className="font-semibold text-gold-text underline underline-offset-2" href={`/admin/siparisler/${r.id}`}>{r.number}</Link> },
                { key: "e", header: "Müşteri", cell: (r) => r.email },
                { key: "s", header: "Durum", cell: (r) => <Badge map={ORDER_STATUS} value={r.status} /> },
                { key: "p", header: "Ödeme", cell: (r) => PAYMENT_STATUS[r.paymentStatus] ?? r.paymentStatus },
                { key: "t", header: "Tutar", className: "tabular-nums", cell: (r) => formatTRY(r.totalKurus) },
                { key: "d", header: "Tarih", hideOnMobile: true, cell: (r) => fmtDate(r.placedAt) },
              ]}
            />
            <div className="flex items-center justify-between text-sm text-umber">
              <span className="tabular-nums">{data.total} sipariş</span>
              <div className="flex gap-2">
                <button type="button" className={btnCls("secondary")} disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</button>
                <button type="button" className={btnCls("secondary")} disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Sonraki</button>
              </div>
            </div>
          </>
        )}
      </LoadState>
    </div>
  );
}

interface Detail {
  id: string; number: string; email: string; phone: string | null; status: string; paymentStatus: string; totalKurus: number; subtotalKurus: number;
  discountKurus: number; shippingKurus: number; placedAt: string; shippingAddress: Record<string, string> | null; customerNote: string | null;
  items: { id: string; productName: string; quantity: number; unitPriceKurus: number; type: string; entitlements: { id: string; remaining: number; revokedAt: string | null }[] }[];
  payments: { id: string; provider: string; status: string; amountKurus: number; paidAt: string | null }[];
  shipments: { id: string; carrier: string | null; trackingNumber: string | null; status: string }[];
}

type Confirm = null | "cancel" | "refund" | "manual";

export function OrderDetail({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { data, error, loading, reload } = useLoad<Detail>(`/api/admin/orders/${encodeURIComponent(id)}`);
  const act = useAction(reload);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [status, setStatus] = useState("PROCESSING");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [reference, setReference] = useState("");
  const base = `/api/admin/orders/${encodeURIComponent(id)}`;
  const post = (p: string, body: unknown, msg: string) => act.run(() => adminFetch(`${base}${p}`, { method: "POST", body }), msg);

  return (
    <LoadState loading={loading} error={error} data={data}>
      {data && (
        <div className="space-y-5">
          <Feedback error={act.error} done={act.done} />
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={`Sipariş ${data.number}`}>
              <Dl
                rows={[
                  ["Durum", <Badge key="s" map={ORDER_STATUS} value={data.status} />],
                  ["Ödeme", PAYMENT_STATUS[data.paymentStatus] ?? data.paymentStatus],
                  ["Müşteri", data.email],
                  ["Telefon", data.phone ?? "-"],
                  ["Tarih", fmtDate(data.placedAt)],
                  ["Ara toplam", formatTRY(data.subtotalKurus)],
                  ["İndirim", formatTRY(data.discountKurus)],
                  ["Kargo", formatTRY(data.shippingKurus)],
                  ["Toplam", <strong key="t">{formatTRY(data.totalKurus)}</strong>],
                ]}
              />
              {data.shippingAddress && (
                <p className="mt-3 text-sm text-umber">
                  Teslimat: {[data.shippingAddress.fullName, data.shippingAddress.line1, data.shippingAddress.district, data.shippingAddress.city].filter(Boolean).join(", ")}
                </p>
              )}
              {data.customerNote && <p className="mt-2 text-sm text-umber">Not: {data.customerNote}</p>}
            </Panel>
            <Panel title="Kalemler">
              <ul className="divide-y divide-hairline text-sm">
                {data.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3 py-2">
                    <span>{i.productName} <span className="text-umber">x{i.quantity}</span></span>
                    <span className="tabular-nums">{formatTRY(i.unitPriceKurus * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-4 text-sm font-semibold text-ink">Ödemeler</h3>
              <ul className="mt-1 text-sm text-umber">
                {data.payments.map((p) => <li key={p.id}>{p.provider} · {PAYMENT_STATUS[p.status] ?? p.status} · {formatTRY(p.amountKurus)}</li>)}
                {data.payments.length === 0 && <li>Ödeme kaydı yok.</li>}
              </ul>
              <h3 className="mt-4 text-sm font-semibold text-ink">Gönderiler</h3>
              <ul className="mt-1 text-sm text-umber">
                {data.shipments.map((s) => <li key={s.id}>{s.carrier ?? "-"} · {s.trackingNumber ?? "takip no yok"} · {s.status}</li>)}
                {data.shipments.length === 0 && <li>Gönderi yok.</li>}
              </ul>
            </Panel>
          </div>

          {canWrite && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Durum güncelle">
                <div className="flex flex-wrap items-end gap-3">
                  <FormField label="Yeni durum" htmlFor="st" className="min-w-[200px] flex-1">
                    <select id="st" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                      {["PROCESSING", "IN_PRODUCTION", "SHIPPED", "COMPLETED"].map((s) => <option key={s} value={s}>{ORDER_STATUS[s][0]}</option>)}
                    </select>
                  </FormField>
                  <button type="button" className={btnCls("primary")} disabled={act.busy} onClick={() => post("/status", { status }, "Durum güncellendi.")}>Güncelle</button>
                </div>
              </Panel>
              <Panel title="Kargola" description="Ödenmiş fiziksel sipariş için gönderi oluşturur.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Kargo firması" htmlFor="car"><input id="car" className={inputCls} value={carrier} onChange={(e) => setCarrier(e.target.value)} /></FormField>
                  <FormField label="Takip numarası" htmlFor="trk"><input id="trk" className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} /></FormField>
                </div>
                <button
                  type="button"
                  className={btnCls("primary", "mt-3")}
                  disabled={act.busy}
                  onClick={() => post("/shipments", { carrier: carrier || undefined, trackingNumber: tracking || undefined, markShipped: true }, "Gönderi oluşturuldu.")}
                >
                  Kargoya verildi olarak kaydet
                </button>
              </Panel>
              <Panel title="Riskli işlemler" className="lg:col-span-2">
                <div className="flex flex-wrap gap-3">
                  <button type="button" className={btnCls("danger")} disabled={act.busy} onClick={() => setConfirm("cancel")}>Siparişi iptal et</button>
                  <button type="button" className={btnCls("danger")} disabled={act.busy} onClick={() => setConfirm("refund")}>İade et</button>
                  {data.status === "PENDING_PAYMENT" && (
                    <button type="button" className={btnCls("secondary")} disabled={act.busy} onClick={() => setConfirm("manual")}>Manuel ödeme kaydet (havale)</button>
                  )}
                </div>
              </Panel>
            </div>
          )}

          <ConfirmDialog
            open={confirm === "cancel"}
            title="Sipariş iptal edilsin mi?"
            message="Ayrılmış stok serbest bırakılır ve müşteriye e-posta gönderilir."
            confirmLabel="İptal et"
            danger
            busy={act.busy}
            onCancel={() => setConfirm(null)}
            onConfirm={async () => { await post("/cancel", {}, "Sipariş iptal edildi."); setConfirm(null); }}
          />
          <ConfirmDialog
            open={confirm === "refund"}
            title="Sipariş iade edilsin mi?"
            message="Ödeme iade edilir; ayar açıksa indirme hakları iptal edilir. Bu işlem geri alınamaz."
            confirmLabel="İade et"
            danger
            busy={act.busy}
            onCancel={() => setConfirm(null)}
            onConfirm={async () => { await post("/refund", {}, "İade kaydedildi."); setConfirm(null); }}
          />
          <ConfirmDialog
            open={confirm === "manual"}
            title="Manuel ödeme kaydedilsin mi?"
            message="Yalnızca ödemeyi gerçekten aldıysanız kaydedin. Dekont veya havale referansı zorunludur ve denetim kaydına işlenir."
            confirmLabel="Ödemeyi kaydet"
            busy={act.busy}
            onCancel={() => setConfirm(null)}
            onConfirm={async () => {
              if (reference.trim().length < 5) return;
              await post("/manual-payment", { reference: reference.trim() }, "Ödeme kaydedildi.");
              setConfirm(null);
            }}
          >
            <FormField label="Referans (en az 5 karakter)" htmlFor="ref">
              <input id="ref" className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} />
            </FormField>
          </ConfirmDialog>
        </div>
      )}
    </LoadState>
  );
}
