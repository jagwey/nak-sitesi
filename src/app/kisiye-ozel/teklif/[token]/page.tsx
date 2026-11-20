import type { Metadata } from "next";
import { GuestQuote } from "@/components/custom-order/GuestQuote";

export const metadata: Metadata = { title: "Kişiye özel teklif", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestQuote token={token} />;
}
