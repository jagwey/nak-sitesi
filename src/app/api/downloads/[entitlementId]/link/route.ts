import { z } from "zod";
import { route } from "@/server/http";
import { createDownloadLink } from "@/server/modules/downloads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(
  { auth: "user", params: z.strictObject({ entitlementId: z.string().min(1).max(60) }) },
  async ({ req, user, params, ip }) => createDownloadLink({ id: user!.id }, params.entitlementId, ip, req.headers.get("user-agent"))
);
