"use client";

import { useMemo, useState } from "react";
import { THREAD_COLORS } from "@/components/custom/LiveMonogramPreview";
import { FABRIC_WINDOWS, clampDesignMm, designWidthPercent, type FabricWindowId } from "@/lib/fabric-scale";

const FABRIC_STYLE: Record<FabricWindowId, { backgroundColor: string; backgroundImage: string; dark?: boolean }> = {
  cotton: {
    backgroundColor: "#F3EFE6",
    backgroundImage:
      "repeating-linear-gradient(0deg, rgba(74,55,44,0.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(74,55,44,0.04) 0 1px, transparent 1px 4px)",
  },
  denim: {
    backgroundColor: "#3A4660",
    backgroundImage:
      "repeating-linear-gradient(115deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 3px), repeating-linear-gradient(65deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 5px)",
    dark: true,
  },
  linen: {
    backgroundColor: "#E6D7C3",
    backgroundImage:
      "repeating-linear-gradient(0deg, rgba(74,55,44,0.07) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(74,55,44,0.05) 0 1px, transparent 1px 3px)",
  },
  fleece: {
    backgroundColor: "#D5D0C8",
    backgroundImage: "radial-gradient(rgba(74,55,44,0.16) 0.6px, transparent 0.7px)",
  },
  terry: {
    backgroundColor: "#F7F4EE",
    backgroundImage:
      "radial-gradient(rgba(74,55,44,0.14) 1px, transparent 1.2px), radial-gradient(rgba(74,55,44,0.08) 1px, transparent 1.2px)",
  },
  canvas: {
    backgroundColor: "#C6A56A",
    backgroundImage:
      "repeating-linear-gradient(90deg, rgba(74,55,44,0.16) 0 2px, transparent 2px 6px), repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 5px)",
  },
};

export function FabricMockup({
  imageUrl,
  imageAlt,
  initialWidthMm,
  initialHeightMm,
}: {
  imageUrl: string;
  imageAlt: string;
  initialWidthMm: number;
  initialHeightMm: number;
}) {
  const [fabricId, setFabricId] = useState<FabricWindowId>("linen");
  const [widthMm, setWidthMm] = useState(clampDesignMm(initialWidthMm));
  const [heightMm, setHeightMm] = useState(clampDesignMm(initialHeightMm));
  const [threadIdx, setThreadIdx] = useState(1);
  const [stitch, setStitch] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const fabric = FABRIC_WINDOWS.find((item) => item.id === fabricId) ?? FABRIC_WINDOWS[2];
  const style = FABRIC_STYLE[fabric.id];
  const thread = THREAD_COLORS[threadIdx] ?? THREAD_COLORS[0];
  const widthPercent = useMemo(() => designWidthPercent(widthMm, fabric.widthMm), [widthMm, fabric.widthMm]);

  return (
    <section aria-labelledby="kumas-onizleme-baslik" className="mt-8 border-t border-hairline pt-6">
      <h2 id="kumas-onizleme-baslik" className="text-[1.25rem] font-semibold text-ink">
        Kumaşta önizleme
      </h2>
      <p className="mt-2 max-w-[62ch] text-[1.0625rem] leading-relaxed text-umber">
        Desen, seçtiğiniz kumaşın ve milimetre ölçünün üzerine yerleştirilir. Dikiş katmanı ekran benzetimidir. Fiziksel kumaş provası yapılmamıştır.
      </p>

      <div
        className="relative mt-4 aspect-[4/3] overflow-hidden border border-hairline"
        style={{
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          backgroundSize: fabric.id === "fleece" ? "4px 4px" : fabric.id === "terry" ? "7px 7px, 7px 7px" : undefined,
          backgroundPosition: fabric.id === "terry" ? "0 0, 3px 3px" : undefined,
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-200"
          style={{ width: `${widthPercent}%`, transform: `translate(-50%, -50%) scale(${zoomed ? 1.8 : 1})` }}
        >
          <div className={style.dark ? "bg-[#F6F1E8] p-[4%]" : ""}>
            <div className="relative" style={{ aspectRatio: `${widthMm} / ${heightMm}` }}>
              <img
                src={imageUrl}
                alt={imageAlt}
                className="h-full w-full object-contain mix-blend-multiply"
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-color" style={{ backgroundColor: thread.hex }} />
              {stitch && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-70 mix-blend-multiply"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, transparent 0 2px, rgba(36,35,32,0.55) 2px 3px, transparent 3px 5px)",
                    backgroundSize: "5px 3px",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Kumaş">
        {FABRIC_WINDOWS.map((item) => {
          const active = item.id === fabric.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFabricId(item.id)}
              className={`min-h-12 border px-3 text-[1rem] font-medium transition-colors duration-200 ${
                active ? "border-cocoa bg-cocoa text-ivory" : "border-hairline-strong bg-surface text-ink hover:border-cocoa"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-[1rem] font-medium text-ink">
          Genişlik (mm)
          <input
            type="number"
            min={20}
            max={180}
            value={widthMm}
            onChange={(event) => setWidthMm(clampDesignMm(Number(event.target.value)))}
            className="mt-1 h-12 w-full border border-hairline-strong bg-surface px-3 text-[1.0625rem] tabular-nums"
          />
        </label>
        <label className="block text-[1rem] font-medium text-ink">
          Yükseklik (mm)
          <input
            type="number"
            min={20}
            max={180}
            value={heightMm}
            onChange={(event) => setHeightMm(clampDesignMm(Number(event.target.value)))}
            className="mt-1 h-12 w-full border border-hairline-strong bg-surface px-3 text-[1.0625rem] tabular-nums"
          />
        </label>
      </div>
      <p className="mt-2 text-[1rem] tabular-nums text-umber">
        {fabric.label} penceresi {fabric.widthMm} mm. Desen bu pencerede yaklaşık %{widthPercent} genişlikte durur.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="İplik rengi">
        {THREAD_COLORS.map((color, index) => {
          const active = index === threadIdx;
          return (
            <button
              key={color.name}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={color.name}
              onClick={() => setThreadIdx(index)}
              className={`h-12 w-12 border ${active ? "border-cocoa ring-2 ring-gold" : "border-hairline-strong"}`}
              style={{ backgroundColor: color.hex }}
            />
          );
        })}
      </div>
      <p className="mt-2 text-[1rem] text-ink">İplik rengi: {thread.name}. Yalnız önizlemeyi boyar.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={stitch}
          onClick={() => setStitch((value) => !value)}
          className="inline-flex min-h-12 items-center border border-cocoa px-4 text-[1rem] font-semibold text-cocoa"
        >
          {stitch ? "Dikiş benzetimini kapat" : "Dikiş benzetimini aç"}
        </button>
        <button
          type="button"
          aria-pressed={zoomed}
          onClick={() => setZoomed((value) => !value)}
          className="inline-flex min-h-12 items-center border border-cocoa px-4 text-[1rem] font-semibold text-cocoa"
        >
          {zoomed ? "Yakınlaştırmayı kapat" : "Yakınlaştır"}
        </button>
      </div>
    </section>
  );
}
