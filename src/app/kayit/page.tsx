import { RegisterForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Hesap oluştur" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <RegisterForm next={next} />;
}
