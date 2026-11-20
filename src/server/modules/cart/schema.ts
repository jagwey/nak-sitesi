import { z } from "zod";
import { MAX_QTY_PER_LINE } from "../../commerce-config";

/** Personalization as the storefront captures it. Unknown keys are rejected (strict). */
export const personalizationInput = z.strictObject({
  text: z.string().trim().max(60).optional(),
  fontStyle: z.string().trim().max(40).optional(),
  threadColorName: z.string().trim().max(60).optional(),
  threadColorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  motif: z.string().trim().max(60).optional(),
});
export type PersonalizationInput = z.infer<typeof personalizationInput>;

/**
 * NOTE: there is deliberately no price field. The client cannot send one (strict object => 400);
 * every price is computed on the server from the catalog.
 */
export const addItemBody = z.strictObject({
  /** Product id, slug or SKU. */
  productId: z.string().trim().min(1).max(120),
  variantId: z.string().trim().min(1).max(120).optional(),
  /** File format code, e.g. "VP3" (digital products). */
  format: z.string().trim().min(1).max(20).optional(),
  /** License code ("PERSONAL" | "SMALL_BUSINESS") or its display name (digital products). */
  license: z.string().trim().min(1).max(60).optional(),
  color: z.string().trim().min(1).max(60).optional(),
  size: z.string().trim().min(1).max(120).optional(),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE).default(1),
  personalization: personalizationInput.optional(),
});
export type AddItemInput = z.infer<typeof addItemBody>;

export const updateItemBody = z.strictObject({
  quantity: z.number().int().min(0).max(MAX_QTY_PER_LINE),
});

export const couponBody = z.strictObject({
  code: z.string().trim().min(1).max(40),
});

export const itemParams = z.strictObject({ id: z.string().min(1).max(60) });
