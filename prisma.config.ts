import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: the connection URL lives here (not in schema.prisma). `prisma generate` never
// connects, so a placeholder keeps postinstall working when .env is absent (CI/build).
// MIGRATE_DATABASE_URL lets tests/CI point migrate/deploy at another database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url:
      process.env.MIGRATE_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5433/placeholder",
  },
});
