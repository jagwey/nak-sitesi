import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomOrderStudio } from "@/components/custom/CustomOrderStudio";

export const metadata: Metadata = {
  title: "Kişiye Özel Nakış ve Tasarım",
  description:
    "İsim ve monogram nakışlarını canlı önizleme ile deneyin, özel dijital nakış dosyası veya kurumsal logo nakışı talebi oluşturun.",
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
