import type { ReactNode } from "react";
import atelier from "../../../public/images/hero-atelier-linen.webp";
import atelierMobile from "../../../public/images/hero-atelier-linen-mobile.webp";

export { DEFAULT_HERO_TITLE } from "@/lib/hero";

type HomeHeroProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function HomeHero({
  title,
  description,
  children,
}: HomeHeroProps) {
  return (
    <section className="relative w-full overflow-hidden bg-[#F2EEE5] lg:flex lg:min-h-[82svh] lg:max-h-[860px] lg:items-center">
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-8 pt-[104px] sm:px-6 lg:px-10 lg:py-24">
        <div className="max-w-[600px]">
          <h1 className="font-display text-[clamp(2.35rem,4.4vw,4rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink">
            {title}
          </h1>

          <p className="mt-5 max-w-[52ch] text-[1.125rem] leading-relaxed text-umber">
            {description}
          </p>

          {children}
        </div>
      </div>

      <div className="pointer-events-none relative aspect-[16/11] w-full overflow-hidden lg:absolute lg:inset-0 lg:aspect-auto">
        <picture>
          <source media="(max-width: 1023px)" srcSet={atelierMobile.src} />
          <img
            src={atelier.src}
            width={atelier.width}
            height={atelier.height}
            alt="Doğal ham keten üzerinde ahşap kasnakta botanik makine nakışı, pirinç makas ve ipek iplik makaraları"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover lg:object-right"
          />
        </picture>
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden bg-gradient-to-r from-[#F3EFE6]/90 via-[#F3EFE6]/40 to-transparent lg:block"
        />
      </div>
    </section>
  );
}
