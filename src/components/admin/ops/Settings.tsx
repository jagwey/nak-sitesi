"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, btnCls, FormField, inputCls, Panel, textareaCls, fieldErrors } from "@/components/admin";
import { Feedback, LoadState, useAction, useLoad } from "./shared";

type Site = Record<string, string | boolean>;
interface Data {
  site: Site;
  shipping: { standardShippingKurus: number; freeShippingThresholdKurus: number };
  policy: { downloadLimit: number; downloadExpiryDays: number; refundRevokesDownloads: boolean };
}

const TEXT_FIELDS: [string, string, string?][] = [
  ["storeName", "Mağaza adı"],
  ["ownerName", "Yayınlanacak işletme sahibi veya unvan"],
  ["logoUrl", "Logo adresi", "Herkese açık görsel kovasındaki adresi veya /images/ ile başlayan görsel yolunu girin."],
  ["contactEmail", "İletişim e-postası"],
  ["contactPhone", "Telefon"],
  ["whatsapp", "WhatsApp bağlantısı", "Yalnızca wa.me adresi."],
  ["instagramUrl", "Instagram bağlantısı", "Yalnızca instagram.com adresi."],
  ["seoTitle", "SEO başlığı"],
];
const AREA_FIELDS: [string, string][] = [
  ["contactAddress", "Adres"],
  ["heroTitle", "Ana sayfa başlığı"],
  ["heroText", "Ana sayfa metni"],
  ["aboutText", "Hakkımızda metni"],
  ["shippingInfo", "Kargo bilgisi"],
  ["seoDescription", "SEO açıklaması"],
];
const tl = (k: number) => String(k / 100).replace(".", ",");
const toKurus = (s: string) => Math.round(Number(s.replace(",", ".")) * 100);

export function SettingsForm() {
  const router = useRouter();
  const { data, error, loading, reload } = useLoad<Data>("/api/admin/settings");
  const act = useAction(reload);
  const [site, setSite] = useState<Site>({});
  const [ship, setShip] = useState({ std: "", free: "" });
  const [pol, setPol] = useState({ limit: "", days: "", revoke: true });
  const [fe, setFe] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    setSite(data.site);
    setShip({ std: tl(data.shipping.standardShippingKurus), free: tl(data.shipping.freeShippingThresholdKurus) });
    setPol({ limit: String(data.policy.downloadLimit), days: String(data.policy.downloadExpiryDays), revoke: data.policy.refundRevokesDownloads });
  }, [data]);

  const val = (k: string) => (typeof site[k] === "string" ? (site[k] as string) : "");
  const setS = (k: string, v: string | boolean) => setSite((s) => ({ ...s, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFe({});
    await act.run(async () => {
      try {
        await adminFetch("/api/admin/settings", {
          method: "PUT",
          body: {
            site,
            shipping: { standardShippingKurus: toKurus(ship.std), freeShippingThresholdKurus: toKurus(ship.free) },
            policy: { downloadLimit: Number(pol.limit), downloadExpiryDays: Number(pol.days), refundRevokesDownloads: pol.revoke },
          },
        });
        router.refresh();
      } catch (err) {
        setFe(fieldErrors(err));
        throw err;
      }
    }, "Ayarlar kaydedildi.");
  }

  return (
    <LoadState loading={loading} error={error} data={data}>
      {data && (
        <form onSubmit={save} className="space-y-5">
          <Feedback error={act.error} done={act.done} />
          <Panel title="Mağaza ve iletişim" description="Logo, işletme sahibi ve iletişim alanları isteğe bağlıdır. Bu bilgiler mağazada herkese açık görünür.">
            <div className="grid gap-3 sm:grid-cols-2">
              {TEXT_FIELDS.map(([k, label, hint]) => (
                <FormField key={k} label={label} htmlFor={`s-${k}`} hint={hint} error={fe[`site.${k}`] ?? fe[k]}>
                  <input id={`s-${k}`} className={inputCls} value={val(k)} onChange={(e) => setS(k, e.target.value)} />
                </FormField>
              ))}
              {AREA_FIELDS.map(([k, label]) => (
                <FormField key={k} label={label} htmlFor={`s-${k}`} error={fe[`site.${k}`] ?? fe[k]} className="sm:col-span-2">
                  <textarea id={`s-${k}`} rows={3} className={textareaCls} value={val(k)} onChange={(e) => setS(k, e.target.value)} />
                </FormField>
              ))}
            </div>
          </Panel>
          <Panel title="Duyuru çubuğu">
            <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
              <input type="checkbox" className="h-5 w-5" checked={site.announcementEnabled === true} onChange={(e) => setS("announcementEnabled", e.target.checked)} />
              Duyuru çubuğunu göster
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <FormField label="Duyuru metni" htmlFor="s-at"><input id="s-at" className={inputCls} value={val("announcementText")} onChange={(e) => setS("announcementText", e.target.value)} /></FormField>
              <FormField label="Duyuru bağlantısı" htmlFor="s-al" hint="Site içi yol (/...) veya https adresi." error={fe["site.announcementLink"]}><input id="s-al" className={inputCls} value={val("announcementLink")} onChange={(e) => setS("announcementLink", e.target.value)} /></FormField>
            </div>
          </Panel>
          <Panel title="Kargo">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Standart kargo (TL)" htmlFor="sh-s"><input id="sh-s" inputMode="decimal" className={inputCls} value={ship.std} onChange={(e) => setShip({ ...ship, std: e.target.value })} /></FormField>
              <FormField label="Ücretsiz kargo eşiği (TL)" htmlFor="sh-f"><input id="sh-f" inputMode="decimal" className={inputCls} value={ship.free} onChange={(e) => setShip({ ...ship, free: e.target.value })} /></FormField>
            </div>
          </Panel>
          <Panel title="Dijital indirme politikası">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="İndirme hakkı (adet)" htmlFor="p-l"><input id="p-l" inputMode="numeric" className={inputCls} value={pol.limit} onChange={(e) => setPol({ ...pol, limit: e.target.value })} /></FormField>
              <FormField label="Geçerlilik (gün, 0 = süresiz)" htmlFor="p-d"><input id="p-d" inputMode="numeric" className={inputCls} value={pol.days} onChange={(e) => setPol({ ...pol, days: e.target.value })} /></FormField>
            </div>
            <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-ink">
              <input type="checkbox" className="h-5 w-5" checked={pol.revoke} onChange={(e) => setPol({ ...pol, revoke: e.target.checked })} />
              İade edilen siparişin indirme hakları iptal edilsin
            </label>
          </Panel>
          <button type="submit" className={btnCls("primary")} disabled={act.busy}>Kaydet</button>
        </form>
      )}
    </LoadState>
  );
}
