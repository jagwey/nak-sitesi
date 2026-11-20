"use client";

import { useState } from "react";
import { btnCls, DataTable, FormField, inputCls } from "@/components/admin";
import { fmtDate, LoadState, useLoad } from "./shared";

interface L { id: string; createdAt: string; action: string; entity: string; entityId: string | null; actorEmail: string | null }

export function AuditLog() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page) });
  if (action.trim()) qs.set("action", action.trim());
  const { data, error, loading } = useLoad<{ logs: L[]; pageSize?: number }>(`/api/admin/audit?${qs}`);
  return (
    <div className="space-y-4">
      <FormField label="İşlem (ör. order.cancel)" htmlFor="au-a" className="max-w-sm">
        <input id="au-a" className={inputCls} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
      </FormField>
      <LoadState loading={loading} error={error} data={data}>
        {data && (
          <>
            <DataTable<L>
              rows={data.logs}
              rowKey={(r) => r.id}
              empty="Kayıt yok."
              columns={[
                { key: "d", header: "Tarih", primary: true, cell: (r) => fmtDate(r.createdAt) },
                { key: "a", header: "İşlem", cell: (r) => r.action },
                { key: "e", header: "Varlık", hideOnMobile: true, cell: (r) => `${r.entity}${r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}` },
                { key: "u", header: "Yönetici", cell: (r) => r.actorEmail ?? "-" },
              ]}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnCls("secondary")} disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</button>
              <button type="button" className={btnCls("secondary")} disabled={data.logs.length < (data.pageSize ?? 20)} onClick={() => setPage(page + 1)}>Sonraki</button>
            </div>
          </>
        )}
      </LoadState>
    </div>
  );
}
