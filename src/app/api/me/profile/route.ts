import { route } from "@/server/http";
import { profileBody } from "@/server/modules/auth/schema";
import { getProfile, updateProfile } from "@/server/modules/auth/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "user" }, async ({ user }) => ({ user: await getProfile(user!.id) }));

export const PATCH = route({ auth: "user", body: profileBody }, async ({ user, body }) => ({
  user: await updateProfile(user!.id, body),
}));
