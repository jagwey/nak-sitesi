import { route } from "@/server/http";
import { listUserDownloads } from "@/server/modules/downloads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "user" }, async ({ user }) => ({ downloads: await listUserDownloads(user!.id) }));
