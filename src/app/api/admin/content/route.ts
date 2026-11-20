import { route } from "@/server/http";
import { loadLegal, saveLegal } from "@/server/modules/settings/service";
import { legalSchema } from "@/server/modules/settings/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "settings:read" } }, async () => ({ legal: await loadLegal() }));

export const PUT = route({ auth: { permission: "settings:write" }, body: legalSchema }, async ({ body, user, ip }) => {
  await saveLegal(body!.key, body!.body, user!.id, ip);
  return { ok: true };
});
