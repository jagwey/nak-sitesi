"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  Lock,
  Minus,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import type { Product } from "@/data/products";
import { apiFetch } from "@/lib/api";
import { formatTRY } from "@/lib/format";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/catalog/ProductCard";

export default function SepetPage() {
  const [recs, setRecs] = useState<Product[]>([]);
  useEffect(() => {
    apiFetch<{ items: Product[] }>("/api/products?pageSize=4&facets=false").then((r) => setRecs(r.items.slice(0, 4))).catch(() => setRecs([]));
  }, []);
  const {
    cart,
    removeFromCart,
    updateQuantity,
    couponCode,
    applyCoupon,
    removeCoupon,
    subtotalKurus,
    discountKurus,
    embroideryDiscountPercent,
    hasPhysicalItems,
    hasDigitalItems,
    shippingKurus,
    totalKurus,
    couponError,
    cartBlocking,
    checkoutOpen,
    cartLoading,
    freeShippingThresholdKurus,
    user,
  } = useStore();

  const [couponInput, setCouponInput] = useState("");
  const [couponFeedback, setCouponFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const digitalItems = cart.filter((i) => i.type === "digital");
  const physicalItems = cart.filter((i) => i.type === "physical");

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = await applyCoupon(couponInput);
    setCouponFeedback(res);
    if (res.ok) setCouponInput("");
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[124px] sm:px-6 lg:px-10">
        <div className="max-w-[56ch] border-b border-hairline pb-12">
          <h1 className="font-display text-[clamp(2.2rem,4vw,3.2rem)] leading-tight text-ink">
            Sepetiniz şu anda boş.
          </h1>
          <p className="mt-3 text-[1rem] text-umber">
            Dijital nakış dosyaları ve fiziksel işlemeli tekstil ürünleri aynı sepette bir arada sipariş edilebilir.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Link
              href="/koleksiyon?tur=dijital"
              className="inline-flex h-12 items-center bg-cocoa px-7 text-[0.9375rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
            >
              Dijital Desenleri İncele
            </Link>
            <Link
              href="/koleksiyon?tur=fiziksel"
              className="inline-flex h-12 items-center border border-cocoa px-7 text-[0.9375rem] font-medium text-cocoa transition-colors duration-200 hover:bg-cocoa hover:text-[#FAF8F3]"
            >
              Fiziksel Ürünleri Gör
            </Link>
          </div>
        </div>

        {recs.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-[1.85rem] text-ink">
            Atölyeden öneriler
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {recs.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      <div className="border-b border-hairline pb-7">
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.2rem)] leading-tight text-ink">
          Alışveriş Sepeti
        </h1>
        <p className="mt-2 text-[1rem] text-umber">
          {hasDigitalItems && hasPhysicalItems
            ? "Sepetinizde hem indirilebilir dijital nakış dosyaları hem de kargo ile teslim edilecek fiziksel ürünler bulunuyor."
            : hasDigitalItems
            ? "Sepetiniz yalnızca dijital nakış dosyalarından oluşuyor. Kargo ücreti ve teslimat adresi istenmez."
            : "Fiziksel ürünleriniz atölye kalite kontrolünün ardından sigortalı kargo ile gönderilir."}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Left: Cart Groups */}
        <div className="space-y-10 lg:col-span-7">
          {digitalItems.length > 0 && (
            <section aria-labelledby="sepet-dijital">
              <div className="mb-4 flex items-center gap-2.5 border-b border-hairline pb-3">
                <Download className="h-4 w-4 text-gold-text" strokeWidth={1.6} />
                <h2
                  id="sepet-dijital"
                  className="font-display text-[1.5rem] text-ink"
                >
                  Dijital Nakış Dosyaları ({digitalItems.length})
                </h2>
              </div>
              <ul className="divide-y divide-hairline">
                {digitalItems.map((item) => (
                  <li key={item.key} className="flex gap-5 py-5">
                    <Link
                      href={`/urun/${item.slug}`}
                      className="relative h-28 w-22 shrink-0 overflow-hidden bg-linen"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="88px"
                        className="object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/urun/${item.slug}`}
                            className="font-display text-[1.25rem] leading-snug text-ink hover:text-gold-text"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.key)}
                            aria-label={`${item.name} ürününü kaldır`}
                            className="p-1 text-stone hover:text-ink"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                          </button>
                        </div>
                        <p className="mt-1 text-[0.875rem] text-umber">
                          Seçili format: <strong className="font-medium text-ink">{item.selectedFormat}</strong> · Lisans: {item.selectedLicense}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[0.875rem] text-stone">
                          Dijital dosya · Kargo gerektirmez
                        </span>
                        <span className="tabular-nums text-[1rem] font-semibold text-ink">
                          {formatTRY(item.lineTotalKurus ?? item.unitPriceKurus)}
                        </span>
                      </div>
                    </div>
                    {item.issues && item.issues.length > 0 && (
                      <p role="alert" className="basis-full text-[0.875rem] text-umber">
                        {item.issues.join(" ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {physicalItems.length > 0 && (
            <section aria-labelledby="sepet-fiziksel">
              <div className="mb-4 flex items-center gap-2.5 border-b border-hairline pb-3">
                <Package className="h-4 w-4 text-gold-text" strokeWidth={1.6} />
                <h2
                  id="sepet-fiziksel"
                  className="font-display text-[1.5rem] text-ink"
                >
                  Fiziksel Tekstil Ürünleri ({physicalItems.length})
                </h2>
              </div>
              <ul className="divide-y divide-hairline">
                {physicalItems.map((item) => (
                  <li key={item.key} className="flex gap-5 py-5">
                    <Link
                      href={`/urun/${item.slug}`}
                      className="relative h-28 w-22 shrink-0 overflow-hidden bg-linen"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="88px"
                        className="object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/urun/${item.slug}`}
                            className="font-display text-[1.25rem] leading-snug text-ink hover:text-gold-text"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.key)}
                            aria-label={`${item.name} ürününü kaldır`}
                            className="p-1 text-stone hover:text-ink"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                          </button>
                        </div>
                        <p className="mt-1 text-[0.875rem] text-umber">
                          {[item.selectedColor, item.selectedSize]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {item.personalization?.text && (
                          <p className="mt-1 text-[0.875rem] text-gold-text">
                            Kişiselleştirme: &ldquo;{item.personalization.text}&rdquo; ·{" "}
                            {item.personalization.threadColorName}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="inline-flex items-center border border-hairline">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            aria-label="Adeti azalt"
                            className="flex h-9 w-9 items-center justify-center text-ink hover:bg-linen"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="tabular-nums w-9 text-center text-[0.875rem] text-ink">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            aria-label="Adeti artır"
                            className="flex h-9 w-9 items-center justify-center text-ink hover:bg-linen"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="tabular-nums text-[1rem] font-semibold text-ink">
                          {formatTRY(item.lineTotalKurus ?? item.unitPriceKurus * item.quantity)}
                        </span>
                      </div>
                    </div>
                    {item.issues && item.issues.length > 0 && (
                      <p role="alert" className="basis-full text-[0.875rem] text-umber">
                        {item.issues.join(" ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="border-t border-hairline pt-8">
            <h2 className="font-display text-[1.5rem] text-ink">Teslimat</h2>
            <p className="mt-3 max-w-[58ch] text-[0.875rem] text-umber">
              {!hasPhysicalItems
                ? "Yalnızca dijital ürün içerdiği için kargo adresi istenmez. Dijital dosyalar hesabınıza bağlı olarak teslim edilir; indirme için giriş yapmanız gerekir."
                : "Fiziksel ürünler için teslimat adresi ödeme adımında istenir."}
            </p>
          </section>
        </div>

        {/* Right: Order Summary & Coupon */}
        <aside className="lg:col-span-5">
          <div className="sticky top-[96px] border border-hairline bg-surface p-6 sm:p-8">
            <h2 className="font-display text-[1.65rem] text-ink">
              Sipariş Özeti
            </h2>

            {/* Coupon Code */}
            <form onSubmit={handleCouponSubmit} className="mt-5 flex gap-2">
              <label htmlFor="coupon-input" className="sr-only">
                İndirim kuponu kodu
              </label>
              <input
                id="coupon-input"
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Kupon kodu"
                className="h-11 flex-1 border border-hairline-strong bg-ivory px-3.5 text-[0.875rem] text-ink placeholder:text-stone focus:border-cocoa focus:outline-none"
              />
              <button
                type="submit"
                className="h-11 border border-cocoa px-5 text-[0.875rem] font-medium text-cocoa transition-colors duration-200 hover:bg-cocoa hover:text-[#FAF8F3]"
              >
                Uygula
              </button>
            </form>

            {couponFeedback && (
              <p
                className={`mt-2 text-[0.875rem] ${
                  couponFeedback.ok ? "text-gold-text" : "text-umber"
                }`}
              >
                {couponFeedback.message}
              </p>
            )}

            {couponError && !couponFeedback && <p className="mt-2 text-[0.875rem] text-umber">{couponError}</p>}

            {couponCode && (
              <div className="mt-3 flex items-center justify-between border border-hairline bg-linen/50 px-3 py-2 text-[0.875rem]">
                <span className="text-ink">
                  Aktif kupon: <strong>{couponCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    removeCoupon();
                    setCouponFeedback(null);
                  }}
                  className="text-umber underline hover:text-ink"
                >
                  Kaldır
                </button>
              </div>
            )}

            {/* Totals */}
            <dl className="mt-6 space-y-3 border-t border-hairline pt-5 text-[0.9375rem]">
              <div className="flex justify-between text-umber">
                <dt>Ara toplam</dt>
                <dd className="tabular-nums text-ink">
                  {formatTRY(subtotalKurus)}
                </dd>
              </div>
              {discountKurus > 0 && (
                <div className="flex justify-between text-gold-text">
                  <dt>{embroideryDiscountPercent ? "Desen indirimi (%" + embroideryDiscountPercent + ")" : "Kupon indirimi"}</dt>
                  <dd className="tabular-nums">-{formatTRY(discountKurus)}</dd>
                </div>
              )}
              <div className="flex justify-between text-umber">
                <dt>Teslimat / Kargo</dt>
                <dd className="tabular-nums text-ink">
                  {!hasPhysicalItems
                    ? "Dijital teslimat · 0,00 ₺"
                    : shippingKurus === 0
                    ? "Ücretsiz kargo"
                    : formatTRY(shippingKurus)}
                </dd>
              </div>
              {hasPhysicalItems && shippingKurus > 0 && (
                <p className="text-[0.875rem] text-stone">
                  {formatTRY(freeShippingThresholdKurus)} ve üzeri siparişlerde kargo ücretsizdir.
                </p>
              )}
              <div className="flex justify-between border-t border-hairline pt-4 text-[1.125rem] font-semibold text-ink">
                <dt>Genel Toplam</dt>
                <dd className="tabular-nums">{formatTRY(totalKurus)}</dd>
              </div>
            </dl>

            {!checkoutOpen ? (
              <p className="mt-6 border border-hairline-strong bg-linen/55 p-4 text-[0.875rem] text-ink">
                Online ödeme şu anda kapalı. Desenleri sepetinizde saklayabilirsiniz.
              </p>
            ) : cartBlocking ? (
              <p role="alert" className="mt-6 border border-hairline-strong bg-linen/55 p-4 text-[0.875rem] text-ink">
                Sepetinizde ilerlemenizi engelleyen bir ürün var. Lütfen yukarıdaki uyarıyı giderin.
              </p>
            ) : (
              <Link
                href={user || !hasDigitalItems ? "/odeme" : "/giris?next=/odeme"}
                aria-disabled={cartLoading}
                className="mt-6 flex h-13 w-full items-center justify-center gap-2 bg-cocoa text-[0.9375rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
              >
                <Lock className="h-4 w-4" strokeWidth={1.6} />
                Ödeme Adımına Geç
                <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
              </Link>
            )}
            {checkoutOpen && !user && hasDigitalItems && (
              <p className="mt-3 text-[0.8125rem] text-stone">Dijital ürünler için giriş yapmanız veya hesap oluşturmanız gerekir.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
