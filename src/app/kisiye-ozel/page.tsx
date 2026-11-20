import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomOrderStudio } from "@/components/custom/CustomOrderStudio";

export const metadata: Metadata = {
  title: "Kişiye Özel Nakış ve Tasarım",
  description:
    "Görsel yükleyerek isteğe özel parça veya görselden nakışa çevirme talebi oluşturun; monogram önizlemesi ve dijital dosya istekleri de buradan iletilir.",
};

export default function KisiyeOzelPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-6 pb-24 pt-[128px]">
          <p className="font-display text-[2rem] text-ink">
            Tasarım stüdyosu hazırlanıyor...
          </p>
        </div>
      }
    >
      <CustomOrderStudio />
    </Suspense>
  );
}
