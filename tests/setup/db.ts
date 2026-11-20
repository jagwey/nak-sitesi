import "dotenv/config";
import { afterAll, beforeEach, vi } from "vitest";

// In-memory cookie jar standing in for next/headers cookies().
export const jar = new Map<string, string>();
(globalThis as { __cookieJar?: Map<string, string> }).__cookieJar = jar;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string, opts?: { maxAge?: number; expires?: Date }) => {
      if (opts?.maxAge === 0 || value === "") jar.delete(name);
      else jar.set(name, value);
    },
    delete: (name: string) => void jar.delete(name),
  }),
}));

beforeEach(async () => {
  const { db } = await import("@/server/db");
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    const list = tables.map((t) => `"${t.tablename}"`).join(", ");
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
  jar.clear();
});

afterAll(async () => {
  const { disconnectDb } = await import("@/server/db");
  await disconnectDb();
});
