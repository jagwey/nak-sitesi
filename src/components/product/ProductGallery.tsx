"use client";

import { useState } from "react";
import type { Product } from "@/data/products";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

interface ProductGalleryProps {
  images: Product["images"];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const current = images[activeIndex] ?? images[0];

  const handlePrev = () => {
    setZoomed(false);
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setZoomed(false);
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse">
      {/* Main Image Stage with Interactive Stitch Zoom */}
      <div className="min-w-0 flex-1">
        <div
          onMouseMove={handleMouseMove}
          className="relative aspect-[3/4] w-full overflow-hidden bg-linen"
        >
          <Image
            src={current.url}
            alt={current.alt}
            fill
            loading="eager"
            fetchPriority={activeIndex === 0 ? "high" : "auto"}
            unoptimized={Boolean(current.thumbnailUrl)}
            sizes="(max-width: 1024px) 100vw, 52vw"
            style={{
              transformOrigin: `${origin.x}% ${origin.y}%`,
              transform: zoomed ? "scale(2.15)" : "scale(1)",
            }}
            className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          />

          {/* Mobile / multi-image prev-next controls */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Önceki görsel"
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-ivory/85 text-ink transition-colors duration-200 hover:bg-ivory"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.6} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Sonraki görsel"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-ivory/85 text-ink transition-colors duration-200 hover:bg-ivory"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.6} />
              </button>
            </>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <p className="py-2.5 text-[0.875rem] text-umber">{current.caption}</p>
          <button
            type="button"
            aria-label={`Dikişi yakınlaştır: ${productName}`}
            aria-pressed={zoomed}
            onClick={() => {
              setOrigin({ x: 50, y: 50 });
              setZoomed((value) => !value);
            }}
            className="inline-flex min-h-11 items-center gap-2 border border-hairline px-3 text-[0.875rem] font-medium text-ink transition-colors hover:border-cocoa aria-pressed:border-cocoa aria-pressed:bg-cocoa aria-pressed:text-ivory"
          >
            <ZoomIn aria-hidden="true" className="h-4 w-4" />
            Dikişi yakınlaştır
          </button>
        </div>
      </div>

      {/* Thumbnails (vertical rail on lg, horizontal strip on mobile) */}
      {images.length > 1 && (
        <div className="flex flex-wrap gap-3 lg:w-20 lg:flex-col">
          {images.map((img, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={img.url}
                type="button"
                onClick={() => {
                  setZoomed(false);
                  setActiveIndex(idx);
                }}
                aria-label={`Görsel ${idx + 1}: ${img.caption}`}
                aria-current={active ? "true" : undefined}
                className={`relative aspect-[3/4] w-16 shrink-0 overflow-hidden bg-linen transition-[opacity,border-color] duration-200 lg:w-full ${
                  active
                    ? "ring-2 ring-cocoa ring-offset-2 ring-offset-ivory"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={img.thumbnailUrl ?? img.url}
                  unoptimized={Boolean(img.thumbnailUrl)}
                  alt={img.alt}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
