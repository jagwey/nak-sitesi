export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "OUT_OF_STOCK"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "CSRF"
  | "PAYMENT_FAILED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL";

export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  OUT_OF_STOCK: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  CSRF: 403,
  PAYMENT_FAILED: 402,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL: 500,
};

/** Turkish, user-facing defaults. */
export const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: "Girdiğiniz bilgileri kontrol edin.",
  UNAUTHENTICATED: "Bu işlem için giriş yapmalısınız.",
  FORBIDDEN: "Bu işlem için yetkiniz yok.",
  NOT_FOUND: "Kayıt bulunamadı.",
  CONFLICT: "Bu işlem mevcut bir kayıtla çakışıyor.",
  RATE_LIMITED: "Çok fazla deneme yaptınız. Lütfen biraz sonra tekrar deneyin.",
  OUT_OF_STOCK: "Ürün stokta yeterli sayıda yok.",
  PAYLOAD_TOO_LARGE: "İstek çok büyük.",
  UNSUPPORTED_MEDIA_TYPE: "Desteklenmeyen içerik türü.",
  CSRF: "İstek doğrulanamadı.",
  PAYMENT_FAILED: "Ödeme işlemi tamamlanamadı.",
  SERVICE_UNAVAILABLE: "Hizmet şu anda hazır değil.",
  INTERNAL: "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly retryAfterSec?: number;

  constructor(code: ErrorCode, message?: string, opts?: { details?: unknown; retryAfterSec?: number; cause?: unknown }) {
    super(message ?? DEFAULT_MESSAGES[code], opts?.cause ? { cause: opts.cause } : undefined);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = opts?.details;
    this.retryAfterSec = opts?.retryAfterSec;
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
