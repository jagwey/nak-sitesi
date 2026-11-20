import "server-only";
import { db, type DbClient } from "./db";
import { AppError } from "./errors";
import { sha256Hex } from "./crypto";

export interface RateLimitRule {
  /** Logical bucket name, e.g. "login:ip". */
  name: string;
  /** Identifier (ip, email, user id). It is hashed before storage. */
  id: string;
  limit: number;
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  retryAfterSec: number;
}

const keyOf = (name: string, id: string) => `${name}:${sha256Hex(id.toLowerCase()).slice(0, 32)}`;

interface Row {
  count: number;
  windowStart: Date;
}

function result(row: Row, limit: number, windowSec: number): RateLimitResult {
  const elapsed = (Date.now() - row.windowStart.getTime()) / 1000;
  const retryAfterSec = Math.max(1, Math.ceil(windowSec - elapsed));
  return {
    allowed: row.count <= limit,
    count: row.count,
    remaining: Math.max(0, limit - row.count),
    retryAfterSec,
  };
}

/**
 * DB-backed fixed window counter (works across instances). Atomic upsert: the window
 * resets when it is older than `windowSec`. Consumes one hit.
 */
export async function hitRateLimit(rule: RateLimitRule, client: DbClient = db): Promise<RateLimitResult> {
  const key = keyOf(rule.name, rule.id);
  const rows = await client.$queryRaw<Row[]>`
    INSERT INTO "RateLimit" ("id", "key", "count", "windowStart")
    VALUES (${"rl_" + sha256Hex(key).slice(0, 24)}, ${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - (${rule.windowSec} * interval '1 second')
                     THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - (${rule.windowSec} * interval '1 second')
                           THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart"`;
  return result(rows[0], rule.limit, rule.windowSec);
}

/** Read-only check (does not consume a hit). Returns allowed=true when no active window. */
export async function peekRateLimit(rule: RateLimitRule, client: DbClient = db): Promise<RateLimitResult> {
  const key = keyOf(rule.name, rule.id);
  const row = await client.rateLimit.findUnique({ where: { key } });
  if (!row || Date.now() - row.windowStart.getTime() > rule.windowSec * 1000) {
    return { allowed: true, count: 0, remaining: rule.limit, retryAfterSec: 0 };
  }
  const r = result(row, rule.limit, rule.windowSec);
  // peek semantic: blocked once count has reached the limit
  return { ...r, allowed: row.count < rule.limit };
}

export async function resetRateLimit(name: string, id: string, client: DbClient = db): Promise<void> {
  await client.rateLimit.deleteMany({ where: { key: keyOf(name, id) } });
}

/** Consume a hit and throw RATE_LIMITED when over the limit. */
export async function enforceRateLimit(rule: RateLimitRule, client: DbClient = db): Promise<RateLimitResult> {
  const r = await hitRateLimit(rule, client);
  if (!r.allowed) throw new AppError("RATE_LIMITED", undefined, { retryAfterSec: r.retryAfterSec });
  return r;
}

/** Delete expired windows (call from a cron/maintenance job). */
export async function purgeExpiredRateLimits(olderThanSec = 86400, client: DbClient = db): Promise<number> {
  const res = await client.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - olderThanSec * 1000) } } });
  return res.count;
}
