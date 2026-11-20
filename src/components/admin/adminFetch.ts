import { apiFetch, ApiError } from "@/lib/api";

/** Same-origin JSON fetch that throws ApiError with the server's Turkish message. */
export const adminFetch = apiFetch;

/** Turkish, user-presentable message for any thrown value. */
export function errMsg(e: unknown): string {
  if (e instanceof ApiError) {
    const d = e.details;
    if (Array.isArray(d) && d.length) {
      const first = d[0] as { message?: string };
      if (first?.message && first.message !== e.message) return `${e.message} ${first.message}`;
    }
    return e.message;
  }
  return "Beklenmeyen bir hata oluştu.";
}

/** Field errors ({path -> message}) from a VALIDATION ApiError, for inline display. */
export function fieldErrors(e: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (e instanceof ApiError && Array.isArray(e.details)) {
    for (const d of e.details as { path?: string | (string | number)[]; message?: string }[]) {
      const p = Array.isArray(d.path) ? d.path.join(".") : d.path;
      if (p && d.message && !out[p]) out[p] = d.message;
    }
  }
  return out;
}

/** multipart upload with progress (fetch cannot report upload progress). */
export function uploadForm<T = unknown>(url: string, form: FormData, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.responseType = "text";
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) onProgress(ev.loaded / ev.total);
    };
    xhr.onerror = () => reject(new ApiError(0, "NETWORK", "Yükleme sırasında bağlantı koptu. Tekrar deneyin."));
    xhr.onabort = () => reject(new ApiError(0, "ABORTED", "Yükleme iptal edildi."));
    xhr.onload = () => {
      let data: unknown = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* empty */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data as T);
      const e = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
      reject(new ApiError(xhr.status, e?.code ?? "ERROR", e?.message || "Yükleme tamamlanamadı.", e?.details));
    };
    xhr.send(form);
  });
}
