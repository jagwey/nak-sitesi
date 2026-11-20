"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { formatTRY } from "@/lib/format";
import { useStore } from "@/lib/store";

export function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    removeFromCart,
    updateQuantity,
    subtotalKurus,
    discountKurus,
    embroideryDiscountPercent,
    hasPhysicalItems,
    hasDigitalItems,
    shippingKurus,
    totalKurus,
    freeShippingThresholdKurus,
  } = useStore();

  useEffect(() => {
    if (!cartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;

  const remainingForFreeShipping = Math.max(
    0,
    freeShippingThresholdKurus - (subtotalKurus - discountKurus)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/35 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Alışveriş sepeti"
      onClick={(e) => {
        if (e.target === e.currentTarget) setCartOpen(false);
      }}
    >
      <div className="flex h-full w-full max-w-[460px] flex-col bg-ivory">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
          <h2 className="font-display text-[1.65rem] leading-none text-ink">
            Sepetiniz
          </h2>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Sepeti kapat"
            className="flex h-10 w-10 items-center justify-center text-ink transition-colors duration-200 hover:text-gold-text"
          >
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>

        {/* Shipping / Digital Delivery Context */}
        {cart.length > 0 && (
          <div className="border-b border-hairline bg-linen/60 px-6 py-3 text-[0.875rem] text-umber">
            {!hasPhysicalItems && hasDigitalItems ? (
              <span>
                Sepetiniz yalnızca dijital nakış dosyalarından oluşuyor. Kargo ücreti ve teslimat adresi gerekmez.
              </span>
            ) : remainingForFreeShipping > 0 ? (
              <span>
                Ücretsiz kargo için{" "}
                <strong className="tabular-nums font-semibold text-ink">
                  {formatTRY(remainingForFreeShipping)}
                </strong>{" "}
                değerinde fiziksel veya dijital ürün ekleyebilirsiniz.
              </span>
            ) : (
              <span className="font-medium text-ink">
                Siparişiniz ücretsiz sigortalı kargo kapsamındadır.
              </span>
            )}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-start justify-center py-12">
              <p className="font-display text-[1.65rem] text-ink">
                Sepetiniz şu anda boş.
              </p>
              <p className="mt-2 max-w-[34ch] text-[0.9375rem] text-umber">
                Dijital nakış desenlerini ve atölyede hazırlanan keten tekstilleri inceleyerek başlayabilirsiniz.
              </p>
              <Link
                href="/koleksiyon"
                onClick={() => setCartOpen(false)}
                className="mt-6 inline-flex h-11 items-center bg-cocoa px-6 text-[0.875rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
              >
                Koleksiyonu Keşfet
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {cart.map((item) => (
                <li key={item.key} className="flex gap-4 py-5 first:pt-0">
                  <Link
                    href={`/urun/${item.slug}`}
                    onClick={() => setCartOpen(false)}
                    className="relative h-24 w-[76px] shrink-0 overflow-hidden bg-linen"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="76px"
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/urun/${item.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="font-display text-[1.15rem] leading-snug text-ink transition-colors duration-200 hover:text-gold-text"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.key)}
                          aria-label={`${item.name} ürününü sepetten çıkar`}
                          className="p-1 text-stone transition-colors duration-200 hover:text-ink"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                        </button>
                      </div>

                      <p className="mt-1 text-[0.875rem] text-umber">
                        {item.type === "digital"
                          ? `Dijital dosya · ${item.selectedFormat ?? "VP3"} · ${
                              item.selectedLicense ?? "Kişisel Kullanım"
                            }`
                          : [item.selectedColor, item.selectedSize]
                              .filter(Boolean)
                              .join(" · ")}
                      </p>

                      {item.personalization?.text && (
                        <p className="mt-1 text-[0.875rem] text-gold-text">
                          Kişiselleştirme: &ldquo;{item.personalization.text}&rdquo; (
                          {item.personalization.threadColorName})
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {item.type === "physical" ? (
                        <div className="inline-flex items-center border border-hairline">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            aria-label="Adeti azalt"
                            className="flex h-8 w-8 items-center justify-center text-ink transition-colors duration-200 hover:bg-linen"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="tabular-nums w-8 text-center text-[0.875rem] text-ink">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            aria-label="Adeti artır"
                            className="flex h-8 w-8 items-center justify-center text-ink transition-colors duration-200 hover:bg-linen"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[0.875rem] text-stone">
                          Dijital dosya · indirilir
                        </span>
                      )}

                      <span className="tabular-nums text-[0.9375rem] font-medium text-ink">
                        {formatTRY(item.lineTotalKurus ?? item.unitPriceKurus * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer Summary */}
        {cart.length > 0 && (
          <div className="border-t border-hairline bg-surface px-6 py-5">
            <div className="space-y-2 text-[0.875rem]">
              <div className="flex justify-between text-umber">
                <span>Ara toplam</span>
                <span className="tabular-nums text-ink">
                  {formatTRY(subtotalKurus)}
                </span>
              </div>
              {discountKurus > 0 && (
                <div className="flex justify-between text-gold-text">
                  <span>{embroideryDiscountPercent ? "Desen indirimi (%" + embroideryDiscountPercent + ")" : "Kupon indirimi"}</span>
                  <span className="tabular-nums">-{formatTRY(discountKurus)}</span>
                </div>
              )}
              <div className="flex justify-between text-umber">
                <span>Teslimat</span>
                <span className="tabular-nums text-ink">
                  {!hasPhysicalItems
                    ? "Dijital · 0,00 ₺"
                    : shippingKurus === 0
                    ? "Ücretsiz"
                    : formatTRY(shippingKurus)}
                </span>
              </div>
              <div className="flex justify-between border-t border-hairline pt-2.5 text-[1rem] font-semibold text-ink">
                <span>Toplam</span>
                <span className="tabular-nums">{formatTRY(totalKurus)}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <Link
                href="/sepet"
                onClick={() => setCartOpen(false)}
                className="flex h-12 w-full items-center justify-center bg-cocoa text-[0.9375rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
              >
                Sepete Git ve Özeti İncele
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
