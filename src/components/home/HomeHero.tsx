import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";

export const DEFAULT_HERO_TITLE = "Nakış makinesi desenleri ve el işi tekstiller";

type HomeHeroProps = {
  title: string;
  description: string;
  image?: string | StaticImageData;
  children: ReactNode;
};

export function HomeHero({
  title,
  description,
  image = "/images/hero-atelier-linen.webp",
  children,
}: HomeHeroProps) {
  return (
    <section className="relative w-full overflow-hidden bg-[#F2EEE5] lg:flex lg:min-h-[82svh] lg:max-h-[860px] lg:items-center">
      <div className="pointer-events-none relative hidden lg:block lg:absolute lg:inset-0">
        <Image
          src={image}
          alt="Doğal ham keten üzerinde ahşap kasnakta botanik makine nakışı, pirinç makas ve ipek iplik makaraları"
          fill
          priority
          sizes="100vw"
          className="object-cover object-right"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#F3EFE6]/90 via-[#F3EFE6]/40 to-transparent"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-8 pt-[104px] sm:px-6 lg:px-10 lg:py-24">
        <div className="max-w-[600px]">
          <h1 className="font-display text-[clamp(2.4rem,4.8vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.02em] text-ink">
            {title}
          </h1>

          <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-umber">
            {description}
          </p>

          {children}
        </div>
      </div>

      <div className="relative aspect-[16/11] w-full overflow-hidden lg:hidden">
        <Image
          src={image}
          alt="Doğal ham keten üzerinde ahşap kasnakta botanik makine nakışı, pirinç makas ve ipek iplik makaraları"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[78%_center]"
        />
      </div>
    </section>
  );
}
