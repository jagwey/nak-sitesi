import { z } from "zod";
import { json, route } from "@/server/http";
import { uploadPublicImage } from "@/server/modules/admin-catalog/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generic image upload to the public bucket (category/collection images). Returns the public URL. */
export const POST = route(
  {
    auth: { permission: "file:write" },
    maxBodyBytes: 10 * 1024 * 1024,
    body: z.strictObject({
      file: z.instanceof(File, { message: "Görsel dosyası gerekli." }),
      kind: z.enum(["category", "collection"]).default("category"),
    }),
  },
  async ({ body }) => {
    const r = await uploadPublicImage(body!.file, body!.kind === "category" ? "categories" : "collections");
    return json({ url: r.url, key: r.key }, { status: 201 });
  }
);
