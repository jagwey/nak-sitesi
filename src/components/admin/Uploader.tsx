"use client";

import { useId, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { errMsg, uploadForm } from "./adminFetch";
import { btnCls } from "./styles";

interface Item { name: string; progress: number; state: "uploading" | "done" | "error"; message?: string }

export interface UploaderProps {
  /** POST endpoint receiving multipart/form-data. */
  url: string;
  /** Form field name for the file. Default "file". */
  fieldName?: string;
  accept?: string;
  multiple?: boolean;
  /** Extra text fields sent with every file (e.g. alt). May be a function of the file. */
  fields?: Record<string, string> | ((file: File) => Record<string, string>);
  label?: string;
  hint?: string;
  disabled?: boolean;
  /** Return a message to reject a file before upload. */
  validate?: (file: File) => string | null;
  onUploaded?: (result: unknown, file: File) => void;
  /** Called once after every file in a batch finished (success or not). */
  onBatchDone?: () => void;
}

export function Uploader({ url, fieldName = "file", accept, multiple, fields, label = "Dosya seç", hint, disabled, validate, onUploaded, onBatchDone }: UploaderProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  async function run(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    const base = items.length;
    setItems((cur) => [...cur, ...files.map((f) => ({ name: f.name, progress: 0, state: "uploading" as const }))]);
    const patch = (i: number, p: Partial<Item>) => setItems((cur) => cur.map((it, idx) => (idx === base + i ? { ...it, ...p } : it)));
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const bad = validate?.(f);
      if (bad) { patch(i, { state: "error", message: bad }); continue; }
      const fd = new FormData();
      const extra = typeof fields === "function" ? fields(f) : fields;
      for (const [k, v] of Object.entries(extra ?? {})) fd.append(k, v);
      fd.append(fieldName, f);
      try {
        const res = await uploadForm(url, fd, (fr) => patch(i, { progress: fr }));
        patch(i, { state: "done", progress: 1 });
        onUploaded?.(res, f);
      } catch (e) {
        patch(i, { state: "error", message: errMsg(e) });
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    onBatchDone?.();
  }

  return (
    <div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled || busy}
        className="sr-only"
        onChange={(e) => void run(Array.from(e.target.files ?? []))}
      />
      <label htmlFor={id} className={btnCls("secondary", `cursor-pointer ${disabled || busy ? "pointer-events-none opacity-50" : ""}`)}>
        <UploadCloud size={18} aria-hidden /> {busy ? "Yükleniyor…" : label}
      </label>
      {hint ? <p className="mt-1 text-xs text-stone">{hint}</p> : null}
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {items.slice(-6).map((it, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-ink">{it.name}</span>
                <span className={`shrink-0 text-xs tabular-nums ${it.state === "error" ? "text-red-800" : "text-umber"}`}>
                  {it.state === "done" ? "Tamamlandı" : it.state === "error" ? "Hata" : `%${Math.round(it.progress * 100)}`}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-linen" role="progressbar" aria-valuenow={Math.round(it.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full ${it.state === "error" ? "bg-red-700" : "bg-gold"}`} style={{ width: `${Math.round(it.progress * 100)}%` }} />
              </div>
              {it.message ? <p role="alert" className="mt-1 text-xs text-red-800">{it.message}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
