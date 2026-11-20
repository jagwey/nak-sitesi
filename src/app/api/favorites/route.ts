import { route, json } from "@/server/http";
import { favoriteBody, favoriteDeleteQuery } from "@/server/modules/favorites/schema";
import { addFavorite, listFavorites, removeFavorite } from "@/server/modules/favorites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "user" }, async ({ user }) => listFavorites(user!.id));

export const POST = route({ auth: "user", body: favoriteBody }, async ({ user, body }) => {
  await addFavorite(user!.id, body.productId);
  return json({ ok: true }, { status: 201 });
});

export const DELETE = route({ auth: "user", query: favoriteDeleteQuery }, async ({ user, query }) => {
  await removeFavorite(user!.id, query.productId);
  return { ok: true };
});
