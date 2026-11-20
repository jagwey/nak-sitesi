import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db, type DbClient } from "./db";
import { hashIp } from "./crypto";

const SECRET_KEY = /pass(word)?|secret|token|hash|api[-_]?key|authorization|cookie|card|cvv|iban|session/i;

/** Deep-copy `value` replacing the value of any secret-looking key with "[REDACTED]". */
export function redactSecrets(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.map((v) => redactSecrets(v, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? "[REDACTED]" : redactSecrets(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "bigint") return value.toString();
  return value;
}

export interface AuditInput {
  actorUserId?: string | null;
  action: string; // e.g. "product.update"
  entity: string;
  entityId?: string | null;
  diff?: unknown;
  ip?: string | null;
}

/** Append an audit record. Secrets in `diff` are redacted; the IP is stored only as a keyed hash. */
export async function writeAudit(input: AuditInput, client: DbClient = db): Promise<void> {
  await client.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      diff: input.diff === undefined ? undefined : (redactSecrets(input.diff) as Prisma.InputJsonValue),
      ipHash: hashIp(input.ip),
    },
  });
}
