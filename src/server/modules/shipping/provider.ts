import "server-only";
import { db } from "../../db";
import { computeShipping, getShippingConfig } from "../cart/totals";

export interface ShippingProvider {
  readonly name: string;
  /** Fee (kuruş) charged to the customer; digital-only baskets never reach this. */
  quote(a: { subtotalKurus: number; hasPhysical: boolean }): Promise<number>;
  createLabel?(a: { orderNumber: string }): Promise<{ trackingNumber: string; carrier: string }>;
}

/** Manual shipping: the studio ships itself and types the tracking number into the admin panel. */
export const manualShipping: ShippingProvider = {
  name: "manual",
  async quote({ subtotalKurus, hasPhysical }) {
    return computeShipping(await getShippingConfig(db), { hasPhysical, subtotalKurus, discountKurus: 0 });
  },
};

export const getShippingProvider = (): ShippingProvider => manualShipping;
