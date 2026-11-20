import { AccountClient } from "@/components/account/AccountClient";

export const metadata = { title: "Hesabım" };

export default async function HesabimPage({ searchParams }: { searchParams: Promise<{ tab?: string; siparis?: string }> }) {
  const { tab, siparis } = await searchParams;
  return <AccountClient initialTab={tab} initialOrder={siparis} />;
}
