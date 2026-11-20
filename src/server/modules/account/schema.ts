import { z } from "zod";

const phone = z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, "Geçerli bir telefon numarası girin.");

const fields = {
  label: z.string().trim().max(50).nullable().optional(),
  fullName: z.string().trim().min(2).max(100),
  phone,
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().max(10).nullable().optional(),
  country: z.string().trim().length(2).toUpperCase().default("TR"),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
};

export const addressCreateBody = z.strictObject(fields);
export const addressUpdateBody = z.strictObject({
  label: fields.label,
  fullName: fields.fullName.optional(),
  phone: phone.optional(),
  line1: fields.line1.optional(),
  line2: fields.line2,
  city: fields.city.optional(),
  district: fields.district.optional(),
  postalCode: fields.postalCode,
  country: z.string().trim().length(2).toUpperCase().optional(),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
});
export const idParams = z.strictObject({ id: z.string().min(1).max(40) });

export type AddressCreateInput = z.infer<typeof addressCreateBody>;
export type AddressUpdateInput = z.infer<typeof addressUpdateBody>;
