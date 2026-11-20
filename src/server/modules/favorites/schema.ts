import { z } from "zod";

export const favoriteBody = z.strictObject({ productId: z.string().min(1).max(64) });
export const favoriteDeleteQuery = z.strictObject({ productId: z.string().min(1).max(64) });
