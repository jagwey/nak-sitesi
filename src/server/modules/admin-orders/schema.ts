import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const orderListQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(10000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  status: z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "IN_PRODUCTION", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED"]).optional(),
  paymentStatus: z.enum(["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]).optional(),
  fulfillment: z.enum(["NOT_REQUIRED", "PENDING", "IN_PROGRESS", "FULFILLED"]).optional(),
  type: z.enum(["digital", "physical"]).optional(),
  from: date.optional(),
  to: date.optional(),
});
export type OrderListQuery = z.infer<typeof orderListQuery>;

export const orderIdParams = z.strictObject({ id: z.string().min(1).max(64) });
export const shipmentParams = z.strictObject({ id: z.string().min(1).max(64), sid: z.string().min(1).max(64) });

export const statusBody = z.strictObject({ status: z.enum(["PROCESSING", "IN_PRODUCTION", "SHIPPED", "COMPLETED"]) });
export const shipBody = z.strictObject({
  carrier: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  estimatedPrepDays: z.number().int().min(0).max(120).optional(),
  markShipped: z.boolean().default(false),
});
export const shipmentStatusBody = z.strictObject({ status: z.enum(["PREPARING", "SHIPPED", "DELIVERED", "RETURNED"]) });
export const manualPaymentBody = z.strictObject({ reference: z.string().trim().min(5).max(200) });
