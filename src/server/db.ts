import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { getEnv } from "./env";

export type Tx = Prisma.TransactionClient;
export type DbClient = PrismaClient | Tx;

const g = globalThis as unknown as { __tbPrisma?: PrismaClient };

function create(): PrismaClient {
  const e = getEnv();
  const url = e.NODE_ENV === "test" ? e.DATABASE_URL_TEST! : e.DATABASE_URL;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export function getDb(): PrismaClient {
  if (!g.__tbPrisma) g.__tbPrisma = create();
  return g.__tbPrisma;
}

/** Lazy singleton (no connection or env validation at import time). Uses DATABASE_URL_TEST when NODE_ENV=test. */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const c = getDb();
    const v = Reflect.get(c, prop);
    return typeof v === "function" ? v.bind(c) : v;
  },
});

export async function disconnectDb() {
  if (g.__tbPrisma) {
    await g.__tbPrisma.$disconnect();
    g.__tbPrisma = undefined;
  }
}
