import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

/** Only https URLs on an allow-listed host. Rejects javascript:, data:, http:, userinfo tricks. */
function hostUrl(hosts: string[]) {
  return z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => {
        if (v === "") return true;
        try {
          const u = new URL(v);
          if (u.protocol !== "https:" || u.username || u.password) return false;
          const h = u.hostname.toLowerCase();
          return hosts.some((x) => h === x || h.endsWith(`.${x}`));
        } catch {
          return false;
        }
      },
      { message: `Yalnızca https ile ${hosts.join(" / ")} adresleri kabul edilir.` }
    );
}

const linkField = z
  .string()
  .trim()
  .max(300)
  .refine(
    (v) => {
      if (v === "") return true;
      if (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) return true;
      try {
        const u = new URL(v);
        return u.protocol === "https:" && !u.username && !u.password;
      } catch {
        return false;
      }
    },
    { message: "Bağlantı bir yol (/...) veya https adresi olmalı." }
  );

const logoField = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  if (/[\\\s]|%2f|%5c/i.test(value)) return false;

  const local = value.startsWith("/images/");
  const url = local ? URL.parse(value, "https://local.invalid") : URL.parse(value);
  if (!url || url.username || url.password || url.search || url.hash || !/\.(avif|jpe?g|png|svg|webp)$/i.test(url.pathname)) {
    return false;
  }
  if (local) return url.pathname.startsWith("/images/");

  const bucket = URL.parse(process.env.S3_PUBLIC_BASE_URL ?? "");
  return bucket !== null
    && (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:"))
    && url.origin === bucket.origin
    && url.pathname.startsWith(`${bucket.pathname.replace(/\/+$/, "")}/`);
}, { message: "Logo, /images/ altındaki veya herkese açık görsel kovasındaki bir görsel olmalı." });

export const siteSettingsSchema = z.strictObject({
  storeName: text(80),
  ownerName: text(160),
  logoUrl: logoField,
  contactEmail: z.union([z.literal(""), z.email().max(200)]),
  contactPhone: text(40),
  contactAddress: text(400),
  whatsapp: hostUrl(["wa.me"]),
  instagramUrl: hostUrl(["instagram.com"]),
  announcementEnabled: z.boolean(),
  announcementText: text(200),
  announcementLink: linkField,
  heroTitle: text(160),
  heroText: text(400),
  aboutText: text(6000),
  shippingInfo: text(3000),
  seoTitle: text(70),
  seoDescription: text(170),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const SITE_DEFAULTS: SiteSettings = {
  storeName: "Nakış Sitesi",
  ownerName: "",
  logoUrl: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  whatsapp: "",
  instagramUrl: "",
  announcementEnabled: false,
  announcementText: "",
  announcementLink: "",
  heroTitle: "",
  heroText: "",
  aboutText: "",
  shippingInfo: "",
  seoTitle: "",
  seoDescription: "",
};

export const shippingSettingsSchema = z.strictObject({
  standardShippingKurus: z.number().int().min(0).max(10_000_000),
  freeShippingThresholdKurus: z.number().int().min(0).max(100_000_000),
});

export const policySettingsSchema = z.strictObject({
  downloadLimit: z.number().int().min(1).max(100),
  downloadExpiryDays: z.number().int().min(0).max(3650),
  refundRevokesDownloads: z.boolean(),
});
export type PolicySettings = z.infer<typeof policySettingsSchema>;

export const LEGAL_KEYS = ["kvkk", "mesafeli-satis", "iade-iptal", "gizlilik", "cerez"] as const;
export type LegalKey = (typeof LEGAL_KEYS)[number];
export const LEGAL_LABELS: Record<LegalKey, string> = {
  kvkk: "KVKK aydınlatma metni",
  "mesafeli-satis": "Mesafeli satış sözleşmesi",
  "iade-iptal": "İade ve iptal koşulları",
  gizlilik: "Gizlilik politikası",
  cerez: "Çerez politikası",
};
export const legalSchema = z.strictObject({ key: z.enum(LEGAL_KEYS), body: text(40000) });

export const settingsPatchSchema = z.strictObject({
  site: siteSettingsSchema.partial().optional(),
  shipping: shippingSettingsSchema.partial().optional(),
  policy: policySettingsSchema.partial().optional(),
});
