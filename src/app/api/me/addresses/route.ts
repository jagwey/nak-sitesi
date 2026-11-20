import { route, json } from "@/server/http";
import { addressCreateBody } from "@/server/modules/account/schema";
import { createAddress, listAddresses } from "@/server/modules/account/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "user" }, async ({ user }) => ({ addresses: await listAddresses(user!.id) }));

export const POST = route({ auth: "user", body: addressCreateBody }, async ({ user, body }) =>
  json({ address: await createAddress(user!.id, body) }, { status: 201 })
);
