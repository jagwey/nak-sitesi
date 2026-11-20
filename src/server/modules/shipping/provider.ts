import "server-only";
import { db } from "../../db";
import { computeShipping, getShippingConfig } from "../cart/totals";
import type { ShippingProvider } from "../payments/provider";

/** Manual shipping: the studio ships itself and types the tracking number into the admin panel. */
export const manualShipping: ShippingProvider = {
  name: "manual",
  async quote({ subtotalKurus, hasPhysical }) {
    return computeShipping(await getShippingConfig(db), { hasPhysical, subtotalKurus, discountKurus: 0 });
  },
};

export const getShippingProvider = (): ShippingProvider => manualShipping;
