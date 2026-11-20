import { route } from "@/server/http";
import { getCollections } from "@/server/modules/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "none" }, async () => ({ collections: await getCollections() }));
