import { json, route } from "@/server/http";
import { createProduct, listProducts } from "@/server/modules/admin-catalog/products";
import { productCreateSchema, productListQuery } from "@/server/modules/admin-catalog/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: { permission: "product:read" }, query: productListQuery }, async ({ query }) => listProducts(query!));

export const POST = route({ auth: { permission: "product:write" }, body: productCreateSchema }, async ({ body, user, ip }) => {
  const p = await createProduct(body!, { id: user!.id, ip });
  return json(p, { status: 201 });
});
