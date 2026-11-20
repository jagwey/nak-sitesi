"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatTRY } from "@/lib/format";
import { apiFetch, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Field, FormMessage, TextLink, inputCls, primaryBtn, secondaryBtn } from "@/components/auth/ui";

interface SavedAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  district: string;
  postalCode: string | null;
}

interface OrderView {
  number: string;
  status: string;
  paymentStatus: string;
  totalKurus: number;
}

interface CheckoutResult {
  order: OrderView;
  payment: { provider: string; status: string; canSimulate: boolean; message: string; redirectUrl?: string };
  guestAccessToken?: string;
}

const STATUS_TR: Record<string, string> = {
  PENDING_PAYMENT: "Ödeme bekleniyor",
  PAID: "Ödendi",
  CANCELLED: "İptal edildi",
  PROCESSING: "Hazırlanıyor",
  FAILED: "Ödeme başarısız",
};

const emptyAddr = { fullName: "", phone: "", line1: "", line2: "", city: "", district: "", postalCode: "" };

export default function OdemePage() {
  const { cart, user, authReady, subtotalKurus, discountKurus, shippingKurus, totalKurus, couponCode, hasPhysicalItems, hasDigitalItems, cartBlocking, refreshCart } = useStore();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [addr, setAddr] = useState(emptyAddr);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [addressId, setAddressId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [simMsg, setSimMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ addresses: SavedAddress[] }>("/api/me/addresses")
      .then((r) => {
        setSaved(r.addresses);
        if (r.addresses[0]) setAddressId(r.addresses[0].id);
      })
      .catch(() => setSaved([]));
  }, [user]);

  const setA = (k: keyof typeof emptyAddr) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (!user) body.email = email.trim();
      if (phone.trim()) body.phone = phone.trim();
      if (note.trim()) body.customerNote = note.trim();
      if (hasPhysicalItems) {
        if (user && addressId) body.addressId = addressId;
        else {
          body.shippingAddress = {
            fullName: addr.fullName,
            phone: addr.phone,
            line1: addr.line1,
            city: addr.city,
            district: addr.district,
            ...(addr.line2.trim() ? { line2: addr.line2 } : {}),
            ...(addr.postalCode.trim() ? { postalCode: addr.postalCode } : {}),
          };
        }
      }
      const r = await apiFetch<CheckoutResult>("/api/checkout", { method: "POST", body });
      setResult(r);
      await refreshCart();
    } catch (err) {
      const d = err instanceof ApiError ? (err.details as { requiresAccount?: boolean } | undefined) : undefined;
      setError(d?.requiresAccount ? "Dijital ürünler için hesap gerekir. Lütfen giriş yapın veya hesap oluşturun." : err instanceof ApiError ? err.message : "Sipariş oluşturulamadı.");
      void refreshCart();
    } finally {
      setBusy(false);
    }
  }

  async function simulate(outcome: "success" | "failure") {
    if (!result) return;
    setBusy(true);
    setSimMsg(null);
    try {
      await apiFetch("/api/dev/payments/simulate", {
        method: "POST",
        body: { orderNumber: result.order.number, outcome, ...(result.guestAccessToken ? { guestToken: result.guestAccessToken } : {}) },
      });
      const q = result.guestAccessToken ? `?guestToken=${encodeURIComponent(result.guestAccessToken)}` : "";
      const r = await apiFetch<{ order: OrderView }>(`/api/orders/${encodeURIComponent(result.order.number)}${q}`);
      setResult({ ...result, order: r.order });
      setSimMsg(outcome === "success" ? "Test ödemesi işlendi." : "Test ödemesi başarısız olarak işlendi.");
    } catch (err) {
      setSimMsg(err instanceof ApiError ? err.message : "Test ödemesi işlenemedi.");
    } finally {
      setBusy(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">{children}</div>
  );

  if (result) {
    const paid = result.order.paymentStatus === "PAID";
    return shell(
      <div className="mx-auto max-w-[640px]">
        <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight text-ink">{paid ? "Ödemeniz alındı" : "Siparişiniz oluşturuldu"}</h1>
        <p className="mt-3 text-[1rem] text-umber">
          Sipariş no: <span className="font-medium tabular-nums text-ink">{result.order.number}</span> · {formatTRY(result.order.totalKurus)}
        </p>
        <div className="mt-6 space-y-4">
          <FormMessage kind="ok">
            Durum: {STATUS_TR[result.order.status] ?? result.order.status}. {paid ? "" : result.payment.message}
          </FormMessage>
          {!paid && result.payment.redirectUrl && (
            <a href={result.payment.redirectUrl} className={primaryBtn}>
              Ödemeye geç
            </a>
          )}
          {!paid && result.payment.canSimulate && (
            <div className="border border-hairline bg-linen p-4">
              <p className="text-[0.875rem] font-medium text-ink">Test ödemesi (geliştirme)</p>
              <p className="mt-1 text-[0.8125rem] text-umber">Gerçek ödeme alınmaz; yalnızca geliştirme ortamında ödeme akışını denemek içindir.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" disabled={busy} onClick={() => simulate("success")} className={secondaryBtn}>
                  Ödemeyi başarılı say
                </button>
                <button type="button" disabled={busy} onClick={() => simulate("failure")} className={secondaryBtn}>
                  Ödemeyi başarısız say
                </button>
              </div>
              {simMsg && <p className="mt-3 text-[0.8125rem] text-ink">{simMsg}</p>}
            </div>
          )}
          {result.guestAccessToken && (
            <div className="border border-hairline p-4">
              <p className="text-[0.875rem] font-medium text-ink">Sipariş erişim kodunuz</p>
              <p className="mt-1 break-all font-mono text-[0.8125rem] text-ink">{result.guestAccessToken}</p>
              <p className="mt-2 text-[0.8125rem] text-umber">Bu kod yalnızca şimdi gösterilir; siparişinizi hesapsız görüntülemek için saklayın.</p>
            </div>
          )}
        </div>
        <div className="mt-8 flex flex-wrap gap-5 border-t border-hairline pt-5 text-[0.9rem]">
          {user && <TextLink href={`/hesabim?tab=siparisler&siparis=${result.order.number}`}>Siparişimi görüntüle</TextLink>}
          <TextLink href="/koleksiyon">Alışverişe devam et</TextLink>
        </div>
      </div>
    );
  }

  if (!authReady) return shell(<p className="text-umber">Yükleniyor…</p>);

  if (cart.length === 0) {
    return shell(
      <div className="max-w-[56ch]">
        <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] text-ink">Sepetiniz boş</h1>
        <p className="mt-3 text-umber">Ödeme adımına geçmek için sepete ürün ekleyin.</p>
        <Link href="/koleksiyon" className={`${primaryBtn} mt-6 max-w-[260px]`}>
          Koleksiyonu keşfet
        </Link>
      </div>
    );
  }

  const needsAccount = hasDigitalItems && !user;

  return shell(
    <>
      <div className="border-b border-hairline pb-7">
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.2rem)] leading-tight text-ink">Ödeme</h1>
        <p className="mt-2 text-[1rem] text-umber">Bilgilerinizi kontrol edin; siparişiniz oluşturulur ve ödeme adımı başlar.</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <form onSubmit={submit} className="space-y-8 lg:col-span-7">
          {needsAccount && (
            <FormMessage kind="error">
              Sepetinizde dijital ürün var; indirmeler hesabınıza bağlı olduğundan devam etmek için{" "}
              <TextLink href="/giris?next=/odeme">giriş yapın</TextLink> veya <TextLink href="/kayit?next=/odeme">hesap oluşturun</TextLink>.
            </FormMessage>
          )}

          <section className="space-y-5">
            <h2 className="border-b border-hairline pb-3 font-display text-[1.5rem] text-ink">İletişim</h2>
            {user ? (
              <p className="text-[0.9375rem] text-umber">
                Hesap: <span className="text-ink">{user.email}</span>
              </p>
            ) : (
              <Field label="E-posta" id="email">
                <input id="email" type="email" autoComplete="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            )}
            <Field label={hasPhysicalItems ? "Telefon" : "Telefon (isteğe bağlı)"} id="phone">
              <input id="phone" type="tel" autoComplete="tel" required={hasPhysicalItems && !user} className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
          </section>

          {hasPhysicalItems && (
            <section className="space-y-5">
              <h2 className="border-b border-hairline pb-3 font-display text-[1.5rem] text-ink">Teslimat adresi</h2>
              {user && saved.length > 0 && (
                <div className="space-y-2">
                  {saved.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-start gap-3 border border-hairline p-3.5 text-[0.9rem] text-ink has-[:checked]:border-cocoa">
                      <input type="radio" name="addr" className="mt-1" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                      <span>
                        <span className="font-medium">{a.label || a.fullName}</span>
                        <br />
                        <span className="text-umber">
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ""}, {a.district}/{a.city}
                        </span>
                      </span>
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-3 border border-hairline p-3.5 text-[0.9rem] text-ink has-[:checked]:border-cocoa">
                    <input type="radio" name="addr" checked={addressId === ""} onChange={() => setAddressId("")} />
                    Yeni adres gir
                  </label>
                </div>
              )}
              {(!user || addressId === "") && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Ad soyad" id="a-name">
                    <input id="a-name" required autoComplete="name" className={inputCls} value={addr.fullName} onChange={setA("fullName")} />
                  </Field>
                  <Field label="Telefon" id="a-phone">
                    <input id="a-phone" required autoComplete="tel" className={inputCls} value={addr.phone} onChange={setA("phone")} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Adres" id="a-line1">
                      <input id="a-line1" required autoComplete="address-line1" className={inputCls} value={addr.line1} onChange={setA("line1")} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Adres satırı 2 (isteğe bağlı)" id="a-line2">
                      <input id="a-line2" autoComplete="address-line2" className={inputCls} value={addr.line2} onChange={setA("line2")} />
                    </Field>
                  </div>
                  <Field label="İlçe" id="a-district">
                    <input id="a-district" required className={inputCls} value={addr.district} onChange={setA("district")} />
                  </Field>
                  <Field label="İl" id="a-city">
                    <input id="a-city" required autoComplete="address-level1" className={inputCls} value={addr.city} onChange={setA("city")} />
                  </Field>
                  <Field label="Posta kodu (isteğe bağlı)" id="a-zip">
                    <input id="a-zip" autoComplete="postal-code" className={inputCls} value={addr.postalCode} onChange={setA("postalCode")} />
                  </Field>
                </div>
              )}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="border-b border-hairline pb-3 font-display text-[1.5rem] text-ink">Sipariş notu</h2>
            <textarea
              aria-label="Sipariş notu"
              maxLength={500}
              rows={3}
              className="w-full border border-hairline bg-ivory p-3.5 text-[0.9375rem] text-ink outline-none transition-colors duration-200 focus:border-cocoa"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </section>

          {error && <FormMessage kind="error">{error}</FormMessage>}
          <button type="submit" disabled={busy || needsAccount || cartBlocking} className={primaryBtn}>
            {busy ? "Sipariş oluşturuluyor…" : "Siparişi oluştur"}
          </button>
          {cartBlocking && <p className="text-[0.8125rem] text-umber">Sepetinizdeki bazı ürünler için sorun var; lütfen sepeti kontrol edin.</p>}
        </form>

        <aside className="lg:col-span-5">
          <div className="border border-hairline bg-surface p-6 lg:sticky lg:top-[112px]">
            <h2 className="font-display text-[1.5rem] text-ink">Özet</h2>
            <ul className="mt-4 divide-y divide-hairline">
              {cart.map((i) => (
                <li key={i.key} className="flex justify-between gap-4 py-3 text-[0.9rem]">
                  <span className="text-ink">
                    {i.name}
                    {i.quantity > 1 ? ` × ${i.quantity}` : ""}
                  </span>
                  <span className="tabular-nums text-ink">{formatTRY(i.lineTotalKurus ?? 0)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-hairline pt-4 text-[0.9rem]">
              <div className="flex justify-between">
                <dt className="text-umber">Ara toplam</dt>
                <dd className="tabular-nums text-ink">{formatTRY(subtotalKurus)}</dd>
              </div>
              {discountKurus > 0 && (
                <div className="flex justify-between">
                  <dt className="text-umber">İndirim{couponCode ? ` (${couponCode})` : ""}</dt>
                  <dd className="tabular-nums text-ink">−{formatTRY(discountKurus)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-umber">Kargo</dt>
                <dd className="tabular-nums text-ink">{shippingKurus > 0 ? formatTRY(shippingKurus) : "Ücretsiz"}</dd>
              </div>
              <div className="flex justify-between border-t border-hairline pt-3 text-[1.05rem] font-medium">
                <dt className="text-ink">Toplam</dt>
                <dd className="tabular-nums text-ink">{formatTRY(totalKurus)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-[0.78rem] text-stone">Tutar sipariş anında sunucuda yeniden hesaplanır.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
