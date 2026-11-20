"use client";

import { useState } from "react";
import { adminFetch, btnCls, ConfirmDialog, DataTable, FormField, inputCls } from "@/components/admin";
import { Feedback, fmtDate, LoadState, useAction, useLoad } from "./shared";

interface Log { id: string; createdAt: string; ipHash: string | null; entitlementId: string; remaining: number; revoked: boolean; userEmail: string | null; productName: string | null }

export function DownloadsLog() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad<{ logs: Log[]; pageSize?: number }>(`/api/admin/downloads?page=${page}`);
  const act = useAction(reload);
  const [revoke, setRevoke] = useState<Log | null>(null);
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-4">
      <Feedback error={act.error} done={act.done} />
      <LoadState loading={loading} error={error} data={data}>
        {data && (
          <>
            <DataTable<Log>
              rows={data.logs}
              rowKey={(r) => r.id}
              empty="İndirme kaydı yok."
              columns={[
                { key: "d", header: "Tarih", primary: true, cell: (r) => fmtDate(r.createdAt) },
                { key: "u", header: "Müşteri", cell: (r) => r.userEmail ?? "-" },
                { key: "p", header: "Ürün", cell: (r) => r.productName ?? "-" },
                { key: "r", header: "Kalan hak", className: "tabular-nums", cell: (r) => (r.revoked ? "İptal" : r.remaining) },
                {
                  key: "x", header: "", cell: (r) => (
                    <div className="flex gap-2">
                      <button type="button" className={btnCls("secondary")} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/api/admin/downloads/${r.entitlementId}/reset`, { method: "POST", body: {} }), "Hak sıfırlandı.")}>Sıfırla</button>
                      {!r.revoked && <button type="button" className={btnCls("danger")} disabled={act.busy} onClick={() => { setReason(""); setRevoke(r); }}>İptal et</button>}
                    </div>
                  ),
                },
              ]}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnCls("secondary")} disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</button>
              <button type="button" className={btnCls("secondary")} disabled={data.logs.length < (data.pageSize ?? 20)} onClick={() => setPage(page + 1)}>Sonraki</button>
            </div>
          </>
        )}
      </LoadState>
      <ConfirmDialog
        open={!!revoke}
        title="İndirme hakkı iptal edilsin mi?"
        message="Müşteri bu dosyayı artık indiremez. Gerekçe denetim kaydına işlenir."
        confirmLabel="Hakkı iptal et"
        danger
        busy={act.busy}
        onCancel={() => setRevoke(null)}
        onConfirm={async () => {
          if (!revoke || reason.trim().length < 3) return;
          await act.run(() => adminFetch(`/api/admin/downloads/${revoke.entitlementId}/revoke`, { method: "POST", body: { reason: reason.trim() } }), "Hak iptal edildi.");
          setRevoke(null);
        }}
      >
        <FormField label="Gerekçe (en az 3 karakter)" htmlFor="rv"><input id="rv" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
      </ConfirmDialog>
    </div>
  );
}
