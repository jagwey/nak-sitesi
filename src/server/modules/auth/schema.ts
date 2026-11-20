import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "./password";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Geçerli bir e-posta adresi girin."));

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`)
  .max(200);

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9 ()-]{7,20}$/, "Geçerli bir telefon numarası girin.");

// All edge schemas are strictObject: unknown keys are rejected (blocks mass assignment).
export const registerBody = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(100).optional(),
});

export const loginBody = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const tokenBody = z.strictObject({ token: z.string().min(20).max(200) });

export const requestResetBody = z.strictObject({ email: emailSchema });

export const resetPasswordBody = z.strictObject({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const profileBody = z.strictObject({
  name: z.string().trim().min(1).max(100).optional(),
  phone: phoneSchema.nullable().optional(),
});

export type RegisterInput = z.infer<typeof registerBody>;
export type LoginInput = z.infer<typeof loginBody>;
export type ProfileInput = z.infer<typeof profileBody>;
