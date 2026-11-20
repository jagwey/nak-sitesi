"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-24 pt-[128px]">
      <h1 className="font-display text-[2rem] text-ink">Ürün şu an yüklenemedi.</h1>
      <p className="mt-2 max-w-[52ch] text-[1rem] text-umber">Lütfen biraz sonra tekrar deneyin.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-11 items-center bg-cocoa px-6 text-[0.875rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover"
      >
        Tekrar dene
      </button>
    </div>
  );
}
