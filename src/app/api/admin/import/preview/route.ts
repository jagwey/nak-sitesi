import { route } from "@/server/http";
import { previewImport } from "@/server/modules/admin-catalog/import";
import { importBodySchema } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Parses and validates only; writes nothing. */
export const POST = route({ auth: { permission: "product:write" }, body: importBodySchema, maxBodyBytes: 2_200_000 }, async ({ body }) => previewImport(body!.csv));
