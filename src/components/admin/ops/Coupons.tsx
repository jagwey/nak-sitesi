"use client";

import { useState } from "react";
import { adminFetch, btnCls, DataTable, FormField, inputCls, Panel, selectCls, StatusBadge, fieldErrors } from "@/components/admin";
import { formatTRY } from "@/lib/format";
import { Feedback, fmtDay, LoadState, useAction, useLoad } from "./shared";

interface Coupon {
  id: string; code: string; type: "PERCENT" | "FIXED"; value: number; minSubtotalKurus: number; usageLimit: number | null; perCustomerLimit: number | null;
  startsAt: string | null; endsAt: string | null; active: boolean; usedCount?: number;
}

const toKurus = (s: string) => Math.round(Number(s.replace(",", ".")) * 100);

export function CouponsManager() {
  const { data, error, loading, reload } = useLoad<{ coupons: Coupon[] }>("/api/admin/coupons");
  const act = useAction(reload);
  const [f, setF] = useState({ code: "", type: "PERCENT", value: "", min: "0", usage: "", per: "", ends: "" });
  const [fe, setFe] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setFe({});
    const value = f.type === "PERCENT" ? Math.round(Number(f.value)) : toKurus(f.value);
    await act.run(async () => {
      try {
        await adminFetch("/api/admin/coupons", {
          method: "POST",
          body: {
            code: f.code.trim().toUpperCase(), type: f.type, value, minSubtotalKurus: toKurus(f.min || "0"), active: true,
            usageLimit: f.usage ? Number(f.usage) : undefined, perCustomerLimit: f.per ? Number(f.per) : undefined,
            endsAt: f.ends ? new Date(`${f.ends}T23:59:59`).toISOString() : undefined,
          },
        });
        setF({ code: "", type: "PERCENT", value: "", min: "0", usage: "", per: "", ends: "" });
      } catch (err) {
        setFe(fieldErrors(err));
        throw err;
      }
    }, "Kupon oluşturuldu.");
  }

  return (
    <div className="space-y-5">
      <Feedback error={act.error} done={act.done} />
      <Panel title="Yeni kupon">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Kod" htmlFor="k-code" error={fe.code} required><input id="k-code" className={inputCls} value={f.code} onChange={(e) => set("code", e.target.value)} required /></FormField>
          <FormField label="Tür" htmlFor="k-type">
            <select id="k-type" className={selectCls} value={f.type} onChange={(e) => set("type", e.target.value)}>
              <option value="PERCENT">Yüzde (%)</option>
              <option value="FIXED">Sabit tutar (TL)</option>
            </select>
          </FormField>
          <FormField label={f.type === "PERCENT" ? "İndirim (%)" : "İndirim (TL)"} htmlFor="k-val" error={fe.value} required><input id="k-val" inputMode="decimal" className={inputCls} value={f.value} onChange={(e) => set("value", e.target.value)} required /></FormField>
          <FormField label="Asgari sepet (TL)" htmlFor="k-min"><input id="k-min" inputMode="decimal" className={inputCls} value={f.min} onChange={(e) => set("min", e.target.value)} /></FormField>
          <FormField label="Toplam kullanım sınırı" htmlFor="k-use"><input id="k-use" inputMode="numeric" className={inputCls} value={f.usage} onChange={(e) => set("usage", e.target.value)} /></FormField>
          <FormField label="Müşteri başına sınır" htmlFor="k-per"><input id="k-per" inputMode="numeric" className={inputCls} value={f.per} onChange={(e) => set("per", e.target.value)} /></FormField>
          <FormField label="Bitiş tarihi" htmlFor="k-end"><input id="k-end" type="date" className={inputCls} value={f.ends} onChange={(e) => set("ends", e.target.value)} /></FormField>
          <div className="flex items-end"><button type="submit" className={btnCls("primary")} disabled={act.busy}>Kupon oluştur</button></div>
        </form>
      </Panel>
      <LoadState loading={loading} error={error} data={data}>
        {data && (
          <DataTable<Coupon>
            rows={data.coupons}
            rowKey={(r) => r.id}
            empty="Henüz kupon yok."
            columns={[
              { key: "c", header: "Kod", primary: true, cell: (r) => <span className="font-semibold tabular-nums">{r.code}</span> },
              { key: "v", header: "İndirim", className: "tabular-nums", cell: (r) => (r.type === "PERCENT" ? `%${r.value}` : formatTRY(r.value)) },
              { key: "m", header: "Asgari", hideOnMobile: true, className: "tabular-nums", cell: (r) => formatTRY(r.minSubtotalKurus) },
              { key: "e", header: "Bitiş", hideOnMobile: true, cell: (r) => fmtDay(r.endsAt) },
              { key: "a", header: "Durum", cell: (r) => <StatusBadge tone={r.active ? "success" : "neutral"}>{r.active ? "Aktif" : "Pasif"}</StatusBadge> },
              {
                key: "x", header: "", cell: (r) => (
                  <div className="flex gap-2">
                    <button type="button" className={btnCls("secondary")} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/api/admin/coupons/${r.id}`, { method: "PATCH", body: { active: !r.active } }), "Güncellendi.")}>{r.active ? "Pasifleştir" : "Etkinleştir"}</button>
                    <button type="button" className={btnCls("danger")} disabled={act.busy} onClick={() => { if (window.confirm(`${r.code} kuponu silinsin mi?`)) act.run(() => adminFetch(`/api/admin/coupons/${r.id}`, { method: "DELETE" }), "Kupon silindi."); }}>Sil</button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </LoadState>
    </div>
  );
}
