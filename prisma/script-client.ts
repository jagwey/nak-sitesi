// Standalone Prisma client for CLI scripts (seed, admin:create). Deliberately NOT importing
// "server-only" modules: tsx does not run with the react-server condition.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

export function createScriptClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
