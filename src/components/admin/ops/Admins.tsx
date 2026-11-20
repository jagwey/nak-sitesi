"use client";

import { useState } from "react";
import { adminFetch, btnCls, DataTable, FormField, inputCls, Panel, selectCls, StatusBadge } from "@/components/admin";
import { ADMIN_ROLE_LABELS, ASSIGNABLE_ROLES } from "@/lib/admin-roles";
import { Feedback, fmtDate, LoadState, useAction, useLoad } from "./shared";

interface A { id: string; email: string; name: string | null; status: string; lastLoginAt: string | null; role: string; roleLabel: string }
const roleOptions = ASSIGNABLE_ROLES.map((code) => <option key={code} value={code}>{ADMIN_ROLE_LABELS[code]}</option>);

export function AdminsManager({ canManage }: { canManage: boolean }) {
  const { data, error, loading, reload } = useLoad<{ admins: A[] }>("/api/admin/admins");
  const act = useAction(reload);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("MODERATOR");
  const [inviteUrl, setInviteUrl] = useState("");
  return (
    <div className="space-y-5">
      <Feedback error={act.error} done={act.done} />
      {canManage && <Panel title="Ekip üyesi davet et" description="Moderatör, kişiye özel tasarım taleplerini yönetir. Ürün yüklemek için Ürün Yöneticisi rolünü seçin.">
        <form
          className="grid gap-3 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            setInviteUrl("");
            act.run(async () => {
              const result = await adminFetch<{ inviteUrl?: string }>("/api/admin/admins", {
                method: "POST",
                body: { email: email.trim(), name: name.trim() || undefined, role },
              });
              setInviteUrl(result.inviteUrl ?? "");
              setEmail("");
              setName("");
            }, "Ekip üyesi eklendi.");
          }}
        >
          <FormField label="E-posta" htmlFor="a-e" required><input id="a-e" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required /></FormField>
          <FormField label="Ad" htmlFor="a-n"><input id="a-n" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></FormField>
          <FormField label="Rol" htmlFor="a-r"><select id="a-r" className={selectCls} value={role} onChange={(e) => setRole(e.target.value)}>{roleOptions}</select></FormField>
          <div className="flex items-end"><button type="submit" className={btnCls("primary")} disabled={act.busy}>Ekle</button></div>
        </form>
        {inviteUrl && (
          <div className="mt-4">
            <FormField label="Tek kullanımlık davet bağlantısı" htmlFor="a-invite">
              <input id="a-invite" className={inputCls} value={inviteUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
            </FormField>
            <p className="mt-2 text-sm text-umber">Bu bağlantıyı yalnızca davet ettiğiniz kişiyle paylaşın. Bağlantı bir saat geçerlidir.</p>
          </div>
        )}
      </Panel>}
      <LoadState loading={loading} error={error} data={data}>
        {data && (
          <DataTable<A>
            rows={data.admins}
            rowKey={(r) => r.id}
            columns={[
              { key: "e", header: "E-posta", primary: true, cell: (r) => r.email },
              { key: "r", header: "Rol", cell: (r) => (
                !canManage || r.role === "SUPER_ADMIN" ? r.roleLabel : (
                  <select aria-label={`${r.email} rolü`} className={selectCls} value={r.role} disabled={act.busy} onChange={(e) => act.run(() => adminFetch(`/api/admin/admins/${r.id}`, { method: "PATCH", body: { role: e.target.value } }), "Rol güncellendi.")}>
                    {roleOptions}
                  </select>
                )
              ) },
              { key: "s", header: "Durum", cell: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "success" : "danger"}>{r.status === "ACTIVE" ? "Aktif" : "Devre dışı"}</StatusBadge> },
              { key: "l", header: "Son giriş", hideOnMobile: true, cell: (r) => fmtDate(r.lastLoginAt) },
              { key: "x", header: "", cell: (r) => canManage && r.role !== "SUPER_ADMIN" && (
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
