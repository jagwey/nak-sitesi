import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";

// Seeding runs out-of-process via tsx: the generated Prisma client is ESM and cannot be loaded by Playwright's CJS loader.
const IMPL = path.join(__dirname, "seed-impl.ts");

function run<T>(cmd: string, arg = ""): T {
  const out = execFileSync("npx", ["tsx", `"${IMPL}"`, cmd, `"${arg}"`], { encoding: "utf8", shell: true, cwd: path.join(__dirname, "../../..") });
  const raw = out.split("@@JSON@@")[1];
  return JSON.parse(raw) as T;
}

export type Account = { id: string; email: string; password: string };
export const createCustomer = (tag = "cust") => run<Account>("customer", tag);
export const createAdmin = (tag = "admin") => run<Account>("admin", tag);
export const cleanupE2E = async () => void run("cleanup");
export const resetAuthThrottles = async () => void run("reset-throttles");
export const lastOrderOf = (userId: string) => run<{ status: string; paymentStatus: string; number: string }>("last-order", userId);
export const randomPassword = () => randomBytes(18).toString("base64url");
export const randomEmail = (tag: string) => `e2e-${tag}-${randomBytes(4).toString("hex")}@example.com`;
