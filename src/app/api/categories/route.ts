import { route } from "@/server/http";
import { getCategoryTree } from "@/server/modules/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "none" }, async () => ({ categories: await getCategoryTree() }));
