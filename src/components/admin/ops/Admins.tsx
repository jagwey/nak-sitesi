"use client";

import { useState } from "react";
import { adminFetch, btnCls, DataTable, FormField, inputCls, Panel, selectCls, StatusBadge } from "@/components/admin";
import { Feedback, fmtDate, LoadState, useAction, useLoad } from "./shared";

interface A { id: string; email: string; name: string | null; status: string; lastLoginAt: string | null; role: string; roleLabel: string }
const ROLES = [["ADMIN", "Yönetici"], ["PRODUCT_MANAGER", "Ürün Yöneticisi"], ["ORDER_MANAGER", "Sipariş Yöneticisi"]];

export function AdminsManager() {
  const { data, error, loading, reload } = useLoad<{ admins: A[] }>("/api/admin/admins");
  const act = useAction(reload);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("ORDER_MANAGER");
  return (
    <div className="space-y-5">
      <Feedback error={act.error} done={act.done} />
      <Panel title="Yönetici davet et" description="Yalnızca Süper Yönetici ekleyebilir; davetli e-posta ile parola belirler.">
        <form
          className="grid gap-3 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            act.run(async () => {
              await adminFetch("/api/admin/admins", { method: "POST", body: { email: email.trim(), name: name.trim() || undefined, role } });
              setEmail("");
              setName("");
            }, "Yönetici eklendi.");
          }}
        >
          <FormField label="E-posta" htmlFor="a-e" required><input id="a-e" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required /></FormField>
          <FormField label="Ad" htmlFor="a-n"><input id="a-n" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></FormField>
          <FormField label="Rol" htmlFor="a-r"><select id="a-r" className={selectCls} value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></FormField>
          <div className="flex items-end"><button type="submit" className={btnCls("primary")} disabled={act.busy}>Ekle</button></div>
        </form>
      </Panel>
      <LoadState loading={loading} error={error} data={data}>
        {data && (
          <DataTable<A>
            rows={data.admins}
            rowKey={(r) => r.id}
            columns={[
              { key: "e", header: "E-posta", primary: true, cell: (r) => r.email },
              { key: "r", header: "Rol", cell: (r) => (
                r.role === "SUPER_ADMIN" ? r.roleLabel : (
                  <select aria-label={`${r.email} rolü`} className={selectCls} value={r.role} disabled={act.busy} onChange={(e) => act.run(() => adminFetch(`/api/admin/admins/${r.id}`, { method: "PATCH", body: { role: e.target.value } }), "Rol güncellendi.")}>
                    {ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                )
              ) },
              { key: "s", header: "Durum", cell: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "success" : "danger"}>{r.status === "ACTIVE" ? "Aktif" : "Devre dışı"}</StatusBadge> },
              { key: "l", header: "Son giriş", hideOnMobile: true, cell: (r) => fmtDate(r.lastLoginAt) },
              { key: "x", header: "", cell: (r) => (
                <button type="button" className={btnCls("secondary")} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/api/admin/admins/${r.id}`, { method: "PATCH", body: { status: r.status === "ACTIVE" ? "DISABLED" : "ACTIVE" } }), "Durum güncellendi.")}>
                  {r.status === "ACTIVE" ? "Devre dışı bırak" : "Etkinleştir"}
                </button>
              ) },
            ]}
          />
        )}
      </LoadState>
    </div>
  );
}
