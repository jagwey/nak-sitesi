import { route } from "@/server/http";
import { csvTemplate } from "@/server/modules/admin-catalog/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "product:write" } }, async ({ req }) => {
  const delim = new URL(req.url).searchParams.get("delimiter") === "," ? "," : ";";
  return new Response(csvTemplate(delim), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="urun-sablonu.csv"',
      "cache-control": "no-store",
    },
  });
});
