import { route } from "@/server/http";
import { commitImport } from "@/server/modules/admin-catalog/import";
import { importBodySchema } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Re-validates the CSV on the server, then imports as DRAFT products. */
export const POST = route({ auth: { permission: "product:write" }, body: importBodySchema, maxBodyBytes: 2_200_000 }, async ({ body, user, ip }) =>
  commitImport(body!.csv, body!.mode ?? "all_or_nothing", { id: user!.id, ip })
);
