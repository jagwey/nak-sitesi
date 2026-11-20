"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { btnCls } from "./styles";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

/** Modal built on <dialog>: focus trap and Escape come from the platform. */
export function ConfirmDialog({ open, title, message, confirmLabel = "Onayla", cancelLabel = "Vazgeç", danger, busy, onConfirm, onCancel, children }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}
      className="m-auto w-[min(92vw,28rem)] rounded-lg border border-hairline bg-white p-5 text-ink shadow-xl backdrop:bg-black/40"
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title" className="font-display text-2xl">{title}</h2>
      {message ? <div className="mt-2 text-sm text-umber">{message}</div> : null}
      {children ? <div className="mt-3">{children}</div> : null}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={btnCls("secondary")} onClick={onCancel} disabled={busy}>{cancelLabel}</button>
        <button type="button" className={btnCls(danger ? "danger" : "primary")} onClick={onConfirm} disabled={busy}>{busy ? "İşleniyor…" : confirmLabel}</button>
      </div>
    </dialog>
  );
}
