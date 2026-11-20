"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Download,
  Heart,
  Minus,
  Package,
  Plus,
  Truck,
  ShoppingBag,
} from "lucide-react";
import type {
  EmbroideryFormat,
  LicenseType,
  Product,
} from "@/data/products";
import { MACHINE_FORMAT_GUIDE } from "@/data/site-content";
import { calculateDiscountPercent, formatNumberTR, formatTRY } from "@/lib/format";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/catalog/ProductCard";
import {
  LiveMonogramPreview,
  THREAD_COLORS,
  type MonogramPreviewConfig,
} from "@/components/custom/LiveMonogramPreview";
import { FabricMockup } from "./FabricMockup";
import { ProductGallery } from "./ProductGallery";
import { DemoDataNote, ProductSpecs } from "./ProductSpecs";

interface ProductDetailClientProps {
  product: Product;
  similarProducts: Product[];
  flagOptions: boolean;
}

const NOT_LISTED = "__listede-yok__";
const MAX_QUANTITY = 20; // same cap the cart store enforces
const PERSONALIZATION_MAX = 18;
const COMING_SOON = "Bilgi yakında";

const fieldClass =
  "h-11 w-full border border-hairline-strong bg-surface px-3 text-[0.9375rem] text-ink focus:border-cocoa";

const orComingSoon = (value?: string) => (value && value.trim() ? value : COMING_SOON);

function DetailAccordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-[1rem] font-medium text-ink"
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-umber transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={1.6}
        />
      </button>
      {open && (
        <div className="pb-5 text-[0.9375rem] leading-relaxed text-umber">{children}</div>
      )}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] gap-x-4 py-2.5 sm:grid-cols-[minmax(0,8rem)_minmax(0,1fr)]">
      <dt className="text-umber">{label}</dt>
      <dd className="break-words text-ink">{children}</dd>
    </div>
  );
}

export function ProductDetailClient({
  product,
  similarProducts,
  flagOptions,
}: ProductDetailClientProps) {
  const { checkoutOpen, addToCart, cart, isFavorite, toggleFavorite } = useStore();
  const shopierUrl = product.shopierUrl;
  const showCartAction = (checkoutOpen || product.isDemo) && !shopierUrl;
  const fav = isFavorite(product.id);

  // Digital state
  const [selectedFormat, setSelectedFormat] = useState<EmbroideryFormat>(
    product.embroidery?.formats[0] ?? "VP3"
  );
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>("Kişisel Kullanım");
  const [helperMachine, setHelperMachine] = useState<string>(
    product.embroidery?.supportedMachines[0] ?? NOT_LISTED
  );

  // Physical state
  const [selectedColor, setSelectedColor] = useState(product.physical?.colors[0]?.name ?? "");
  const [selectedSize, setSelectedSize] = useState(product.physical?.sizes[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [addPersonalization, setAddPersonalization] = useState(
    product.type === "physical" &&
      product.personalizable &&
      product.physical?.personalizationPriceKurus === 0
  );
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customFont, setCustomFont] = useState<MonogramPreviewConfig["fontStyle"]>("serif");
  const [customThreadIdx, setCustomThreadIdx] = useState(0);
  const [customMotif, setCustomMotif] = useState<MonogramPreviewConfig["motif"]>("laurel");

  // Cart feedback: brief "added" state so the button never looks inert.
  const [justAdded, setJustAdded] = useState(false);
  const ctaAnchorRef = useRef<HTMLDivElement>(null);
  const [showDesktopBar, setShowDesktopBar] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  const activeThread = THREAD_COLORS[customThreadIdx];

  // Unit price in integer kuruş
  let unitPriceKurus = product.priceKurus;
  if (product.type === "digital" && product.embroidery && selectedLicense === "Küçük İşletme") {
    unitPriceKurus += product.embroidery.commercialPriceDeltaKurus;
  }
  if (
    product.type === "physical" &&
    addPersonalization &&
    product.physical?.personalizationPriceKurus
  ) {
    unitPriceKurus += product.physical.personalizationPriceKurus;
  }
  const qty = product.type === "physical" ? quantity : 1;
  const totalKurus = unitPriceKurus * qty;

  const discountPercent = product.compareAtPriceKurus
    ? calculateDiscountPercent(product.compareAtPriceKurus, product.priceKurus)
    : 0;

  // Machine helper — derived only from product data + the site's brand/format guide.
  const helperListed = helperMachine !== NOT_LISTED;
  const guideFormats = helperListed ? MACHINE_FORMAT_GUIDE[helperMachine]?.formats ?? [] : [];
  const matchingFormats = product.embroidery
    ? guideFormats.filter((f) => product.embroidery!.formats.includes(f as EmbroideryFormat))
    : [];

  const personalizationIncomplete =
    product.type === "physical" &&
    product.personalizable &&
    addPersonalization &&
    !customText.trim();
  const outOfStock = product.type === "physical" && product.physical?.inStock === false;

  const alreadyInCart =
    product.type === "digital" &&
    cart.some(
      (i) =>
        i.productId === product.id &&
        i.selectedFormat === selectedFormat &&
        i.selectedLicense === selectedLicense
    );

  const disabled = personalizationIncomplete || outOfStock || alreadyInCart || justAdded;

  const handleAddToCart = async () => {
    if (disabled) return;
    let ok = false;
    if (product.type === "digital") {
      ok = await addToCart({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        type: "digital",
        image: product.images[0].url,
        unitPriceKurus,
        quantity: 1,
        selectedFormat,
        selectedLicense,
      });
    } else {
      ok = await addToCart({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        type: "physical",
        image: product.images[0].url,
        unitPriceKurus,
        quantity,
        selectedColor,
        selectedSize,
        personalization:
          addPersonalization && customText.trim()
            ? {
                text: customText.trim(),
                fontStyle: customFont,
                threadColorName: activeThread.name,
                threadColorHex: activeThread.hex,
                motif: customMotif,
              }
            : undefined,
      });
    }
    if (!ok) return;
    setJustAdded(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setJustAdded(false), 1800);
  };

  const ctaLabel = outOfStock
    ? "Şu an stokta yok"
    : justAdded
    ? "Sepete eklendi"
    : alreadyInCart
    ? "Sepette"
    : "Sepete Ekle";

  const ctaIcon =
    justAdded || alreadyInCart ? (
      <Check className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
    ) : (
      <ShoppingBag className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
    );

  const ctaClass =
    "btn-buy flex items-center justify-center gap-2.5 px-5 text-[1.0625rem] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-hairline-strong disabled:text-ink";

  const favoriteButton = (
    <button
      type="button"
      onClick={() => toggleFavorite(product.id)}
      aria-label={fav ? "Favorilerden çıkar" : "Favorilere ekle"}
      aria-pressed={fav}
      className="flex h-13 w-13 shrink-0 items-center justify-center border border-hairline-strong bg-surface text-ink transition-colors duration-200 hover:border-cocoa"
    >
      <Heart className={`h-5 w-5 ${fav ? "fill-cocoa text-cocoa" : ""}`} strokeWidth={1.6} />
    </button>
  );

  useEffect(() => {
    const node = ctaAnchorRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowDesktopBar(!entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shopierUrl, showCartAction]);

  const physicalStockLine = product.physical
    ? product.physical.inStock
      ? orComingSoon(product.physical.stockNote)
      : "Şu an stokta yok"
    : COMING_SOON;

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-[96px] sm:px-6 lg:px-10 lg:pb-24">
      {/* Breadcrumb */}
      <nav
        aria-label="Sayfa yolu"
        className="mb-3 flex flex-wrap items-center gap-x-2 text-[0.875rem] text-umber"
      >
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-ink">
          Ana Sayfa
        </Link>
        <span aria-hidden="true" className="text-stone">/</span>
        <Link
          href={`/koleksiyon?kategori=${product.categorySlug}`}
          className="inline-flex min-h-11 items-center hover:text-ink"
        >
          {product.categoryName}
        </Link>
        <span aria-hidden="true" className="text-stone">/</span>
        <span aria-current="page" className="min-w-0 break-words text-ink">
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-7">
          <ProductGallery images={product.images} productName={product.name} />
          {product.images[0] && (
            <FabricMockup
              imageUrl={product.images[0].url}
              imageAlt={product.images[0].alt || product.name}
              initialWidthMm={product.embroidery?.widthMm || 80}
              initialHeightMm={product.embroidery?.heightMm || 80}
            />
          )}
        </div>

        <div className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-[92px]">
            <h1 className="font-display text-[clamp(1.9rem,3.1vw,2.6rem)] leading-[1.06] text-ink">
              {product.name}
            </h1>

            <p className="mt-1.5 text-[0.875rem] font-medium text-gold-text">
              {product.type === "digital"
                ? "Dijital makine nakışı dosyası"
                : "Fiziksel atölye ürünü"}
            </p>

            <p className="mt-2 text-[0.9375rem] leading-relaxed text-umber">
              {product.subtitle}
            </p>

            {/* Price */}
            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="tabular-nums text-[1.4rem] font-semibold text-ink">
                {formatTRY(unitPriceKurus)}
              </span>
              {product.compareAtPriceKurus &&
                discountPercent > 0 &&
                selectedLicense === "Kişisel Kullanım" && (
                  <>
                    <span className="tabular-nums text-[0.9375rem] text-stone line-through">
                      {formatTRY(product.compareAtPriceKurus)}
                    </span>
                    <span className="badge-sale tabular-nums text-[1rem]">
                      %{discountPercent} indirim
                    </span>
                  </>
                )}
              {product.isDemo && <span className="text-[0.875rem] text-stone">(Demo fiyat)</span>}
            </div>

            {shopierUrl && (
              <div className="mt-4" ref={ctaAnchorRef}>
                <div className="flex gap-3">
                  <a href={shopierUrl} className={`${ctaClass} h-13 min-w-0 flex-1`}>
                    <ShoppingBag className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} aria-hidden="true" />
                    Shopier’den Satın Al
                  </a>
                  {favoriteButton}
                </div>
                <p className="mt-2 text-[0.875rem] text-umber">
                  {product.type === "digital"
                    ? "Ödeme ve dijital teslimat Shopier üzerinden yapılır."
                    : "Ödemenizi Shopier üzerinden tamamlayabilirsiniz."}
                </p>
              </div>
            )}

            {/* DIGITAL: what you get + controls */}
            {product.type === "digital" && product.embroidery && (
              <div className="mt-4 space-y-5">
                <section
                  aria-labelledby="ne-aliyorsunuz"
                  className="border-y border-hairline py-4"
                >
                  <h2 id="ne-aliyorsunuz" className="text-[1rem] font-semibold text-ink">
                    Ne alıyorsunuz?
                  </h2>
                  <p className="mt-1.5 text-[0.9375rem] font-medium text-ink">
                    Dijital nakış dosyası — fiziksel ürün gönderilmez.
                  </p>
                  {!shopierUrl && <p className="mt-1 flex items-start gap-2 text-[0.875rem] leading-snug text-umber">
                    <Download className="mt-0.5 h-4 w-4 shrink-0 text-gold-text" strokeWidth={1.6} />
                    <span>
                      {checkoutOpen
                        ? "Ödeme sonrası dosyanızı hesabınızdan indirebilirsiniz."
                        : "Bu desen satışa hazırlanıyor."}
                    </span>
                  </p>}

                  {showCartAction ? <div className="mt-4">
                    <p
                      id="format-label"
                      className="text-[0.875rem] font-medium text-ink"
                    >
                      Dosya formatı:{" "}
                      <span className="text-gold-text">{selectedFormat}</span>
                    </p>
                    <div
                      role="radiogroup"
                      aria-labelledby="format-label"
                      className="mt-2 flex flex-wrap gap-2"
                    >
                      {product.embroidery.formats.map((fmt) => {
                        const active = selectedFormat === fmt;
                        return (
                          <button
                            key={fmt}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setSelectedFormat(fmt)}
                            className={`min-h-11 min-w-14 border px-3.5 text-[0.875rem] font-medium transition-colors duration-200 ${
                              active
                                ? "border-cocoa bg-cocoa text-[#FAF8F3]"
                                : "border-hairline-strong bg-surface text-ink hover:border-cocoa"
                            }`}
                          >
                            {fmt}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[0.8125rem] text-umber">
                      Üründe bulunan formatlar listelenmiştir; seçiminiz sepete eklenir.
                    </p>
                  </div> : (
                    <p className="mt-4 text-[0.875rem] font-medium text-ink">
                      Dosya formatları: <span className="text-gold-text">{product.embroidery.formats.join(", ")}</span>
                    </p>
                  )}

                  <dl className="mt-3 divide-y divide-hairline border-t border-hairline text-[0.875rem]">
                    <InfoRow label="Makineler">
                      {product.embroidery.supportedMachines.join(", ")}
                    </InfoRow>
                    <InfoRow label="Kasnak ve ölçü">
                      <span className="tabular-nums">
                        {product.embroidery.hoopSize} · {product.embroidery.widthMm} ×{" "}
                        {product.embroidery.heightMm} mm
                      </span>
                    </InfoRow>
                    <InfoRow label="Dikiş sayısı">
                      <span className="tabular-nums">
                        {formatNumberTR(product.embroidery.stitchCount)}
                      </span>
                    </InfoRow>
                    <InfoRow label="Renk sayısı">
                      <span className="tabular-nums">{product.embroidery.colorCount}</span>
                    </InfoRow>
                  </dl>
                  <DemoDataNote className="mt-2" isDemo={product.isDemo} />
                </section>

                {/* Machine helper */}
                <div className="bg-linen/50 p-4">
                  <label
                    htmlFor="machine-compat-select"
                    className="block text-[0.9375rem] font-medium text-ink"
                  >
                    Makinem uyumlu mu?
                  </label>
                  <select
                    id="machine-compat-select"
                    value={helperMachine}
                    onChange={(e) => {
                      const brand = e.target.value;
                      setHelperMachine(brand);
                      const match = MACHINE_FORMAT_GUIDE[brand]?.formats.find((f) =>
                        product.embroidery?.formats.includes(f as EmbroideryFormat)
                      );
                      if (match) setSelectedFormat(match as EmbroideryFormat);
                    }}
                    className={`mt-2 ${fieldClass}`}
                  >
                    {product.embroidery.supportedMachines.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                    <option value={NOT_LISTED}>Listede yok</option>
                  </select>
                  <p aria-live="polite" className="mt-2.5 text-[0.875rem] leading-snug text-umber">
                    {helperListed ? (
                      matchingFormats.length > 0 ? (
                        <>
                          {helperMachine} bu ürünün makine listesinde. Bu üründe{" "}
                          <strong className="font-medium text-ink">
                            {matchingFormats.join(", ")}
                          </strong>{" "}
                          formatı bulunur. Satın almadan önce makinenizin okuduğu formatı
                          kontrol edin.
                        </>
                      ) : (
                        <>
                          {helperMachine} bu ürünün makine listesinde. Makinenizin okuduğu
                          formatın yukarıdaki format listesinde olduğunu kontrol edin.
                        </>
                      )
                    ) : (
                      <>
                        Makineniz listede yok. Makinenizin okuduğu dosya formatını kullanım
                        kılavuzundan öğrenin ve yukarıdaki format listesinde olup olmadığına
                        bakın. Listede yoksa uyum garanti edilemez.
                      </>
                    )}
                  </p>
                </div>

                {/* License */}
                {showCartAction && <fieldset>
                  <legend className="mb-2 text-[0.875rem] font-medium text-ink">
                    Kullanım lisansı
                  </legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {product.embroidery.licenses.map((lic) => {
                      const active = selectedLicense === lic;
                      const delta =
                        lic === "Küçük İşletme"
                          ? product.embroidery!.commercialPriceDeltaKurus
                          : 0;
                      return (
                        <label
                          key={lic}
                          className={`flex min-h-11 cursor-pointer items-start gap-2.5 border p-3 transition-colors duration-200 focus-within:outline focus-within:outline-2 focus-within:outline-gold ${
                            active
                              ? "border-cocoa bg-surface"
                              : "border-hairline hover:border-hairline-strong"
                          }`}
                        >
                          <input
                            type="radio"
                            name="license"
                            checked={active}
                            onChange={() => setSelectedLicense(lic)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#4A372C]"
                          />
                          <span className="text-[0.875rem] leading-snug">
                            <span className="block font-medium text-ink">{lic}</span>
                            <span className="tabular-nums text-umber">
                              {delta > 0
                                ? `+${formatTRY(delta)} (ticari satış)`
                                : "Fiyata dahil (kişisel projeler)"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>}
              </div>
            )}

            {/* PHYSICAL controls */}
            {product.type === "physical" && product.physical && (
              <div className="mt-4 space-y-5">
                <section
                  aria-label="Ürün durumu"
                  className="border-y border-hairline"
                >
                  <dl className="divide-y divide-hairline text-[0.875rem]">
                    <InfoRow label="Stok">
                      <span className={product.physical.inStock ? "text-ink" : "font-medium text-ink"}>
                        {physicalStockLine}
                      </span>
                    </InfoRow>
                    <InfoRow label="Hazırlık">
                      {orComingSoon(product.physical.productionTime)}
                    </InfoRow>
                    <InfoRow label="Teslimat">
                      <span className="flex items-start gap-2">
                        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-gold-text" strokeWidth={1.6} />
                        <span>
                          Kargo ile gönderilir. {orComingSoon(product.physical.shippingEstimate)}
                        </span>
                      </span>
                    </InfoRow>
                  </dl>
                </section>

                {/* Color */}
                {product.physical.colors.length > 0 && (
                  <fieldset>
                    <legend className="text-[0.875rem] font-medium text-ink">
                      Kumaş rengi:{" "}
                      <span className="font-normal text-umber">{selectedColor}</span>
                    </legend>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {product.physical.colors.map((color) => {
                        const active = selectedColor === color.name;
                        return (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setSelectedColor(color.name)}
                            aria-label={color.name}
                            aria-pressed={active}
                            className="flex h-11 w-11 items-center justify-center"
                          >
                            <span
                              className={`block h-8 w-8 rounded-full border ${
                                active
                                  ? "border-cocoa ring-2 ring-gold ring-offset-2 ring-offset-ivory"
                                  : "border-hairline-strong"
                              }`}
                              style={{ backgroundColor: color.hex }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* Size */}
                {product.physical.sizes.length > 0 && (
                  <div>
                    <p id="size-label" className="mb-2 text-[0.875rem] font-medium text-ink">
                      Ölçü / set seçeneği
                    </p>
                    <div
                      role="radiogroup"
                      aria-labelledby="size-label"
                      className="flex flex-wrap gap-2"
                    >
                      {product.physical.sizes.map((size) => {
                        const active = selectedSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setSelectedSize(size)}
                            className={`min-h-11 border px-3.5 py-2 text-left text-[0.875rem] leading-tight transition-colors duration-200 ${
                              active
                                ? "border-cocoa bg-cocoa font-medium text-[#FAF8F3]"
                                : "border-hairline-strong bg-surface text-ink hover:border-cocoa"
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p id="qty-label" className="text-[0.875rem] font-medium text-ink">
                    Adet
                  </p>
                  <div
                    role="group"
                    aria-labelledby="qty-label"
                    className="flex items-center border border-hairline-strong bg-surface"
                  >
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label="Adedi azalt"
                      className="flex h-11 w-11 items-center justify-center text-ink hover:bg-linen/70 disabled:text-stone disabled:hover:bg-transparent"
                    >
                      <Minus className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                    <output
                      aria-live="polite"
                      className="tabular-nums flex h-11 min-w-12 items-center justify-center border-x border-hairline px-2 text-[0.9375rem] font-medium text-ink"
                    >
                      {quantity}
                    </output>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                      disabled={quantity >= MAX_QUANTITY}
                      aria-label="Adedi artır"
                      className="flex h-11 w-11 items-center justify-center text-ink hover:bg-linen/70 disabled:text-stone disabled:hover:bg-transparent"
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </div>
                </div>

                {/* Personalisation */}
                {product.personalizable && (
                  <div className="bg-linen/50 p-4">
                    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                      <span className="text-[0.9375rem] font-medium text-ink">
                        İsim veya monogram nakışı ekle
                      </span>
                      <span className="flex shrink-0 items-center gap-2.5">
                        <span className="tabular-nums text-[0.875rem] text-gold-text">
                          {product.physical.personalizationPriceKurus === undefined
                            ? COMING_SOON
                            : product.physical.personalizationPriceKurus > 0
                            ? `+${formatTRY(product.physical.personalizationPriceKurus)}`
                            : "Fiyata dahil"}
                        </span>
                        <input
                          type="checkbox"
                          checked={addPersonalization}
                          onChange={(e) => setAddPersonalization(e.target.checked)}
                          className="h-5 w-5 accent-[#4A372C]"
                        />
                      </span>
                    </label>

                    {addPersonalization && (
                      <div className="mt-3 space-y-4 border-t border-hairline pt-4">
                        <div>
                          <div className="flex items-baseline justify-between gap-3">
                            <label
                              htmlFor="pdp-custom-text"
                              className="text-[0.875rem] font-medium text-ink"
                            >
                              İşlenecek baş harf veya isim
                            </label>
                            <span
                              aria-live="polite"
                              className={`tabular-nums text-[0.8125rem] ${
                                customText.length >= PERSONALIZATION_MAX
                                  ? "font-medium text-ink"
                                  : "text-umber"
                              }`}
                            >
                              {customText.length}/{PERSONALIZATION_MAX}
                            </span>
                          </div>
                          <input
                            id="pdp-custom-text"
                            type="text"
                            maxLength={PERSONALIZATION_MAX}
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            placeholder="Örn: E veya Defne"
                            aria-describedby="pdp-custom-hint"
                            className={`mt-1.5 ${fieldClass}`}
                          />
                          <p id="pdp-custom-hint" className="mt-1.5 text-[0.8125rem] text-umber">
                            En çok {PERSONALIZATION_MAX} karakter.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 min-[400px]:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-[0.8125rem] font-medium text-ink">
                              Yazı tipi
                            </span>
                            <select
                              value={customFont}
                              onChange={(e) =>
                                setCustomFont(e.target.value as MonogramPreviewConfig["fontStyle"])
                              }
                              className={fieldClass}
                            >
                              <option value="serif">Klasik</option>
                              <option value="italic">İtalik</option>
                              <option value="modern">Modern</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[0.8125rem] font-medium text-ink">
                              Çerçeve motifi
                            </span>
                            <select
                              value={customMotif}
                              onChange={(e) =>
                                setCustomMotif(e.target.value as MonogramPreviewConfig["motif"])
                              }
                              className={fieldClass}
                            >
                              <option value="laurel">Çelenk</option>
                              <option value="crown">Arma</option>
                              <option value="minimal">Sade</option>
                            </select>
                          </label>
                        </div>

                        <div>
                          <p className="text-[0.8125rem] font-medium text-ink">
                            İplik rengi:{" "}
                            <span className="font-normal text-umber">{activeThread.name}</span>
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-0.5">
                            {THREAD_COLORS.map((c, idx) => (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => {
                                  setCustomThreadIdx(idx);
                                  setShowLivePreview(true);
                                }}
                                aria-label={c.name}
                                aria-pressed={customThreadIdx === idx}
                                className="flex h-11 w-11 items-center justify-center"
                              >
                                <span
                                  className={`block h-7 w-7 rounded-full border ${
                                    customThreadIdx === idx
                                      ? "border-cocoa ring-2 ring-gold ring-offset-1"
                                      : "border-hairline-strong"
                                  }`}
                                  style={{ backgroundColor: c.hex }}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowLivePreview((v) => !v)}
                          aria-expanded={showLivePreview}
                          className="inline-flex min-h-11 items-center text-[0.875rem] font-medium text-gold-text underline underline-offset-4 hover:text-cocoa"
                        >
                          {showLivePreview ? "Önizlemeyi gizle" : "Canlı önizlemeyi aç"}
                        </button>

                        {showLivePreview && (
                          <LiveMonogramPreview
                            compact
                            config={{
                              text: customText || "E",
                              fontStyle: customFont,
                              threadColorHex: activeThread.hex,
                              threadColorName: activeThread.name,
                              surface: product.physical.surfaceType ?? "linen",
                              motif: customMotif,
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Primary CTA + favourite */}
            {!shopierUrl && <div className="mt-5 flex gap-3" ref={ctaAnchorRef}>
              {showCartAction && <button
                type="button"
                onClick={handleAddToCart}
                disabled={disabled}
                aria-disabled={disabled}
                className={`${ctaClass} h-13 min-w-0 flex-1`}
              >
                {ctaIcon}
                <span className="truncate">
                  {ctaLabel}
                  {!outOfStock && !alreadyInCart && !justAdded && (
                    <span className="tabular-nums hidden min-[380px]:inline"> · {formatTRY(totalKurus)}</span>
                  )}
                </span>
              </button>}
              {favoriteButton}
            </div>}
            <p role="status" className="sr-only">
              {justAdded ? "Ürün sepete eklendi." : ""}
            </p>
            {showCartAction && personalizationIncomplete && (
              <p className="mt-2 text-[0.8125rem] text-umber">
                Sepete eklemek için isim/baş harf girin ya da kişiselleştirmeyi kapatın.
              </p>
            )}
            {product.type === "physical" && (
              <p className="mt-3 flex items-center gap-2 text-[0.875rem] text-umber">
                <Package className="h-4 w-4 shrink-0 text-gold-text" strokeWidth={1.6} />
                Kargo ile gönderilir; ödeme ve kargo adımları sonraki aşamada açılacaktır.
              </p>
            )}

            {/* Accordions */}
            <div className="mt-6 border-b border-hairline">
              <DetailAccordion title="Ürün açıklaması" defaultOpen>
                <p>{product.description}</p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5">
                  {product.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </DetailAccordion>

              {product.type === "digital" && product.embroidery ? (
                <>
                  <DetailAccordion title="Kullanım ve tela talimatları">
                    <ul className="list-disc space-y-1.5 pl-5">
                      {product.embroidery.usageInstructions.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </DetailAccordion>
                  <DetailAccordion title="Lisans ve indirme koşulları">
                    <p>{product.embroidery.downloadTerms}</p>
                    <p className="mt-2">
                      Detaylı kapsam için{" "}
                      <Link
                        href="/bilgi/dijital-indirme-kosullari"
                        className="font-medium text-cocoa underline underline-offset-4"
                      >
                        Dijital İndirme ve Lisans Koşulları
                      </Link>{" "}
                      sayfasını inceleyebilirsiniz.
                    </p>
                  </DetailAccordion>
                </>
              ) : (
                product.physical && (
                  <>
                    <DetailAccordion title="Malzeme ve bakım talimatları">
                      <p className="font-medium text-ink">{orComingSoon(product.physical.material)}</p>
                      <ul className="mt-3 list-disc space-y-1.5 pl-5">
                        {product.physical.careInstructions.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    </DetailAccordion>
                    <DetailAccordion title="Üretim ve kargo bilgisi">
                      <p>{orComingSoon(product.physical.productionTime)}.</p>
                      <p className="mt-1.5">{orComingSoon(product.physical.shippingEstimate)}.</p>
                    </DetailAccordion>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {product.type === "digital" && product.embroidery && (
        <ProductSpecs embroidery={product.embroidery} isDemo={product.isDemo} />
      )}

      {similarProducts.length > 0 && (
        <section
          aria-labelledby="benzer-urunler-baslik"
          className="mt-16 border-t border-hairline pt-12 lg:mt-20 lg:pt-14"
        >
          <div className="flex flex-wrap items-end justify-between gap-x-4">
            <h2
              id="benzer-urunler-baslik"
              className="font-display text-[clamp(1.75rem,2.6vw,2.35rem)] leading-tight text-ink"
            >
              {flagOptions ? "Diğer bayrak desenleri" : "Benzer desenler ve parçalar"}
            </h2>
            <Link
              href={flagOptions ? "/#bayrak-desenleri" : "/koleksiyon"}
              prefetch={false}
              className="inline-flex min-h-11 items-center text-[0.9375rem] font-medium text-cocoa underline-offset-4 hover:text-gold-text hover:underline"
            >
              Tümünü gör
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {similarProducts.map((item) => (
              <ProductCard key={item.id} product={item} fullImage={flagOptions} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile sticky add-to-cart bar */}
      {(shopierUrl || showCartAction) && <div className={`fixed inset-x-0 bottom-0 z-30 items-center justify-between gap-3 border-t border-cocoa bg-ivory/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(36,35,32,0.08)] backdrop-blur-md ${showDesktopBar ? "flex" : "flex lg:hidden"}`}>
        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] text-umber">{product.name}</p>
          <p className="tabular-nums text-[1rem] font-semibold text-ink">
            {formatTRY(totalKurus)}
          </p>
        </div>
        {shopierUrl ? (
          <a href={shopierUrl} className={`${ctaClass} h-11 shrink-0 px-4 text-[0.875rem]`}>
            Shopier’den Satın Al
          </a>
        ) : <button
          type="button"
          onClick={handleAddToCart}
          disabled={disabled}
          aria-disabled={disabled}
          className={`${ctaClass} h-11 shrink-0 px-4 text-[0.875rem]`}
        >
          {ctaIcon}
          {ctaLabel}
        </button>}
      </div>}
    </div>
  );
}
