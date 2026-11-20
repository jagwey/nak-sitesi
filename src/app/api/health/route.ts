import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { route } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = route({}, async () => {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    throw new AppError("SERVICE_UNAVAILABLE");
  }
  return { ok: true };
});
