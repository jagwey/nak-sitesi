import { route } from "@/server/http";
import { addressUpdateBody, idParams } from "@/server/modules/account/schema";
import { deleteAddress, getAddress, updateAddress } from "@/server/modules/account/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "user", params: idParams }, async ({ user, params }) => ({
  address: await getAddress(user!.id, params.id),
}));

export const PATCH = route({ auth: "user", params: idParams, body: addressUpdateBody }, async ({ user, params, body }) => ({
  address: await updateAddress(user!.id, params.id, body),
}));

export const DELETE = route({ auth: "user", params: idParams }, async ({ user, params }) => {
  await deleteAddress(user!.id, params.id);
  return { ok: true };
});
