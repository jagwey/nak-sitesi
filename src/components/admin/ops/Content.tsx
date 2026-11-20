"use client";

import { useEffect, useState } from "react";
import { adminFetch, btnCls, FormField, Notice, Panel, selectCls, textareaCls } from "@/components/admin";
import { Feedback, LoadState, useAction, useLoad } from "./shared";

const KEYS: [string, string][] = [
  ["kvkk", "KVKK aydınlatma metni"],
  ["mesafeli-satis", "Mesafeli satış sözleşmesi"],
  ["iade-iptal", "İade ve iptal koşulları"],
  ["gizlilik", "Gizlilik politikası"],
  ["cerez", "Çerez politikası"],
];

export function ContentEditor() {
  const { data, error, loading, reload } = useLoad<{ legal: Record<string, string> }>("/api/admin/content");
  const act = useAction(reload);
  const [key, setKey] = useState("kvkk");
  const [body, setBody] = useState("");
  useEffect(() => { if (data) setBody(data.legal[key] ?? ""); }, [data, key]);
  return (
    <LoadState loading={loading} error={error} data={data}>
      <div className="space-y-5">
        <Notice tone="warn" title="Hukuki metinler">Bu metinleri bir hukuk uzmanına onaylatın. Boş bırakılan metin sitede yayımlanmaz.</Notice>
        <Feedback error={act.error} done={act.done} />
        <Panel>
          <div className="space-y-3">
            <FormField label="Metin" htmlFor="ct-k">
              <select id="ct-k" className={selectCls} value={key} onChange={(e) => setKey(e.target.value)}>
                {KEYS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </FormField>
            <FormField label="İçerik (düz metin)" htmlFor="ct-b">
              <textarea id="ct-b" rows={16} className={textareaCls} value={body} onChange={(e) => setBody(e.target.value)} />
            </FormField>
            <button type="button" className={btnCls("primary")} disabled={act.busy} onClick={() => act.run(() => adminFetch("/api/admin/content", { method: "PUT", body: { key, body } }), "Metin kaydedildi.")}>Kaydet</button>
          </div>
        </Panel>
      </div>
    </LoadState>
  );
}
