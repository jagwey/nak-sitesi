// No "server-only" import on purpose: scripts (admin:create) reuse this file.
import { hash, verify } from "@node-rs/argon2";

// argon2id (the @node-rs/argon2 default) with OWASP-recommended minimum cost.
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const MIN_PASSWORD_LENGTH = 10;
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;

/**
 * Verify against a throw-away hash so "unknown e-mail" costs the same as "wrong password"
 * (prevents account enumeration via timing).
 */
export async function verifyDummyPassword(plain: string): Promise<void> {
  dummy ??= hashPassword("tb-dummy-password-for-timing-equalisation");
  await verifyPassword(await dummy, plain);
}
