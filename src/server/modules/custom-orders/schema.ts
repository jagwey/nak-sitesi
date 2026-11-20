import { z } from "zod";

export const PRODUCT_TYPES = ["İsim ve Monogram İşleme", "Özel Dijital Nakış Dosyası", "Kurumsal Logo Nakışı"] as const;
export const MAX_FILES = 5;

const optText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());

const fileList = z.preprocess(
  (v) => (v === undefined || v === null || v === "" ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.instanceof(File)).max(MAX_FILES, `En fazla ${MAX_FILES} referans görseli yükleyebilirsiniz.`)
);

/** Multipart form (all text values arrive as strings). */
export const createCustomOrderBody = z.strictObject({
  name: z.string().trim().min(2, "Adınızı yazın.").max(120),
  email: z.email("Geçerli bir e-posta girin.").max(200),
  phone: optText(30),
  productType: z.enum(PRODUCT_TYPES),
  text: z.string().trim().min(2, "Talebinizi kısaca açıklayın.").max(2000),
  size: optText(60),
  threadColor: optText(60),
  machineModel: optText(80),
  format: optText(20),
  notes: optText(2000),
  initials: optText(60),
  deadline: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih biçimi geçersiz.").optional()),
  budgetTl: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).max(1_000_000).optional()),
  consent: z.preprocess((v) => v === "true" || v === "on" || v === true, z.literal(true, { error: "KVKK aydınlatma metnini onaylamalısınız." })),
  /** Honeypot: real users never fill this. */
  website: z.string().max(200).optional(),
  files: fileList.optional(),
});
export type CreateCustomOrderInput = z.infer<typeof createCustomOrderBody>;

export const idParams = z.strictObject({ id: z.string().min(1).max(64) });
export const tokenParams = z.strictObject({ token: z.string().min(16).max(200) });

export const adminListQuery = z.strictObject({
  status: z.enum(["NEW", "REVIEWING", "QUOTED", "ACCEPTED", "REJECTED", "CANCELLED", "CONVERTED"]).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminStatusBody = z.strictObject({ status: z.enum(["REVIEWING", "REJECTED", "CANCELLED"]) });

export const quoteBody = z.strictObject({
  priceKurus: z.number().int().min(100).max(100_000_000),
  prepDays: z.number().int().min(1).max(365),
  note: z.string().trim().max(1500).optional(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih biçimi geçersiz."),
});

export const decisionBody = z.strictObject({ decision: z.enum(["ACCEPT", "REJECT"]) });
