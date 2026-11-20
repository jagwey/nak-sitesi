import "dotenv/config";
import { execSync } from "node:child_process";

// Runs once: apply migrations to the TEST database only.
export default function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is required for integration tests.");
  if (!/_test(\?|$)/.test(url)) throw new Error("Refusing to run: DATABASE_URL_TEST must point at a *_test database.");
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, MIGRATE_DATABASE_URL: url },
  });
}
