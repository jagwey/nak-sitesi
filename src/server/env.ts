import "server-only";
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .default("false")
  .transform((v) => v === "true" || v === "1");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.url(),

    DATABASE_URL: z.string().min(1),
    DATABASE_URL_TEST: z.string().optional(),

    SESSION_SECRET: z.string().min(32, "SESSION_SECRET en az 32 karakter olmalı"),

    S3_ENDPOINT: z.string().min(1),
    S3_PRESIGN_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().default("us-east-1"),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_BUCKET_PRIVATE: z.string().min(1),
    S3_BUCKET_PUBLIC: z.string().min(1),
    S3_PUBLIC_BASE_URL: z.string().min(1),
    S3_FORCE_PATH_STYLE: bool,

    EMAIL_TRANSPORT: z.enum(["smtp", "console"]).default("console"),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().default(1025),
    SMTP_USER: z.string().default(""),
    SMTP_PASS: z.string().default(""),
    SMTP_FROM: z.string().default("no-reply@localhost"),
    ADMIN_NOTIFY_EMAIL: z.union([z.literal(""), z.email()]).default(""),

    PAYMENT_PROVIDER: z.enum(["none", "simulated", "iyzico", "paytr", "shopier"]).default("none"),
    PAYMENT_SIMULATION_ENABLED: bool,
    /** HMAC secret for simulated payment events. Required (>=16 chars) whenever simulation is enabled; there is no fallback. */
    PAYMENT_SIMULATION_SECRET: z.string().default(""),
    IYZICO_API_KEY: z.string().default(""),
    IYZICO_SECRET_KEY: z.string().default(""),
    IYZICO_BASE_URL: z.string().default("https://sandbox-api.iyzipay.com"),
    PAYTR_MERCHANT_ID: z.string().default(""),
    PAYTR_MERCHANT_KEY: z.string().default(""),
    PAYTR_MERCHANT_SALT: z.string().default(""),
    /** Shopier OSB (Otomatik Sipariş Bildirimi) kullanıcı adı. PAYMENT_PROVIDER=shopier iken zorunlu. */
    SHOPIER_OSB_USERNAME: z.string().default(""),
    /** Shopier OSB şifresi. HMAC anahtarıdır; koda yazılmaz. */
    SHOPIER_OSB_KEY: z.string().default(""),
    /** Shopier kişisel erişim anahtarı. Yalnızca sync ve webhook kayıt betikleri kullanır. */
    SHOPIER_PAT: z.string().default(""),
    /** Shopier webhook token. Abonelik oluşturulurken bir kez döner; Shopier-Signature anahtarıdır. */
    SHOPIER_WEBHOOK_SECRET: z.string().default(""),
    /** Ürün bağlantısı yokken satın alma düğmesinin gideceği mağaza adresi. */
    SHOPIER_STORE_URL: z.string().default("https://www.shopier.com/Jagnakis"),
    /** Shopier REST kökü. Sync betiği okur. */
    SHOPIER_API_BASE_URL: z.string().default("https://api.shopier.com/v1"),

    DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    DOWNLOAD_LIMIT_DEFAULT: z.coerce.number().int().positive().default(5),
    RESERVATION_TTL_MINUTES: z.coerce.number().int().positive().default(30),
    UPLOAD_MAX_MB: z.coerce.number().positive().default(50),
    /** Refunded orders revoke their download entitlements (default true). */
    REFUND_REVOKES_DOWNLOADS: z
      .enum(["true", "false", "1", "0", ""])
      .default("true")
      .transform((v) => v !== "false" && v !== "0"),
    /** Entitlements expire N days after payment; 0 = never. */
    DOWNLOAD_EXPIRY_DAYS: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === "production") {
      // Payment simulation must be impossible in production, regardless of configuration.
      if (v.PAYMENT_SIMULATION_ENABLED) {
        ctx.addIssue({ code: "custom", path: ["PAYMENT_SIMULATION_ENABLED"], message: "Üretimde ödeme simülasyonu kapalı olmalı" });
      }
      if (v.PAYMENT_PROVIDER === "simulated") {
        ctx.addIssue({ code: "custom", path: ["PAYMENT_PROVIDER"], message: "Üretimde PAYMENT_PROVIDER=simulated kullanılamaz" });
      }
      if (!v.APP_URL.startsWith("https://")) {
        ctx.addIssue({ code: "custom", path: ["APP_URL"], message: "Üretimde APP_URL https olmalı" });
      }
      if (v.S3_PRESIGN_ENDPOINT && !v.S3_PRESIGN_ENDPOINT.startsWith("https://")) {
        ctx.addIssue({ code: "custom", path: ["S3_PRESIGN_ENDPOINT"], message: "Üretimde S3_PRESIGN_ENDPOINT https olmalı" });
      }
    }
    if (v.NODE_ENV === "test" && !v.DATABASE_URL_TEST) {
      ctx.addIssue({ code: "custom", path: ["DATABASE_URL_TEST"], message: "Test için DATABASE_URL_TEST gerekli" });
    }
    if (v.PAYMENT_SIMULATION_ENABLED && v.PAYMENT_SIMULATION_SECRET.length < 16) {
      ctx.addIssue({ code: "custom", path: ["PAYMENT_SIMULATION_SECRET"], message: "PAYMENT_SIMULATION_ENABLED=true iken PAYMENT_SIMULATION_SECRET (en az 16 karakter) gerekli" });
    }
    if (v.PAYMENT_PROVIDER === "simulated" && !v.PAYMENT_SIMULATION_ENABLED) {
      ctx.addIssue({ code: "custom", path: ["PAYMENT_SIMULATION_ENABLED"], message: "PAYMENT_PROVIDER=simulated için PAYMENT_SIMULATION_ENABLED=true gerekli" });
    }
    if (v.PAYMENT_PROVIDER === "shopier") {
      if (!v.SHOPIER_OSB_USERNAME.trim()) {
        ctx.addIssue({ code: "custom", path: ["SHOPIER_OSB_USERNAME"], message: "PAYMENT_PROVIDER=shopier için SHOPIER_OSB_USERNAME gerekli" });
      }
      if (!v.SHOPIER_OSB_KEY) {
        ctx.addIssue({ code: "custom", path: ["SHOPIER_OSB_KEY"], message: "PAYMENT_PROVIDER=shopier için SHOPIER_OSB_KEY gerekli" });
      }
      const store = URL.parse(v.SHOPIER_STORE_URL);
      if (!store || store.protocol !== "https:" || !["shopier.com", "www.shopier.com"].includes(store.host) || store.username || store.password || store.pathname === "/") {
        ctx.addIssue({ code: "custom", path: ["SHOPIER_STORE_URL"], message: "SHOPIER_STORE_URL https://www.shopier.com üzerindeki mağaza adresi olmalı" });
      }
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validate (once) and return the environment. Throws a readable error listing every bad key. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`Geçersiz ortam değişkenleri:\n${lines.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}

/**
 * Lazy proxy: importing this module never throws (so `next build` of static pages
 * works without a configured environment); the first property access validates.
 */
export const env: Env = new Proxy({} as Env, {
  get: (_t, prop) => getEnv()[prop as keyof Env],
  has: (_t, prop) => prop in getEnv(),
  ownKeys: () => Reflect.ownKeys(getEnv()),
  getOwnPropertyDescriptor: (_t, prop) => Reflect.getOwnPropertyDescriptor(getEnv(), prop),
});

/** Test-only: forget the cached parse. */
export function __resetEnvForTests() {
  cached = undefined;
}

/** Single source of truth for "may payments be simulated right now". Always false in production. */
export function isPaymentSimulationAllowed(): boolean {
  const e = getEnv();
  return e.NODE_ENV !== "production" && e.PAYMENT_SIMULATION_ENABLED && e.PAYMENT_PROVIDER === "simulated";
}

/** Visitors can browse and price their basket while production payments are offline. */
export function isStoreCheckoutOpen(): boolean {
  const e = getEnv();
  // Shopier tahsilatı mağaza sayfasında olur; yerel sepet checkout'u siparişi PAID yapamaz.
  if (e.PAYMENT_PROVIDER === "shopier") return false;
  return e.NODE_ENV !== "production" || e.PAYMENT_PROVIDER !== "none";
}
