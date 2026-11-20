import { VerifyEmail } from "@/components/auth/AuthForms";

export const metadata = { title: "E-posta doğrulama" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <VerifyEmail token={token} />;
}
