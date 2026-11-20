import { z } from "zod";
import { route } from "@/server/http";
import { listDigitalFiles } from "@/server/modules/admin-catalog/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(
  {
    auth: { permission: "file:write" },
    query: z.strictObject({
      q: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(5).max(100).default(30),
    }),
  },
  async ({ query }) => listDigitalFiles(query!)
);
