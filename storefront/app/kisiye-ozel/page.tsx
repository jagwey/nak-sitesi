import type { Metadata } from "next";
import { HomeMonogramTeaser } from "@/components/custom/LiveMonogramPreview";

export const metadata: Metadata = {
  title: "Kişiye Özel Tasarım",
  description: "İsim veya monogramı kumaş, motif ve iplik seçenekleriyle canlı önizleyin.",
};

export default function CustomDesignPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-[112px] sm:px-6 lg:px-10">
      <div className="border-b border-hairline pb-8">
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.35rem)] leading-tight">Kişiye Özel Tasarım</h1>
        <p className="mt-3 max-w-[62ch] text-umber">
          İsim ve monogram nakışını canlı deneyin. Özel sipariş talepleri şu an kapalı.
        </p>
      </div>
      <div className="pt-10 lg:pt-14"><HomeMonogramTeaser mode="preview" /></div>
    </div>
  );
}
