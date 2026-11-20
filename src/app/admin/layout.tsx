import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin";
import { requireAdminPage } from "@/server/modules/admin-catalog/guard";
import { getSiteSettings } from "@/server/modules/settings/service";

export const metadata: Metadata = { title: { default: "Yönetim", template: "%s · Yönetim" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminPage();
  const { storeName } = await getSiteSettings();
  return (
    <AdminShell permissions={user.permissions} userLabel={user.email} storeName={storeName}>
      {children}
    </AdminShell>
  );
}
