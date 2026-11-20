// Commerce policy knobs. No "server-only": also used by the CLI job script.
export const MAX_QTY_PER_LINE = 20;
export const MAX_CART_LINES = 50;
/** Default max length of a personalization text when the product defines no ProductOption limit. */
export const DEFAULT_PERSONALIZATION_MAX = 18;

/** REFUND_REVOKES_DOWNLOADS (default true): a refunded order's download entitlements are revoked. */
export const refundRevokesDownloads = () => (process.env.REFUND_REVOKES_DOWNLOADS ?? "true").toLowerCase() !== "false";

/** DOWNLOAD_EXPIRY_DAYS (optional): entitlements expire N days after payment. Unset/0 = never. */
export const downloadExpiryDays = (): number | null => {
  const n = Number(process.env.DOWNLOAD_EXPIRY_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
};

/** Documented fallback shipping constants (kuruş). Overridable via SiteSettings "studio". */
export const SHIPPING_FALLBACK = { freeShippingThresholdKurus: 150000, standardShippingKurus: 8900 };

export const DIGITAL_TYPES = ["DIGITAL_EMBROIDERY", "DIGITAL_PRINT"] as const;
export const isDigitalType = (t: string) => (DIGITAL_TYPES as readonly string[]).includes(t);
