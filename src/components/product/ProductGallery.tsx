"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface GalleryImage {
  url: string;
  alt: string;
  caption: string;
}

interface ProductGalleryProps {
  images: GalleryImage[];
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
      <div className="flex-1">
        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setZoomed(false)}
          onClick={() => setZoomed((z) => !z)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setZoomed((z) => !z);
            }
          }}
          aria-label={
            zoomed
              ? `${productName} yakınlaştırmayı kapat`
              : `${productName} dikiş detayını yakınlaştır`
          }
          className={`relative aspect-[3/4] w-full overflow-hidden bg-linen ${
            zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
          }`}
        >
          <Image
            src={current.url}
            alt={current.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 52vw"
            style={{
              transformOrigin: `${origin.x}% ${origin.y}%`,
              transform: zoomed ? "scale(2.15)" : "scale(1)",
            }}
            className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          />

          {/* Zoom indicator button */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3.5 right-3.5 inline-flex items-center gap-1.5 bg-ivory/90 px-3 py-1.5 text-[0.8125rem] font-medium text-ink backdrop-blur-[2px]"
          >
            {zoomed ? (
              <>
                <ZoomOut className="h-3.5 w-3.5" />
                Uzaklaştır
              </>
            ) : (
              <>
                <ZoomIn className="h-3.5 w-3.5" />
                Dikişi yakınlaştır
              </>
            )}
          </span>

          {/* Mobile / multi-image prev-next controls */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                aria-label="Önceki görsel"
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-ivory/85 text-ink transition-colors duration-200 hover:bg-ivory"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.6} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                aria-label="Sonraki görsel"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-ivory/85 text-ink transition-colors duration-200 hover:bg-ivory"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.6} />
              </button>
            </>
          )}
        </div>

        <p className="mt-2.5 text-[0.875rem] text-umber">{current.caption}</p>
      </div>

      {/* Thumbnails (vertical rail on lg, horizontal strip on mobile) */}
      {images.length > 1 && (
        <div className="flex gap-3 lg:w-20 lg:flex-col">
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
                  src={img.url}
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
