"use client";

import { useState } from "react";
import Link from "next/link";
import { adminFetch, btnCls, ConfirmDialog, DataTable, FormField, inputCls, Panel, StatusBadge } from "@/components/admin";
import { Dl, Feedback, fmtDate, LoadState, ORDER_STATUS, Badge, useAction, useLoad } from "./shared";
import { formatTRY } from "@/lib/format";

interface Row { id: string; email: string; name: string | null; status: string; createdAt: string; emailVerified: boolean; orderCount: number }

export function CustomersList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page) });
  if (search.trim()) qs.set("search", search.trim());
  const { data, error, loading } = useLoad<{ total?: number; pageSize?: number; customers: Row[] }>(`/api/admin/customers?${qs}`);
  return (
    <div className="space-y-4">
      <FormField label="Ara (e-posta veya ad)" htmlFor="c-search" className="max-w-md">
        <input id="c-search" className={inputCls} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </FormField>
      <LoadState loading={loading} error={error} data={data}>
        {data && (
          <>
            <DataTable<Row>
              rows={data.customers}
              rowKey={(r) => r.id}
              columns={[
                { key: "e", header: "E-posta", primary: true, cell: (r) => <Link className="font-semibold text-gold-text underline underline-offset-2" href={`/admin/musteriler/${r.id}`}>{r.email}</Link> },
                { key: "n", header: "Ad", cell: (r) => r.name ?? "-" },
                { key: "s", header: "Durum", cell: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "success" : "danger"}>{r.status === "ACTIVE" ? "Aktif" : "Devre dışı"}</StatusBadge> },
                { key: "o", header: "Sipariş", className: "tabular-nums", cell: (r) => r.orderCount },
                { key: "d", header: "Kayıt", hideOnMobile: true, cell: (r) => fmtDate(r.createdAt) },
              ]}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnCls("secondary")} disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</button>
              <button type="button" className={btnCls("secondary")} disabled={data.customers.length < (data.pageSize ?? 20)} onClick={() => setPage(page + 1)}>Sonraki</button>
            </div>
          </>
        )}
      </LoadState>
    </div>
  );
}

interface Detail {
  id: string; email: string; name: string | null; phone?: string | null; status: string; createdAt: string; emailVerifiedAt?: string | null; favoritesCount?: number;
  addresses?: { id: string; title?: string | null; city?: string | null; district?: string | null }[];
  orders?: { id: string; number: string; status: string; totalKurus: number }[];
}

export function CustomerDetail({ id, canWrite }: { id: string; canWrite: boolean }) {
  const base = `/api/admin/customers/${encodeURIComponent(id)}`;
  const { data, error, loading, reload } = useLoad<{ customer: Detail } & Detail>(base);
  const c: Detail | null = data ? (data.customer ?? data) : null;
  const act = useAction(reload);
  const [anon, setAnon] = useState(false);
  const post = (p: string, body: unknown, msg: string) => act.run(() => adminFetch(`${base}${p}`, { method: "POST", body }), msg);
  return (
    <LoadState loading={loading} error={error} data={c}>
      {c && (
        <div className="space-y-5">
          <Feedback error={act.error} done={act.done} />
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Hesap">
              <Dl
                rows={[
                  ["E-posta", c.email],
                  ["Ad", c.name ?? "-"],
                  ["Durum", c.status === "ACTIVE" ? "Aktif" : "Devre dışı"],
                  ["E-posta doğrulandı", c.emailVerifiedAt ? fmtDate(c.emailVerifiedAt) : "Hayır"],
                  ["Kayıt", fmtDate(c.createdAt)],
                  ["Favoriler", c.favoritesCount ?? 0],
                ]}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className={btnCls("secondary")} disabled={act.busy} onClick={() => post("/status", { status: c.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }, "Durum güncellendi.")}>
                  {c.status === "ACTIVE" ? "Hesabı devre dışı bırak" : "Hesabı etkinleştir"}
                </button>
                {!c.emailVerifiedAt && (
                  <button type="button" className={btnCls("secondary")} disabled={act.busy} onClick={() => post("/resend-verification", {}, "Doğrulama e-postası gönderildi.")}>Doğrulama e-postasını tekrar gönder</button>
                )}
                <a className={btnCls("secondary")} href={`${base}/export`}>Verileri indir (KVKK)</a>
                {canWrite && <button type="button" className={btnCls("danger")} disabled={act.busy} onClick={() => setAnon(true)}>Anonimleştir</button>}
              </div>
            </Panel>
            <Panel title="Siparişler">
              <ul className="divide-y divide-hairline text-sm">
                {(c.orders ?? []).map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link className="font-semibold text-gold-text underline underline-offset-2" href={`/admin/siparisler/${o.id}`}>{o.number}</Link>
                    <Badge map={ORDER_STATUS} value={o.status} />
                    <span className="tabular-nums">{formatTRY(o.totalKurus)}</span>
                  </li>
                ))}
                {(c.orders ?? []).length === 0 && <li className="py-2 text-umber">Sipariş yok.</li>}
              </ul>
            </Panel>
          </div>
          <ConfirmDialog
            open={anon}
            title="Müşteri anonimleştirilsin mi?"
            message="Kişisel veriler kalıcı olarak silinir; sipariş tutarları muhasebe için korunur. Bu işlem geri alınamaz."
            confirmLabel="Anonimleştir"
            danger
            busy={act.busy}
            onCancel={() => setAnon(false)}
            onConfirm={async () => { await post("/anonymize", { confirm: true }, "Müşteri anonimleştirildi."); setAnon(false); }}
          />
        </div>
      )}
    </LoadState>
  );
}
