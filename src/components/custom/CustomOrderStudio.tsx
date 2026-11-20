"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Upload } from "lucide-react";
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

export function CustomOrderStudio() {
  const searchParams = useSearchParams();
  const initialText = searchParams.get("yazi") ?? "Defne";
  const printRequest = searchParams.get("talep") === "baski";

  const [orderType, setOrderType] = useState<
    "İsim ve Monogram İşleme" | "Özel Dijital Nakış Dosyası" | "Kurumsal Logo Nakışı"
  >("İsim ve Monogram İşleme");
  const [surface, setSurface] =
    useState<MonogramPreviewConfig["surface"]>("towel");
  const [text, setText] = useState(initialText);
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
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(
    null
  );
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [phone, setPhone] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const thread = THREAD_COLORS[threadIdx];
  const isDigitalRequest = orderType === "Özel Dijital Nakış Dosyası";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setRefFiles(list);
    const file = list[0];
    if (!file) {
      setReferenceFileName(null);
      setReferencePreviewUrl(null);
      return;
    }
    setReferenceFileName(list.length > 1 ? `${list.length} görsel seçildi` : file.name);
    setReferencePreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!consent) {
      setError("KVKK aydınlatma metnini onaylamalısınız.");
      return;
    }
    const fd = new FormData();
    fd.set("name", customerName);
    fd.set("email", customerEmail);
    if (phone.trim()) fd.set("phone", phone.trim());
    fd.set("productType", orderType);
    fd.set("text", text.trim().length >= 2 ? text.trim() : note.trim() || text);
    fd.set("size", desiredSize);
    fd.set("threadColor", thread.name);
    if (isDigitalRequest) {
      fd.set("machineModel", machineBrand);
      fd.set("format", fileFormat);
    }
    const details = [
      printRequest && "Talep türü: Tekstil baskısı",
      !isDigitalRequest && "Yüzey: " + (SURFACE_OPTIONS.find((option) => option.id === surface)?.label ?? ""),
      !isDigitalRequest && "Adet: " + quantity,
      note.trim(),
    ].filter(Boolean);
    if (details.length) fd.set("notes", details.join("\n"));
    if (deadline) fd.set("deadline", deadline);
    if (budget.trim()) fd.set("budgetTl", budget.trim());
    fd.set("consent", "true");
    fd.set("website", website);
    for (const f of refFiles) fd.append("files", f);
    setSubmitting(true);
    try {
      const res = await fetch("/api/custom-orders", { method: "POST", body: fd, credentials: "same-origin" });
      const data = (await res.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null;
      if (!res.ok) throw new Error(data?.error?.message || "Talebiniz gönderilemedi. Lütfen tekrar deneyin.");
      setSubmittedRef((data?.id ?? "").slice(-8).toUpperCase() || "ALINDI");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      <div className="border-b border-hairline pb-8">
        <div className="max-w-[66ch]">
          <h1 className="font-display text-[clamp(2.2rem,4vw,3.35rem)] leading-[1.06] text-ink">
            Kişiye Özel Nakış ve Tasarım Talebi
          </h1>
          <p className="mt-3 text-[1rem] text-umber">
            İsim, monogram, kurum logosu veya kendi makineniz için özel dijital nakış dosyası talebinizi canlı önizleme ile hazırlayıp atölyemize iletebilirsiniz.
          </p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
        {/* Left: Sticky Live Preview Canvas & 7-Stage Process */}
        <div className="space-y-8 lg:col-span-5">
          <div className="lg:sticky lg:top-[96px] space-y-8">
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

            {/* 7-Stage Custom Order Lifecycle */}
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

        {/* Right: Complete Bespoke Request Form */}
        <div className="lg:col-span-7">
          {submittedRef ? (
            <div className="border border-hairline bg-surface p-8 sm:p-10">
              <p className="text-[0.875rem] font-medium text-gold-text">
                Talep alındı
              </p>
              <h2 className="mt-2 font-display text-[2rem] leading-tight text-ink">
                Özel tasarım talebiniz oluşturuldu.
              </h2>
              <p className="mt-3 text-[1rem] text-umber">
                Talep kodunuz{" "}
                <strong className="tabular-nums font-semibold text-ink">
                  {submittedRef}
                </strong>
                . Talebinizi inceleyip e-posta ile teklifle dönüş yapacağız. Giriş yaptıysanız teklifi hesabınızdaki Özel taleplerim sekmesinden de görüp yanıtlayabilirsiniz.
              </p>

              <dl className="mt-6 divide-y divide-hairline border-y border-hairline text-[0.9375rem]">
                <div className="flex justify-between py-2.5">
                  <dt className="text-umber">Talep türü</dt>
                  <dd className="font-medium text-ink">{orderType}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-umber">Yazı / Monogram</dt>
                  <dd className="font-medium text-ink">{text || "Belirtilmedi"}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-umber">İplik rengi ve boyut</dt>
                  <dd className="font-medium text-ink">
                    {thread.name} · {desiredSize}
                  </dd>
                </div>
                {isDigitalRequest && (
                  <div className="flex justify-between py-2.5">
                    <dt className="text-umber">Makine ve dosya formatı</dt>
                    <dd className="font-medium text-ink">
                      {machineBrand} · {fileFormat}
                    </dd>
                  </div>
                )}
              </dl>

              <button
                type="button"
                onClick={() => setSubmittedRef(null)}
                className="mt-7 inline-flex h-11 items-center border border-cocoa px-6 text-[0.875rem] font-medium text-cocoa transition-colors duration-200 hover:bg-cocoa hover:text-[#FAF8F3]"
              >
                Yeni bir tasarım talebi hazırla
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6 border border-hairline bg-surface p-6 sm:p-10"
            >
              {/* Order Type */}
              <div>
                <p className="mb-2.5 text-[0.9375rem] font-medium text-ink">
                  Ürün ve hizmet türü
                </p>
                <div className="grid grid-cols-1 border border-hairline sm:grid-cols-3">
                  {(
                    [
                      "İsim ve Monogram İşleme",
                      "Özel Dijital Nakış Dosyası",
                      "Kurumsal Logo Nakışı",
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

              {printRequest && <p className="text-[0.9375rem] text-umber">Tekstil baskısı için referans görseli ve istenen ayrıntıları ekleyebilirsiniz.</p>}

              {!isDigitalRequest && (
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
              )}

              {/* Surface + Desired Size */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                    Nakış yapılacak yüzey
                  </span>
                  <select
                    value={surface}
                    onChange={(e) =>
                      setSurface(
                        e.target.value as MonogramPreviewConfig["surface"]
                      )
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
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                    İstenen nakış boyutu
                  </span>
                  <select
                    value={desiredSize}
                    onChange={(e) => setDesiredSize(e.target.value)}
                    className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                  >
                    <option value="5 × 5 cm (Mendil / Yaka)">
                      5 × 5 cm (Mendil / Yaka)
                    </option>
                    <option value="10 × 10 cm">10 × 10 cm (Standart Monogram)</option>
                    <option value="13 × 18 cm">13 × 18 cm (Havlu / Çanta)</option>
                    <option value="16 × 26 cm">16 × 26 cm (Masa Örtüsü / Pano)</option>
                    <option value="Özel ölçü (Notta belirteceğim)">
                      Özel ölçü (Notta belirteceğim)
                    </option>
                  </select>
                </label>
              </div>

              {/* Name / Text + Font + Motif */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <label className="block sm:col-span-1">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                    İsim veya yazı
                  </span>
                  <input
                    type="text"
                    maxLength={24}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Örn: Defne"
                    className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                    Yazı tipi
                  </span>
                  <select
                    value={fontStyle}
                    onChange={(e) =>
                      setFontStyle(
                        e.target.value as MonogramPreviewConfig["fontStyle"]
                      )
                    }
                    className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                  >
                    <option value="serif">Klasik Serif</option>
                    <option value="italic">Zarif İtalik</option>
                    <option value="modern">Sade Modern</option>
                  </select>
                </label>

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

              {/* Thread color swatches */}
              <div>
                <p className="mb-2 text-[0.875rem] font-medium text-ink">
                  İplik rengi:{" "}
                  <span className="font-normal text-umber">{thread.name}</span>
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

              {/* Machine Model & File Format (for digital/custom digitizing requests) */}
              <div className="grid grid-cols-1 gap-5 border-t border-hairline pt-6 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                    Makine modeli (Dijital dosya talepleri için)
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

              {/* Reference Image Upload */}
              <div>
                <p className="mb-2 text-[0.875rem] font-medium text-ink">
                  Referans görsel veya logo yükle (İsteğe bağlı)
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-hairline-strong bg-ivory/70 px-6 py-7 text-center transition-colors duration-200 hover:border-cocoa">
                  <Upload className="h-5 w-5 text-umber" strokeWidth={1.6} />
                  <span className="mt-2 text-[0.9375rem] font-medium text-ink">
                    {referenceFileName ?? "PNG, JPG veya WebP referans görselleri seçin (en fazla 5)"}
                  </span>
                  <span className="mt-1 text-[0.875rem] text-stone">
                    Logo nakışı veya özel desen çizimleri için yüksek çözünürlüklü görsel önerilir.
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                {referencePreviewUrl && (
                  <div className="mt-3 flex items-center gap-3 text-[0.875rem] text-umber">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={referencePreviewUrl}
                      alt="Yüklenen referans görsel önizlemesi"
                      className="h-14 w-14 border border-hairline object-cover"
                    />
                    <span>Referans görsel önizleme için eklendi ({referenceFileName})</span>
                  </div>
                )}
              </div>

              {/* Contact & Customer Note */}
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

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">Telefon (İsteğe bağlı)</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">İstenen teslim tarihi</span>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">Bütçe, TL (İsteğe bağlı)</span>
                  <input type="number" min={0} inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} className="h-11 w-full border border-hairline-strong bg-ivory px-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none" />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[0.875rem] font-medium text-ink">
                  Atölyeye notunuz
                </span>
                <textarea
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Kumaş rengi, adet bilgisi, hediye paketi veya özel ölçü detaylarınızı yazabilirsiniz..."
                  className="w-full border border-hairline-strong bg-ivory p-3 text-[0.9375rem] text-ink focus:border-cocoa focus:outline-none"
                />
              </label>

              {/* Honeypot: hidden from people and assistive tech. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Web sitesi
                  <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
              </div>

              <label className="flex min-h-11 items-start gap-3 text-[0.875rem] text-umber">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-[#4A372C]" />
                <span>
                  Kişisel verilerimin talebimi yanıtlamak amacıyla işlenmesini kabul ediyorum.{" "}
                  <a href="/bilgi/gizlilik-ve-kvkk" className="underline underline-offset-2">Aydınlatma metni</a>
                </span>
              </label>

              {error && (
                <p role="alert" className="border border-hairline-strong bg-ivory px-3 py-2.5 text-[0.875rem] text-ink">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="h-12 w-full bg-cocoa px-8 text-[0.9375rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover disabled:opacity-60 sm:w-auto"
              >
                {submitting ? "Gönderiliyor..." : "Özel Teklif ve Tasarım Talebi Gönder"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
