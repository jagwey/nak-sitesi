import Link from "next/link";
import type { ReactNode } from "react";
import { btnCls, cardCls, type ButtonVariant } from "./styles";

/** Page title row with optional description and right-aligned actions. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-umber">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Plain white panel with an optional heading. */
export function Panel({ title, description, children, className = "" }: { title?: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`${cardCls} ${className}`}>
      {title ? <h2 className="font-display text-xl text-ink">{title}</h2> : null}
      {description ? <p className="mt-0.5 text-sm text-umber">{description}</p> : null}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

/** Label + control + hint/error wrapper. Pass the control as children; give it the same `htmlFor` id. */
export function FormField({ label, htmlFor, hint, error, required, children, className = "" }: { label: string; htmlFor?: string; hint?: string; error?: string | null; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-red-800"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-stone">{hint}</p> : null}
      {error ? <p role="alert" className="mt-1 text-xs text-red-800">{error}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-hairline-strong bg-white px-6 py-10 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-umber">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export type Tone = "neutral" | "success" | "warn" | "danger";
const tones: Record<Tone, string> = {
  neutral: "bg-linen text-umber",
  success: "bg-emerald-50 text-emerald-900",
  warn: "bg-amber-50 text-amber-900",
  danger: "bg-red-50 text-red-900",
};
export function StatusBadge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

const PRODUCT_STATUS: Record<string, [string, Tone]> = { ACTIVE: ["Yayında", "success"], DRAFT: ["Taslak", "warn"], ARCHIVED: ["Arşiv", "neutral"] };
export function ProductStatusBadge({ status }: { status: string }) {
  const [label, tone] = PRODUCT_STATUS[status] ?? [status, "neutral" as Tone];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  DIGITAL_EMBROIDERY: "Dijital nakış",
  PHYSICAL: "Fiziksel ürün",
  PERSONALIZED: "Kişiye özel",
  TEXTILE_PRINT: "Tekstil baskı",
  DIGITAL_PRINT: "Dijital baskı",
  BUNDLE: "Paket",
};

/** Inline message. `tone` danger uses role=alert. */
export function Notice({ tone = "neutral", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  const cls = { neutral: "border-hairline bg-linen/50 text-umber", success: "border-emerald-200 bg-emerald-50 text-emerald-900", warn: "border-amber-300 bg-amber-50 text-amber-900", danger: "border-red-300 bg-red-50 text-red-900" }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`rounded-md border px-3 py-2.5 text-sm ${cls}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-0.5" : ""}>{children}</div> : null}
    </div>
  );
}

/** Link styled as a button (server-safe). */
export function LinkButton({ href, variant = "secondary", children, className = "" }: { href: string; variant?: ButtonVariant; children: ReactNode; className?: string }) {
  return <Link href={href} className={btnCls(variant, className)}>{children}</Link>;
}

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hide this column in the stacked mobile layout. */
  hideOnMobile?: boolean;
  /** Primary column: rendered as the card title on mobile. */
  primary?: boolean;
}

/** Table from md up; stacked label/value cards below. Pure render, safe in server and client components. */
export function DataTable<T>({ columns, rows, rowKey, empty }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: ReactNode }) {
  if (rows.length === 0) return <>{empty ?? <EmptyState title="Kayıt yok" />}</>;
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-hairline bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline bg-linen/40 text-xs uppercase tracking-wide text-umber">
            <tr>{columns.map((c) => <th key={c.key} scope="col" className={`px-3 py-2.5 font-semibold ${c.className ?? ""}`}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((r) => (
              <tr key={rowKey(r)} className="align-middle hover:bg-ivory">
                {columns.map((c) => <td key={c.key} className={`px-3 py-2.5 ${c.className ?? ""}`}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="rounded-lg border border-hairline bg-white p-3">
            <div className="text-sm font-semibold text-ink">{primary.cell(r)}</div>
            <dl className="mt-2 space-y-1.5">
              {rest.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                  <dt className="shrink-0 text-stone">{c.header}</dt>
                  <dd className="min-w-0 text-right text-ink">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Link-based pagination. `params` are the other query params to keep (page is managed here). */
export function Pagination({ basePath, page, pageSize, total, params = {} }: { basePath: string; page: number; pageSize: number; total: number; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-3 text-xs text-stone tabular-nums">{total} kayıt</p>;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav aria-label="Sayfalama" className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xs text-stone tabular-nums">{total} kayıt · Sayfa {page}/{pages}</p>
      <div className="flex gap-2">
        {page > 1 ? <Link href={href(page - 1)} className={btnCls("secondary")}>Önceki</Link> : null}
        {page < pages ? <Link href={href(page + 1)} className={btnCls("secondary")}>Sonraki</Link> : null}
      </div>
    </nav>
  );
}
