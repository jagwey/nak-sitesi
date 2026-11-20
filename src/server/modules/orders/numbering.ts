import "server-only";
import type { DbClient } from "../../db";

/**
 * Human-friendly, gap-tolerant, unique order numbers: TB-2026-000123.
 * One atomic upsert on a per-year counter row (SiteSettings key "orderSeq:<year>"); the row lock is held
 * until the checkout transaction ends, so numbers are unique even under concurrency (a rolled-back
 * checkout does not burn a number).
 */
export async function nextOrderNumber(tx: DbClient, now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const key = `orderSeq:${year}`;
  const rows = await tx.$queryRaw<{ n: number }[]>`
    INSERT INTO "SiteSettings" ("id", "key", "value", "updatedAt")
    VALUES (${"seq_" + year}, ${key}, to_jsonb(1), now())
    ON CONFLICT ("key") DO UPDATE SET "value" = to_jsonb((("SiteSettings"."value" #>> '{}')::int) + 1), "updatedAt" = now()
    RETURNING (("value" #>> '{}')::int) AS n`;
  return `TB-${year}-${String(rows[0].n).padStart(6, "0")}`;
}
