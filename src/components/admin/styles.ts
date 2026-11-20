/** Shared Tailwind class strings for the back office. Quiet, dense, 44px touch targets. */

export const inputCls =
  "h-11 w-full rounded-md border border-hairline-strong bg-white px-3 text-[15px] text-ink placeholder:text-stone focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold disabled:bg-linen/60 disabled:text-stone";
export const textareaCls =
  "min-h-24 w-full rounded-md border border-hairline-strong bg-white px-3 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-stone focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold disabled:bg-linen/60";
export const selectCls = inputCls + " pr-8";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<ButtonVariant, string> = {
  primary: "bg-cocoa text-white hover:bg-cocoa-hover",
  secondary: "border border-hairline-strong bg-white text-ink hover:bg-linen/60",
  danger: "border border-red-300 bg-white text-red-800 hover:bg-red-50",
  ghost: "text-umber hover:bg-linen/60",
};
export const btnCls = (variant: ButtonVariant = "secondary", extra = "") => `${base} ${variants[variant]} ${extra}`.trim();

export const cardCls = "rounded-lg border border-hairline bg-white p-4 sm:p-5";
