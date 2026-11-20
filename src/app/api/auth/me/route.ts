import { route } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "optional" }, async ({ user }) => {
  if (!user) return { user: null };
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      emailVerified: user.emailVerified,
      roles: user.roles,
      permissions: user.permissions,
    },
  };
});
