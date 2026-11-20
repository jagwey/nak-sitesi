"use client";

import { usePathname } from "next/navigation";

/** Hides storefront chrome (header, footer, drawers) inside the /admin back office. */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/admin" || path.startsWith("/admin/")) return null;
  return <>{children}</>;
}
