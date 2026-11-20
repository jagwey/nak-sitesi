"use client";

import Link from "next/link";

export const inputCls =
  "h-11 w-full border border-hairline bg-ivory px-3.5 text-[0.9375rem] text-ink outline-none transition-colors duration-200 placeholder:text-stone focus:border-cocoa";
export const primaryBtn =
  "inline-flex h-12 w-full items-center justify-center bg-cocoa px-7 text-[0.9375rem] font-medium text-[#FAF8F3] transition-colors duration-200 hover:bg-cocoa-hover disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryBtn =
  "inline-flex h-11 items-center justify-center border border-cocoa px-5 text-[0.875rem] font-medium text-cocoa transition-colors duration-200 hover:bg-cocoa hover:text-[#FAF8F3] disabled:cursor-not-allowed disabled:opacity-60";

export function safeNext(next?: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/hesabim";
  return next;
}

export function AuthShell({ title, intro, children, footer }: { title: string; intro?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[112px] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[440px]">
        <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight text-ink">{title}</h1>
        {intro && <p className="mt-2 text-[0.9375rem] text-umber">{intro}</p>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 border-t border-hairline pt-5 text-[0.9rem] text-umber">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[0.78rem] text-stone">{hint}</p>}
    </div>
  );
}

export function FormMessage({ kind, children }: { kind: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`border px-3.5 py-2.5 text-[0.875rem] ${kind === "error" ? "border-[#B4543C]/40 bg-[#B4543C]/5 text-[#8A3A26]" : "border-hairline bg-linen text-ink"}`}
    >
      {children}
    </p>
  );
}

export const TextLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-cocoa underline underline-offset-4 hover:text-ink">
    {children}
  </Link>
);
