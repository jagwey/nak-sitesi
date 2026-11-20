import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getEnv } from "./env";

/** Cryptographically random URL-safe token (default 32 bytes = 256 bits). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** HMAC-SHA256 keyed with SESSION_SECRET (or an explicit key). */
export function hmacHex(data: string, key?: string): string {
  return createHmac("sha256", key ?? getEnv().SESSION_SECRET).update(data).digest("hex");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Keyed hash for storing IPs (never store raw IPs in logs/audit). Truncated to 32 hex chars. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return hmacHex(`ip:${ip}`).slice(0, 32);
}
