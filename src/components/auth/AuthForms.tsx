"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import { AuthShell, Field, FormMessage, TextLink, inputCls, primaryBtn, safeNext } from "./ui";

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { refreshAuth, refreshCart } = useStore();
  const { busy, error, run } = useSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const target = safeNext(next);
  const q = next ? `?next=${encodeURIComponent(target)}` : "";
  return (
    <AuthShell
      title="Giriş yap"
      intro="Siparişlerinize, indirmelerinize ve favorilerinize ulaşın."
      footer={
        <p>
          Hesabınız yok mu? <TextLink href={`/kayit${q}`}>Hesap oluşturun</TextLink>
        </p>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await apiFetch("/api/auth/login", { method: "POST", body: { email, password } });
            await refreshAuth();
            await refreshCart();
            router.push(target);
            router.refresh();
          });
        }}
      >
        <Field label="E-posta" id="email">
          <input id="email" type="email" autoComplete="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Şifre" id="password">
          <input id="password" type="password" autoComplete="current-password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
        <p className="text-[0.875rem]">
          <TextLink href="/sifremi-unuttum">Şifremi unuttum</TextLink>
        </p>
      </form>
    </AuthShell>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const { refreshAuth, refreshCart } = useStore();
  const { busy, error, run } = useSubmit();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const target = safeNext(next);
  const q = next ? `?next=${encodeURIComponent(target)}` : "";
  return (
    <AuthShell
      title="Hesap oluştur"
      intro="Dijital ürünleri indirmek ve siparişlerinizi takip etmek için hesap gerekir."
      footer={
        <p>
          Zaten hesabınız var mı? <TextLink href={`/giris${q}`}>Giriş yapın</TextLink>
        </p>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await apiFetch("/api/auth/register", { method: "POST", body: { email, password, ...(name.trim() ? { name: name.trim() } : {}) } });
            await refreshAuth();
            await refreshCart();
            router.push(target);
            router.refresh();
          });
        }}
      >
        <Field label="Ad soyad (isteğe bağlı)" id="name">
          <input id="name" autoComplete="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </Field>
        <Field label="E-posta" id="email">
          <input id="email" type="email" autoComplete="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Şifre" id="password" hint="En az 10 karakter.">
          <input id="password" type="password" autoComplete="new-password" required minLength={10} className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
        </button>
      </form>
    </AuthShell>
  );
}

export function ForgotForm() {
  const { busy, error, run } = useSubmit();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <AuthShell title="Şifremi unuttum" intro="E-posta adresinizi girin; hesap varsa sıfırlama bağlantısı gönderilir." footer={<TextLink href="/giris">Girişe dön</TextLink>}>
      {sent ? (
        <FormMessage kind="ok">Bu adres bir hesaba kayıtlıysa şifre sıfırlama bağlantısı e-postanıza gönderildi.</FormMessage>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await apiFetch("/api/auth/request-password-reset", { method: "POST", body: { email } });
              setSent(true);
            });
          }}
        >
          <Field label="E-posta" id="email">
            <input id="email" type="email" autoComplete="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Gönderiliyor…" : "Bağlantı gönder"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetForm({ token: queryToken }: { token?: string }) {
  const { busy, error, run } = useSubmit();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [fragmentToken, setFragmentToken] = useState<string | null>();
  useEffect(() => {
    setFragmentToken(new URLSearchParams(window.location.hash.slice(1)).get("token"));
  }, []);
  const token = queryToken ?? fragmentToken;
  if (token === undefined) {
    return <AuthShell title="Şifre sıfırla"><p className="text-umber">Yükleniyor…</p></AuthShell>;
  }
  if (!token) {
    return (
      <AuthShell title="Şifre sıfırla" footer={<TextLink href="/sifremi-unuttum">Yeni bağlantı iste</TextLink>}>
        <FormMessage kind="error">Sıfırlama bağlantısı geçersiz veya eksik.</FormMessage>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Yeni şifre belirleyin" footer={<TextLink href="/giris">Girişe dön</TextLink>}>
      {done ? (
        <FormMessage kind="ok">Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.</FormMessage>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await apiFetch("/api/auth/reset-password", { method: "POST", body: { token, password } });
              setDone(true);
            });
          }}
        >
          <Field label="Yeni şifre" id="password" hint="En az 10 karakter.">
            <input id="password" type="password" autoComplete="new-password" required minLength={10} className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Kaydediliyor…" : "Şifreyi güncelle"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmail({ token }: { token?: string }) {
  const { refreshAuth } = useStore();
  const [state, setState] = useState<"loading" | "ok" | "error">(token ? "loading" : "error");
  const [msg, setMsg] = useState(token ? "" : "Doğrulama bağlantısı geçersiz veya eksik.");
  const started = useRef(false);
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    apiFetch("/api/auth/verify-email", { method: "POST", body: { token } })
      .then(() => {
        setState("ok");
        void refreshAuth();
      })
      .catch((e) => {
        setState("error");
        setMsg(e instanceof ApiError ? e.message : "Doğrulama tamamlanamadı.");
      });
  }, [token, refreshAuth]);
  return (
    <AuthShell title="E-posta doğrulama" footer={<TextLink href="/hesabim">Hesabıma git</TextLink>}>
      {state === "loading" && <p className="text-umber">Doğrulanıyor…</p>}
      {state === "ok" && <FormMessage kind="ok">E-posta adresiniz doğrulandı.</FormMessage>}
      {state === "error" && <FormMessage kind="error">{msg}</FormMessage>}
    </AuthShell>
  );
}
