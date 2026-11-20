"use client";

import { useState } from "react";

export interface MonogramPreviewConfig {
  text: string;
  fontStyle: "serif" | "italic" | "modern";
  threadColorHex: string;
  threadColorName: string;
  surface: "linen" | "towel" | "canvas" | "muslin";
  motif: "laurel" | "minimal" | "crown";
}

export const THREAD_COLORS = [
  { name: "Antik Altın", hex: "#B18A49" },
  { name: "Koyu Espresso", hex: "#4A372C" },
  { name: "Zeytin Yeşili", hex: "#626C48" },
  { name: "Gül Kurusu", hex: "#9E6661" },
  { name: "Gece Laciverti", hex: "#2E3A4B" },
  { name: "Fildişi Krem", hex: "#EAE3D5" },
];

export const SURFACE_OPTIONS: {
  id: MonogramPreviewConfig["surface"];
  label: string;
  bg: string;
  className: string;
}[] = [
  {
    id: "linen",
    label: "Doğal Keten",
    bg: "#E6DEC8",
    className: "linen-canvas-surface",
  },
  {
    id: "towel",
    label: "Fildişi Havlu",
    bg: "#F3EFE6",
    className: "terry-canvas-surface",
  },
  {
    id: "canvas",
    label: "Ham Kanvas",
    bg: "#DDD3BE",
    className: "linen-canvas-surface",
  },
  {
    id: "muslin",
    label: "Bebek Müslini",
    bg: "#F7F3EA",
    className: "terry-canvas-surface",
  },
];

interface LiveMonogramPreviewProps {
  config: MonogramPreviewConfig;
  compact?: boolean;
}

export function LiveMonogramPreview({
  config,
  compact = false,
}: LiveMonogramPreviewProps) {
  const surfaceInfo =
    SURFACE_OPTIONS.find((s) => s.id === config.surface) ?? SURFACE_OPTIONS[0];
  const displayText = config.text.trim() || "T.B.";
  const isInitials = displayText.length <= 4;

  const fontClass =
    config.fontStyle === "serif"
      ? "font-display font-medium tracking-[0.04em]"
      : config.fontStyle === "italic"
      ? "font-display italic font-normal tracking-[0.02em]"
      : "font-sans font-medium tracking-[0.16em] uppercase";

  // High-contrast legibility fallback when ivory thread is picked on light surfaces
  const isLightThread = config.threadColorHex.toUpperCase() === "#EAE3D5";
  const canvasBg = isLightThread ? "#4A372C" : surfaceInfo.bg;

  return (
    <div className="flex flex-col">
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden border border-hairline ${
          surfaceInfo.className
        } ${compact ? "aspect-[4/3]" : "aspect-[4/3] sm:aspect-[16/11]"}`}
        style={{ backgroundColor: canvasBg }}
      >
        {/* Authentic tactile beechwood embroidery hoop ring */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative flex aspect-square h-[80%] items-center justify-center rounded-full border-[5px] border-[#D3BE9B] shadow-[inset_0_2px_10px_rgba(74,55,44,0.12),0_4px_14px_rgba(36,35,32,0.08)]"
        >
          <div className="pointer-events-none absolute inset-[2px] rounded-full border border-[#B99E74]/60" />
          {/* Decorative stitched botanical motif */}
          {config.motif === "laurel" && (
            <svg
              viewBox="0 0 240 240"
              className="absolute inset-0 h-full w-full"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M74 188 C42 158 34 110 56 68"
                stroke={config.threadColorHex}
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.88"
              />
              <path
                d="M166 188 C198 158 206 110 184 68"
                stroke={config.threadColorHex}
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.88"
              />
              {/* Left leaves */}
              {[
                "M56 80 Q44 76 48 64 Q60 68 56 80 Z",
                "M48 104 Q34 102 38 89 Q50 93 48 104 Z",
                "M47 130 Q33 132 36 118 Q49 120 47 130 Z",
                "M54 156 Q40 160 44 146 Q56 147 54 156 Z",
                "M68 178 Q56 186 58 172 Q70 171 68 178 Z",
              ].map((d, i) => (
                <path
                  key={`l-${i}`}
                  d={d}
                  fill={config.threadColorHex}
                  opacity="0.85"
                />
              ))}
              {/* Right leaves */}
              {[
                "M184 80 Q196 76 192 64 Q180 68 184 80 Z",
                "M192 104 Q206 102 202 89 Q190 93 192 104 Z",
                "M193 130 Q207 132 204 118 Q191 120 193 130 Z",
                "M186 156 Q200 160 196 146 Q184 147 186 156 Z",
                "M172 178 Q184 186 182 172 Q170 171 172 178 Z",
              ].map((d, i) => (
                <path
                  key={`r-${i}`}
                  d={d}
                  fill={config.threadColorHex}
                  opacity="0.85"
                />
              ))}
              {/* Crossed bottom stems */}
              <path
                d="M104 196 L136 186 M136 196 L104 186"
                stroke={config.threadColorHex}
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.8"
              />
            </svg>
          )}

          {config.motif === "crown" && (
            <svg
              viewBox="0 0 240 240"
              className="absolute inset-0 h-full w-full"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="120"
                cy="120"
                r="86"
                stroke={config.threadColorHex}
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.65"
              />
              <path
                d="M120 44 L125 56 L136 52 L128 64 L112 64 L104 52 L115 56 Z"
                fill={config.threadColorHex}
                opacity="0.9"
              />
              <path
                d="M92 184 L148 184"
                stroke={config.threadColorHex}
                strokeWidth="1.2"
                opacity="0.7"
              />
              <circle cx="120" cy="184" r="3" fill={config.threadColorHex} />
            </svg>
          )}

          {/* Simulated raised satin embroidery text */}
          <span
            className={`relative z-10 max-w-[76%] break-words text-center leading-tight transition-[color,font-size] duration-200 ${fontClass}`}
            style={{
              color: config.threadColorHex,
              fontSize: isInitials
                ? compact
                  ? "clamp(2rem, 4vw, 3rem)"
                  : "clamp(2.5rem, 5vw, 3.8rem)"
                : compact
                ? "clamp(1.25rem, 2.5vw, 1.85rem)"
                : "clamp(1.45rem, 3vw, 2.25rem)",
              textShadow: isLightThread
                ? "0 1px 1px rgba(0,0,0,0.45)"
                : "0 1px 0 rgba(255,255,255,0.45), 0 2px 3px rgba(36,35,32,0.14)",
            }}
          >
            {displayText}
          </span>
        </div>

        {/* Bottom surface label inside canvas */}
        <span
          className={`absolute bottom-3 left-4 text-[0.8125rem] ${
            isLightThread ? "text-[#E6DEC8]" : "text-umber"
          }`}
        >
          {isLightThread ? "Koyu Espresso Kumaş (Kontrast Önizleme)" : surfaceInfo.label} ·{" "}
          {config.threadColorName}
        </span>
      </div>

      <p className="mt-2.5 text-[0.875rem] leading-relaxed text-umber">
        Not: Bu canlı önizleme yalnızca yazı yerleşimi ve renk uyumu fikri verir; gerçek makine nakışında iplik parlaklığı, dikiş yoğunluğu ve kumaş dokusu farklılık gösterebilir.
      </p>
    </div>
  );
}

/**
 * Compact interactive preview widget embedded on the Homepage to let visitors try
 * live personalization right away before heading to the full /kisiye-ozel studio.
 */
export function HomeMonogramTeaser({ onContinueHref, mode = "order" }: {
  onContinueHref?: string;
  mode?: "order" | "storefront" | "preview";
}) {
  const [text, setText] = useState("Elif");
  const [fontStyle, setFontStyle] = useState<MonogramPreviewConfig["fontStyle"]>("serif");
  const [threadIdx, setThreadIdx] = useState(0);
  const [surface, setSurface] = useState<MonogramPreviewConfig["surface"]>("linen");
  const [motif, setMotif] = useState<MonogramPreviewConfig["motif"]>("laurel");

  const thread = THREAD_COLORS[threadIdx];

  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-6">
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

      <div className="space-y-6 lg:col-span-6">
        <h2 className="font-display text-[clamp(1.9rem,3vw,2.75rem)] leading-[1.1] text-ink">
          İsminizi ve baş harfinizi nakış üzerinde canlı görün.
        </h2>
        <p className="max-w-[54ch] text-[1rem] text-umber">
          {mode === "order"
            ? "Havlular, bebek battaniyeleri, keten peçeteler veya kendi nakış makineniz için kişiye özel monogram tasarımlarınızı sipariş öncesinde deneyebilirsiniz."
            : "Bir isim yazın, harf biçimini ve ipliği seçin, kumaş üzerindeki yerleşimi deneyin."}
        </p>

        <div className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="home-monogram-input"
              className="mb-1.5 block text-[0.875rem] font-medium text-ink"
            >
              İşlenecek isim veya baş harf
            </label>
            <input
              id="home-monogram-input"
              type="text"
              maxLength={18}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Örn: Elif veya T.B."
              className="h-11 w-full max-w-[360px] border border-hairline-strong bg-surface px-3.5 text-[1rem] text-ink focus:border-cocoa focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[0.875rem] font-medium text-ink">Yazı tipi</p>
              <div className="grid grid-cols-3 border border-hairline">
                {(
                  [
                    { id: "serif", label: "Klasik" },
                    { id: "italic", label: "İtalik" },
                    { id: "modern", label: "Modern" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={fontStyle === f.id}
                    onClick={() => setFontStyle(f.id)}
                    className={`h-10 text-[0.875rem] transition-colors duration-200 ${
                      fontStyle === f.id
                        ? "bg-cocoa text-[#FAF8F3]"
                        : "bg-surface text-umber hover:text-ink"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[0.875rem] font-medium text-ink">Çerçeve motifi</p>
              <div className="grid grid-cols-3 border border-hairline">
                {(
                  [
                    { id: "laurel", label: "Çelenk" },
                    { id: "crown", label: "Klasik" },
                    { id: "minimal", label: "Sade" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={motif === m.id}
                    onClick={() => setMotif(m.id)}
                    className={`h-10 text-[0.875rem] transition-colors duration-200 ${
                      motif === m.id
                        ? "bg-cocoa text-[#FAF8F3]"
                        : "bg-surface text-umber hover:text-ink"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="mb-2 text-[0.875rem] font-medium text-ink">
                İplik rengi: <span className="font-normal text-umber">{thread.name}</span>
              </p>
              <div className="flex items-center gap-2.5">
                {THREAD_COLORS.map((c, idx) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setThreadIdx(idx)}
                    aria-label={c.name}
                    aria-pressed={threadIdx === idx}
                    className={`h-8 w-8 rounded-full border transition-transform duration-200 ${
                      threadIdx === idx
                        ? "scale-110 border-cocoa ring-2 ring-gold ring-offset-2 ring-offset-ivory"
                        : "border-hairline-strong"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="home-surface-select"
                className="mb-2 block text-[0.875rem] font-medium text-ink"
              >
                Kumaş yüzeyi
              </label>
              <select
                id="home-surface-select"
                value={surface}
                onChange={(e) =>
                  setSurface(e.target.value as MonogramPreviewConfig["surface"])
                }
                className="h-10 border border-hairline bg-surface px-3 text-[0.875rem] text-ink focus:border-cocoa focus:outline-none"
              >
                {SURFACE_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {mode !== "preview" && (
          <div className="pt-2">
            <a
              href={onContinueHref ?? (mode === "storefront" ? "/kisiye-ozel/" : `/kisiye-ozel?yazi=${encodeURIComponent(text)}`)}
              className="inline-flex h-12 items-center bg-cocoa px-7 text-[0.9375rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
            >
              {mode === "storefront" ? "Tasarım stüdyosunu aç" : "Özel Sipariş Formuna Geç"}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
