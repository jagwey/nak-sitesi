import { LoginForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Giriş yap" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={next} />;
}
