"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CATEGORIES, CURATED_COLLECTIONS } from "@/data/categories";

interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MegaMenu({ open, onClose }: MegaMenuProps) {
  if (!open) return null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-x-0 bottom-0 top-[80px] z-30 bg-ink/20 backdrop-blur-[1px]"
      />
      <div
        onMouseLeave={onClose}
        className="absolute inset-x-0 top-full z-40 border-b border-hairline bg-ivory shadow-[0_18px_40px_-24px_rgba(36,35,32,0.18)]"
      >
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-10 px-8 py-10">
        {/* Column 1-6: Categories & Subcategories */}
        <div className="col-span-6 grid grid-cols-2 gap-x-8 gap-y-6 border-r border-hairline pr-8">
          {CATEGORIES.map((category) => (
            <div key={category.slug} className="space-y-1.5">
              <Link
                href={`/koleksiyon?kategori=${category.slug}`}
                onClick={onClose}
                className="font-display block text-[1.15rem] font-medium text-ink transition-colors duration-200 hover:text-gold-text"
              >
                {category.name}
              </Link>
              <ul className="space-y-1">
                {category.subcategories.slice(0, 3).map((sub) => (
                  <li key={sub}>
                    <Link
                      href={`/koleksiyon?kategori=${category.slug}&q=${encodeURIComponent(
                        sub.split(" ")[0]
                      )}`}
                      onClick={onClose}
                      className="text-[0.875rem] text-umber transition-colors duration-200 hover:text-ink"
                    >
                      {sub}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Column 7-9: Popular Collections & Quick Format Shortcuts */}
        <div className="col-span-3 flex flex-col justify-between border-r border-hairline pr-8">
          <div className="space-y-4">
            <p className="text-[0.875rem] font-medium text-gold-text">
              Öne çıkan seçkiler
            </p>
            <ul className="space-y-3">
              {CURATED_COLLECTIONS.map((col) => (
                <li key={col.slug}>
                  <Link
                    href={`/koleksiyon?${col.filterQuery}`}
                    onClick={onClose}
                    className="group block space-y-0.5"
                  >
                    <span className="font-display text-[1.1rem] text-ink transition-colors duration-200 group-hover:text-gold-text">
                      {col.title}
                    </span>
                    <span className="block text-[0.875rem] leading-snug text-umber">
                      {col.subtitle}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-hairline pt-4">
            <p className="mb-2 text-[0.875rem] font-medium text-ink">
              Makine formatına göre
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.875rem] text-umber">
              {["VP3", "PES", "DST", "JEF", "HUS", "EXP"].map((fmt) => (
                <Link
                  key={fmt}
                  href={`/koleksiyon?tur=dijital&format=${fmt}`}
                  onClick={onClose}
                  className="underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
                >
                  {fmt}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Column 10-12: Editorial Featured Visual */}
        <div className="col-span-3 flex flex-col justify-between">
          <Link
            href="/kisiye-ozel"
            onClick={onClose}
            className="group block space-y-3"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-linen">
              <Image
                src="/images/prod-monogram-towel.webp"
                alt="Kişiye özel altın monogram işlemeli havlu seti"
                fill
                sizes="280px"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            </div>
            <div>
              <p className="font-display text-[1.15rem] text-ink">
                Kişiye Özel Monogram Atölyesi
              </p>
              <span className="mt-1 inline-flex items-center gap-1.5 text-[0.875rem] text-gold-text transition-colors duration-200 group-hover:text-cocoa">
                Canlı önizleme ile tasarla
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </div>
      </div>
      </div>
    </>
  );
}
