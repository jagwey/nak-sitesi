import type { EmbroideryMetadata } from "@/data/products";
import { formatNumberTR } from "@/lib/format";

export const DEMO_DATA_NOTE =
  "Örnek veri — gerçek dosya bilgileri ürün yüklenince güncellenecek.";

export function DemoDataNote({ className = "", isDemo = false }: { className?: string; isDemo?: boolean }) {
  if (!isDemo) return null;
  return (
    <p className={`text-[0.8125rem] leading-snug text-cocoa ${className}`}>
      {DEMO_DATA_NOTE}
    </p>
  );
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-0.5 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <dt className="text-umber">{label}</dt>
      <dd className="break-words font-medium text-ink sm:text-right">{children}</dd>
    </div>
  );
}

/** Technical specification block: definition list with hairline dividers + thread chart. */
export function ProductSpecs({ embroidery, isDemo = false }: { embroidery: EmbroideryMetadata; isDemo?: boolean }) {
  return (
    <section
      aria-labelledby="teknik-bilgiler-baslik"
      className="mt-16 border-t border-hairline pt-12 lg:mt-20 lg:pt-14"
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2
            id="teknik-bilgiler-baslik"
            className="font-display text-[clamp(1.75rem,2.6vw,2.35rem)] leading-tight text-ink"
          >
            Teknik nakış özellikleri
          </h2>
          <p className="mt-2 text-[0.9375rem] text-umber">
            Bu desene ait kasnak, ölçü ve dikiş yoğunluğu bilgileri.
          </p>

          <dl className="mt-6 divide-y divide-hairline border-y border-hairline text-[0.9375rem]">
            <SpecRow label="Dosya formatları">{embroidery.formats.join(", ")}</SpecRow>
            <SpecRow label="Makine markaları">{embroidery.supportedMachines.join(", ")}</SpecRow>
            <SpecRow label="Kasnak ölçüsü">
              <span className="tabular-nums">{embroidery.hoopSize}</span>
            </SpecRow>
            <SpecRow label="Desen ölçüsü (en × boy)">
              <span className="tabular-nums">
                {embroidery.widthMm} × {embroidery.heightMm} mm
              </span>
            </SpecRow>
            <SpecRow label="Dikiş sayısı">
              <span className="tabular-nums">{formatNumberTR(embroidery.stitchCount)} dikiş</span>
            </SpecRow>
            <SpecRow label="İplik rengi">
              <span className="tabular-nums">{embroidery.colorCount} renk</span>
            </SpecRow>
            <SpecRow label="Renk değişimi">
              <span className="tabular-nums">{embroidery.colorChanges} adım</span>
            </SpecRow>
          </dl>
          <DemoDataNote className="mt-3" isDemo={isDemo} />
        </div>

        <div className="lg:col-span-7">
          <h2 className="font-display text-[clamp(1.6rem,2.4vw,2.15rem)] leading-tight text-ink">
            İplik renk tablosu ve dikiş sırası
          </h2>
          <p className="mt-2 text-[0.9375rem] text-umber">
            İplik tonları örnek renk haritasıdır; kumaşınıza göre kendi paletinizi uyarlayabilirsiniz.
          </p>

          <div className="mt-6 overflow-x-auto border-y border-hairline">
            <table className="w-full text-left text-[0.9375rem]">
              <caption className="sr-only">İplik renk tablosu ve dikiş sırası</caption>
              <thead>
                <tr className="border-b border-hairline text-[0.875rem] font-medium text-umber">
                  <th scope="col" className="py-3 pr-4">Sıra</th>
                  <th scope="col" className="py-3 pr-4">İplik tonu</th>
                  <th scope="col" className="py-3 pr-4">Referans kodu</th>
                  <th scope="col" className="py-3 text-right">Dikiş sayısı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {embroidery.threadChart.map((stop) => (
                  <tr key={stop.step}>
                    <td className="tabular-nums py-3.5 pr-4 text-umber">{stop.step}</td>
                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-3 text-ink">
                        <span
                          className="h-5 w-5 shrink-0 rounded-full border border-hairline-strong"
                          style={{ backgroundColor: stop.hex }}
                          aria-hidden="true"
                        />
                        <span className="font-medium">{stop.name}</span>
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-umber">{stop.code}</td>
                    <td className="tabular-nums py-3.5 text-right text-ink">
                      {formatNumberTR(stop.stitches)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
