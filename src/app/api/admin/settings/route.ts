import { route } from "@/server/http";
import { getAllSettings, saveSettings } from "@/server/modules/settings/service";
import { settingsPatchSchema } from "@/server/modules/settings/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "settings:read" } }, async () => getAllSettings());

export const PUT = route({ auth: { permission: "settings:write" }, body: settingsPatchSchema }, async ({ body, user, ip }) =>
  saveSettings(body!, user!.id, ip)
);
