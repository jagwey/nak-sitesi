"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Upload, X } from "lucide-react";
import { ALL_FORMATS, ALL_MACHINES } from "@/data/products";
import {
  LiveMonogramPreview,
  SURFACE_OPTIONS,
  THREAD_COLORS,
  type MonogramPreviewConfig,
} from "./LiveMonogramPreview";

const ORDER_STAGES = [
  "Talep alındı",
  "İnceleniyor",
  "Teklif gönderildi",
  "Onay bekleniyor",
  "Tasarlanıyor",
  "Üretimde",
  "Tamamlandı",
];

const MAX_REF_FILES = 5;
const MAX_REF_BYTES = 8 * 1024 * 1024;

type OrderType =
  | "İsim ve Monogram İşleme"
  | "Özel Dijital Nakış Dosyası"
  | "Kurumsal Logo Nakışı"
  | "İsteğe özel parça";

type PreviewItem = { name: string; url: string };

function revokeAll(items: PreviewItem[]) {
  for (const item of items) URL.revokeObjectURL(item.url);
}

export function CustomOrderStudio() {
  const searchParams = useSearchParams();
  const initialText = searchParams.get("yazi") ?? "Defne";
  const printRequest = searchParams.get("talep") === "baski";
  const hizmet = searchParams.get("hizmet");
  const pieceMode = hizmet === "parca";
  const visualMode = hizmet === "gorsel";
  /** Parça / görsel akışında canlı monogram tuvali yok — sayfayı hafif tutar. */
  const lightMode = pieceMode || visualMode;

  const [orderType, setOrderType] = useState<OrderType>(() => {
    if (pieceMode) return "İsteğe özel parça";
    if (visualMode) return "Özel Dijital Nakış Dosyası";
    if (hizmet === "logo") return "Kurumsal Logo Nakışı";
    return "İsim ve Monogram İşleme";
  });
  const [surface, setSurface] =
    useState<MonogramPreviewConfig["surface"]>("towel");
  const [text, setText] = useState(pieceMode || visualMode ? "" : initialText);
  const [fontStyle, setFontStyle] =
    useState<MonogramPreviewConfig["fontStyle"]>("serif");
  const [motif, setMotif] = useState<MonogramPreviewConfig["motif"]>("laurel");
  const [threadIdx, setThreadIdx] = useState(0);
  const [desiredSize, setDesiredSize] = useState("10 × 10 cm");
  const [machineBrand, setMachineBrand] = useState("PFAFF");
  const [fileFormat, setFileFormat] = useState("VP3");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [phone, setPhone] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [fabricNote, setFabricNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const thread = THREAD_COLORS[threadIdx];
  const isDigitalRequest = orderType === "Özel Dijital Nakış Dosyası" || visualMode;
  const isPieceRequest = orderType === "İsteğe özel parça" || pieceMode;

  const previewsRef = useRef(previews);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(() => () => revokeAll(previewsRef.current), []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;

    const next: File[] = [...refFiles];
    for (const file of picked) {
      if (next.length >= MAX_REF_FILES) break;
      if (!file.type.startsWith("image/")) {
        setError("Yalnızca PNG, JPG veya WebP görsel yükleyebilirsiniz.");
        continue;
      }
      if (file.size > MAX_REF_BYTES) {
        setError(`Her görsel en fazla ${MAX_REF_BYTES / (1024 * 1024)} MB olabilir.`);
        continue;
      }
      next.push(file);
    }
    setError(null);
    setRefFiles(next);
    revokeAll(previews);
    setPreviews(
      next
        .filter((f) => f.type.startsWith("image/"))
        .map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    );
  };

  const removeFile = (index: number) => {
    const next = refFiles.filter((_, i) => i !== index);
    setRefFiles(next);
    revokeAll(previews);
    setPreviews(
      next
        .filter((f) => f.type.startsWith("image/"))
        .map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!consent) {
      setError("KVKK aydınlatma metnini onaylamalısınız.");
      return;
    }
    if (visualMode && refFiles.length === 0) {
      setError("Görselden nakışa çevirme için en az bir referans görsel ekleyin.");
      return;
    }
    const requestText =
      text.trim().length >= 2
        ? text.trim()
        : note.trim().length >= 2
          ? note.trim()
          : "";
    if (requestText.length < 2) {
      setError("Ne istediğinizi kısaca yazın (yazı, ölçü veya not).");
      return;
    }

    const fd = new FormData();
    fd.set("name", customerName);
    fd.set("email", customerEmail);
    if (phone.trim()) fd.set("phone", phone.trim());
    fd.set("productType", orderType);
    fd.set("text", requestText);
    fd.set("size", desiredSize);
    fd.set("threadColor", thread.name);
    if (isDigitalRequest) {
      fd.set("machineModel", machineBrand);
      fd.set("format", fileFormat);
    }
    const details = [
      printRequest && "Talep türü: Tekstil baskısı",
      isPieceRequest && "Hizmet: İsteğe özel parça",
      visualMode && "Hizmet: Görselden nakışa çevirme",
      !isDigitalRequest && "Yüzey: " + (SURFACE_OPTIONS.find((option) => option.id === surface)?.label ?? ""),
      !isDigitalRequest && "Adet: " + quantity,
      fabricNote.trim() && "Kumaş / ürün notu: " + fabricNote.trim(),
      note.trim() && note.trim() !== requestText ? note.trim() : null,
    ].filter(Boolean);
    if (details.length) fd.set("notes", details.join("\n"));
    if (deadline) fd.set("deadline", deadline);
    if (budget.trim()) fd.set("budgetTl", budget.trim());
    fd.set("consent", "true");
    fd.set("website", website);
    for (const f of refFiles) fd.append("files", f);

    setSubmitting(true);
    try {
      const res = await fetch("/api/custom-orders", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as
        | { id?: string; error?: { message?: string } }
        | null;
      if (!res.ok) {
        throw new Error(data?.error?.message || "Talebiniz gönderilemedi. Lütfen tekrar deneyin.");
      }
      setSubmittedRef((data?.id ?? "").slice(-8).toUpperCase() || "ALINDI");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pageTitle = pieceMode
    ? "İsteğe özel parça siparişi"
    : visualMode
      ? "Görselden nakışa çevirme"
      : "Kişiye Özel Nakış ve Tasarım Talebi";

  const pageLead = pieceMode
    ? "Referans görselinizi ekleyin, ölçü ve isteğinizi yazın. Atölye inceler; üretimden önce fiyat teklifi gelir. Yükleme otomatik dosya veya sipariş oluşturmaz."
    : visualMode
      ? "Fotoğraf veya logonuzu yükleyin, isteğinizi yazın. Atölye inceler ve nakış dosyası için teklif verir. Yükleme otomatik dosya üretmez."
      : "İsim, monogram, kurum logosu veya kendi makineniz için özel dijital nakış dosyası talebinizi canlı önizleme ile hazırlayıp atölyemize iletebilirsiniz.";

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      <div className="border-b border-hairline pb-8">
        <div className="max-w-[66ch]">
          <h1 className="font-display text-[clamp(2.2rem,4vw,3.35rem)] font-semibold leading-[1.08] text-ink">
            {pageTitle}
          </h1>
          <p className="mt-3 text-[1.125rem] leading-relaxed text-umber">{pageLead}</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
        <div className="space-y-8 lg:col-span-5">
          <div className="space-y-8 lg:sticky lg:top-[96px]">
            {lightMode ? (
              <div>
                <h2 className="mb-3 font-display text-[1.5rem] text-ink">
                  {previews.length ? "Yüklediğiniz görseller" : "Referans görsel"}
                </h2>
                {previews.length === 0 ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-hairline-strong bg-linen/40 px-6 py-10 text-center">
                    <Upload className="h-6 w-6 text-umber" strokeWidth={1.6} />
                    <p className="mt-3 max-w-[32ch] text-[0.9375rem] text-umber">
                      Sağdaki formdan görsel eklediğinizde önizleme burada görünür. Dosyalar yalnızca talebinizle birlikte atölyeye iletilir.
                    </p>
                  </div>
                ) : (
                  <ul className="grid grid-cols-2 gap-3">
                    {previews.map((p) => (
                      <li key={p.url} className="border border-hairline bg-surface">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.url}
                          alt={p.name}
                          className="aspect-square w-full object-contain bg-ivory"
                        />
                        <p className="truncate px-2 py-1.5 text-[0.75rem] text-umber">{p.name}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div>
                <h2 className="mb-3 font-display text-[1.5rem] text-ink">
                  Canlı tasarım önizlemesi
                </h2>
                <LiveMonogramPreview
                  config={{
                    text,
                    fontStyle,
                    threadColorHex: thread.hex,
                    threadColorName: thread.name,
                    surface,
                    motif,
                  }}
                />
              </div>
            )}

            <div className="border-t border-hairline pt-6">
              <h3 className="font-display text-[1.35rem] text-ink">
                Özel sipariş süreci nasıl ilerler?
              </h3>
              <ol className="mt-4 space-y-2.5 text-[0.875rem]">
                {ORDER_STAGES.map((stage, idx) => {
                  const active = submittedRef !== null && idx === 0;
                  return (
                    <li
                      key={stage}
                      className={`flex items-center gap-3 ${
                        active ? "font-medium text-ink" : "text-umber"
                      }`}
                    >
                      <span
                        className={`tabular-nums flex h-6 w-6 shrink-0 items-center justify-center border text-[0.75rem] ${
                          active
                            ? "border-cocoa bg-cocoa text-[#FAF8F3]"
                            : "border-hairline-strong text-stone"
                        }`}
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                      <span>{stage}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          {submittedRef ? (
            <div className="border border-hairline bg-surface p-8 sm:p-10">
              <p className="text-[0.875rem] font-medium text-gold-text">Talep alındı</p>
              <h2 className="mt-2 font-display text-[2rem] leading-tight text-ink">
                Özel tasarım talebiniz oluşturuldu.
              </h2>
              <p className="mt-3 text-[1rem] text-umber">
                Talep kodunuz{" "}
                <strong className="tabular-nums font-semibold text-ink">{submittedRef}</strong>
                . Talebiniz yönetim paneline düştü; atölye inceleyip e-posta ile dönüş yapacak.
                Giriş yaptıysanız teklifi hesabınızdaki Özel taleplerim sekmesinden de
                görebilirsiniz.
              </p>
              {previews.length > 0 && (
                <ul className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {previews.map((p) => (
                    <li key={p.url} className="border border-hairline">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.name} className="aspect-square w-full object-cover" />
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => {
                  setSubmittedRef(null);
                  setRefFiles([]);
                  revokeAll(previews);
                  setPreviews([]);
                  setNote("");
                  setText(lightMode ? "" : initialText);
                }}
                className="mt-7 inline-flex h-11 items-center border border-cocoa px-6 text-[0.875rem] font-medium text-cocoa transition-colors duration-200 hover:bg-cocoa hover:text-[#FAF8F3]"
              >
                Yeni bir tasarım talebi hazırla
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="relative space-y-6 border border-hairline bg-surface p-6 sm:p-10"
            >
              {!lightMode && (
                <div>
                  <p className="mb-2.5 text-[0.9375rem] font-medium text-ink">
                    Ürün ve hizmet türü
                  </p>
                  <div className="grid grid-cols-1 border border-hairline sm:grid-cols-2 lg:grid-cols-4">
                    {(
                      [
                        "İsim ve Monogram İşleme",
                        "Özel Dijital Nakış Dosyası",
                        "Kurumsal Logo Nakışı",
                        "İsteğe özel parça",
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setOrderType(opt)}
                        className={`min-h-11 px-3 py-2 text-[0.875rem] font-medium transition-colors duration-200 ${
                          orderType === opt
                            ? "bg-cocoa text-[#FAF8F3]"
                            : "bg-transparent text-umber hover:bg-linen/60 hover:text-ink"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {printRequest && (
                <p className="text-[0.9375rem] text-umber">
                  Tekstil baskısı için referans görseli ve istenen ayrıntıları ekleyebilirsiniz.
                </p>
              )}

              {/* Reference images — first in light modes */}
              <div>
                <p className="mb-1.5 text-[0.875rem] font-medium text-ink">
                  Referans görsel {visualMode ? "(zorunlu)" : "(isteğe bağlı)"}
                </p>
                <p className="mb-2 text-[0.8125rem] leading-relaxed text-stone">
                  PNG, JPG veya WebP · en fazla {MAX_REF_FILES} dosya · dosya başı{" "}
                  {MAX_REF_BYTES / (1024 * 1024)} MB. Görseller yeniden kodlanır ve yalnızca
                  talebinizde saklanır; sayfa yükünü artırmaz.
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-hairline-strong bg-ivory/70 px-6 py-7 text-center transition-colors duration-200 hover:border-cocoa">
                  <Upload className="h-5 w-5 text-umber" strokeWidth={1.6} />
                  <span className="mt-2 text-[0.9375rem] font-medium text-ink">
                    {refFiles.length
                      ? `${refFiles.length} görsel seçildi — eklemek için tıklayın`
                      : "Görsel seçin veya sürükleyin"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                {previews.length > 0 && (
                  <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {previews.map((p, i) => (
                      <li key={p.url} className="relative border border-hairline bg-ivory">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.url}
                          alt={p.name}
                          className="aspect-square w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          aria-label={`${p.name} kaldır`}
                          className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center border border-hairline bg-surface text-ink"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <p className="truncate px-2 py-1 text-[0.75rem] text-umber">{p.name}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                  {isPieceRequest
                    ? "Ne istiyorsunuz?"
                    : visualMode
                      ? "Görseldeki istek / açıklama"
                      : "İsim veya yazı"}
                </span>
                {isPieceRequest || visualMode ? (
                  <textarea
                    rows={3}
                    required
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                      isPieceRequest
                        ? "Örn: Bej havluya 12 cm koyu lacivert monogram, sol alt köşe"
                        : "Örn: Logoyu 10×10 cm VP3 olarak dijitalleştirin; ince çizgiler kalınlaştırılsın"
                    }
                    className="w-full border border-hairline-strong bg-ivory p-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    maxLength={24}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Örn: Defne"
                    className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                  />
                )}
              </label>

              {!isDigitalRequest && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                      Nakış yapılacak yüzey
                    </span>
                    <select
                      value={surface}
                      onChange={(e) =>
                        setSurface(e.target.value as MonogramPreviewConfig["surface"])
                      }
                      className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                    >
                      {SURFACE_OPTIONS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">Adet</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none sm:w-32"
                    />
                  </label>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                    İstenen nakış boyutu
                  </span>
                  <select
                    value={desiredSize}
                    onChange={(e) => setDesiredSize(e.target.value)}
                    className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                  >
                    <option value="5 × 5 cm (Mendil / Yaka)">5 × 5 cm (Mendil / Yaka)</option>
                    <option value="10 × 10 cm">10 × 10 cm (Standart Monogram)</option>
                    <option value="13 × 18 cm">13 × 18 cm (Havlu / Çanta)</option>
                    <option value="16 × 26 cm">16 × 26 cm (Masa Örtüsü / Pano)</option>
                    <option value="Özel ölçü (Notta belirteceğim)">
                      Özel ölçü (Notta belirteceğim)
                    </option>
                  </select>
                </label>
                {!lightMode && (
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                      Yazı tipi
                    </span>
                    <select
                      value={fontStyle}
                      onChange={(e) =>
                        setFontStyle(e.target.value as MonogramPreviewConfig["fontStyle"])
                      }
                      className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                    >
                      <option value="serif">Klasik Serif</option>
                      <option value="italic">Zarif İtalik</option>
                      <option value="modern">Sade Modern</option>
                    </select>
                  </label>
                )}
              </div>

              {!lightMode && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                      Çerçeve motifi
                    </span>
                    <select
                      value={motif}
                      onChange={(e) =>
                        setMotif(e.target.value as MonogramPreviewConfig["motif"])
                      }
                      className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                    >
                      <option value="laurel">Zeytin Dalı Çelengi</option>
                      <option value="crown">Klasik Arma</option>
                      <option value="minimal">Çerçevesiz Sade</option>
                    </select>
                  </label>
                </div>
              )}

              <div>
                <p className="mb-2 text-[0.875rem] font-medium text-ink">
                  İplik rengi: <span className="font-normal text-umber">{thread.name}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {THREAD_COLORS.map((c, idx) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setThreadIdx(idx)}
                      aria-label={c.name}
                      aria-pressed={threadIdx === idx}
                      className={`h-9 w-9 rounded-full border transition-transform duration-200 ${
                        threadIdx === idx
                          ? "scale-110 border-cocoa ring-2 ring-gold ring-offset-2"
                          : "border-hairline-strong"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              {isDigitalRequest && (
                <div className="grid grid-cols-1 gap-5 border-t border-hairline pt-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                      Makine modeli
                    </span>
                    <select
                      value={machineBrand}
                      onChange={(e) => setMachineBrand(e.target.value)}
                      className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                    >
                      {ALL_MACHINES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                      İstenen dosya formatı
                    </span>
                    <select
                      value={fileFormat}
                      onChange={(e) => setFileFormat(e.target.value)}
                      className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                    >
                      {ALL_FORMATS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {/* Optional details — expanded */}
              <fieldset className="space-y-5 border-t border-hairline pt-6">
                <legend className="text-[0.9375rem] font-medium text-ink">
                  İsteğe bağlı ayrıntılar
                </legend>
                <p className="text-[0.8125rem] leading-relaxed text-stone">
                  Bunlar zorunlu değil. Doldurursanız teklif daha net olur; boş bırakırsanız
                  atölye e-posta ile sorar.
                </p>
                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                    Kumaş / ürün notu
                  </span>
                  <input
                    type="text"
                    value={fabricNote}
                    onChange={(e) => setFabricNote(e.target.value)}
                    placeholder="Örn: Organik pamuk havlu, kırık beyaz; müşteri kumaşı gönderecek"
                    className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                  />
                </label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                      Telefon
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                      İstenen teslim tarihi
                    </span>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                      Bütçe (TL)
                    </span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                    Ek not
                  </span>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Konum (sol köşe / orta), hediye paketi, renk kodu veya diğer istekler…"
                    className="w-full border border-hairline-strong bg-ivory p-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                  />
                </label>
              </fieldset>

              <div className="grid grid-cols-1 gap-5 border-t border-hairline pt-6 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                    Ad Soyad
                  </span>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Adınız ve soyadınız"
                    className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                    E-posta adresi
                  </span>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="ornek@eposta.com"
                    className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                  />
                </label>
              </div>

              <div
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
              >
                <label>
                  Web sitesi
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>

              <label className="flex min-h-11 items-start gap-3 text-[0.875rem] text-umber">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-[#4A372C]"
                />
                <span>
                  Kişisel verilerimin talebimi yanıtlamak amacıyla işlenmesini kabul ediyorum.{" "}
                  <a href="/bilgi/gizlilik-ve-kvkk" className="underline underline-offset-2">
                    Aydınlatma metni
                  </a>
                </span>
              </label>

              {error && (
                <p
                  role="alert"
                  className="border border-hairline-strong bg-ivory px-3 py-2.5 text-[0.875rem] text-ink"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="h-12 w-full bg-cocoa px-8 text-[0.9375rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover disabled:opacity-60 sm:w-auto"
              >
                {submitting ? "Gönderiliyor..." : "Teklif talebi gönder"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
