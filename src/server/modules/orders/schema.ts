import { z } from "zod";

export const addressSnapshot = z.strictObject({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(25),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().max(12).optional(),
  country: z.string().trim().length(2).default("TR"),
});
export type AddressSnapshot = z.infer<typeof addressSnapshot>;

export const checkoutBody = z.strictObject({
  /** Required for guests; signed-in users use their account e-mail. */
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  phone: z.string().trim().min(7).max(25).optional(),
  /** Saved address of the signed-in user, or an inline address. Only needed when the cart has physical items. */
  addressId: z.string().min(1).max(60).optional(),
  shippingAddress: addressSnapshot.optional(),
  customerNote: z.string().trim().max(500).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutBody>;

export const orderNumberParams = z.strictObject({ number: z.string().trim().min(6).max(30) });
export const orderLookupQuery = z.strictObject({ guestToken: z.string().min(16).max(200).optional() });
