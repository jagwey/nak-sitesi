"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch, errMsg, btnCls, Notice, Uploader, StatusBadge } from "@/components/admin";

export interface DeclaredFormat { code: string; hasFile: boolean }
interface UploadResult { formatCode: string; version: number; duplicate: boolean; parsed: boolean; note: string }

export const formatBytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Embroidery file upload. The format is detected from the file itself (magic bytes), never from the name.
 * Shows which declared formats have a real file versus only a declaration.
 */
export function ProductFiles({ productId, declared, canWrite, onMetaRead }: { productId: string; declared: DeclaredFormat[]; canWrite: boolean; onMetaRead?: () => void }) {
  const router = useRouter();
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2">
        {declared.length === 0 ? <li className="text-sm text-umber">Henüz biçim seçilmedi.</li> : null}
        {declared.map((f) => (
          <li key={f.code}><StatusBadge tone={f.hasFile ? "success" : "warn"}>{f.code}: {f.hasFile ? "Dosya yüklü" : "Yalnızca beyan, dosya yok"}</StatusBadge></li>
        ))}
      </ul>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {notes.map((n, i) => <Notice key={i} tone={n.startsWith("Dosya çözümlenemedi") ? "warn" : "success"}>{n}</Notice>)}
      {canWrite ? (
        <Uploader
          url={`/api/admin/products/${productId}/files`}
          accept=".pes,.dst,.jef,.exp,.vp3,.hus,.xxx,.pec,.vip,.sew"
          multiple
          label="Nakış dosyası yükle"
          hint="Özel (private) depoda saklanır. Biçim dosya içeriğinden tanınır; aynı biçim tekrar yüklenirse yeni sürüm olur."
          onUploaded={(r) => {
            const x = r as UploadResult;
            setNotes((cur) => [...cur, `${x.formatCode} v${x.version}${x.duplicate ? " (aynı dosya zaten vardı)" : ""}: ${x.note}`]);
            onMetaRead?.();
          }}
          onBatchDone={() => router.refresh()}
        />
      ) : null}
      <button type="button" className={btnCls("ghost")} onClick={() => adminFetch(`/api/admin/products/${productId}/files`).then(() => router.refresh()).catch((e) => setError(errMsg(e)))}>Dosya listesini yenile</button>
    </div>
  );
}
