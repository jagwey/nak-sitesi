import type { Metadata } from "next";
import { HomeMonogramTeaser } from "@/components/custom/LiveMonogramPreview";

export const metadata: Metadata = {
  title: "Görselden nakışa ve isteğe özel parça",
  description: "Fotoğraf veya logonun nakışa çevrilmesi ve ölçüye özel parça. Talep formu bu vitrinde kapalıdır.",
};

export default function CustomDesignPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-[112px] sm:px-6 lg:px-10">
      <div className="border-b border-hairline pb-8">
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.35rem)] leading-tight">Görselden nakışa ve isteğe özel parça</h1>
        <p className="mt-3 max-w-[62ch] text-[1.125rem] leading-relaxed text-umber">
          Talep formu bu vitrinde kapalıdır. Otomatik dosya üretilmez. Aşağıdaki önizleme yalnızca yazı ve iplik denemesidir.
        </p>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section id="gorsel" className="scroll-mt-28 border-t border-cocoa pt-5">
          <h2 className="text-[1.5rem] font-semibold">Görselden nakışa çevirme</h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-umber">
            Fotoğraf veya logo, atölyede incelenip nakış dosyasına dönüştürülür. Bu sayfada dosya yükleme yoktur.
          </p>
        </section>
        <section id="parca" className="scroll-mt-28 border-t border-cocoa pt-5">
          <h2 className="text-[1.5rem] font-semibold">İsteğe özel parça</h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-umber">
            Havlu, keten veya giysi için yazı, ölçü ve adet ayrıca teklif edilir. Üretim bu vitrinden başlatılmaz.
          </p>
        </section>
      </div>
      <div className="pt-10 lg:pt-14"><HomeMonogramTeaser mode="preview" /></div>
    </div>
  );
}
