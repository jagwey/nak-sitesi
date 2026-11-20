// Create or update a SUPER_ADMIN.
//   npm run admin:create                       (uses ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD)
//   npm run admin:create -- me@example.com 'a-long-password'
// Never logs the password. Imports no "server-only" modules (tsx does not use the react-server condition).
import { createScriptClient } from "../prisma/script-client";
import { hashPassword, MIN_ADMIN_PASSWORD_LENGTH } from "../src/server/modules/auth/password";

async function main() {
  const [argEmail, argPass] = process.argv.slice(2);
  const email = (argEmail ?? process.env.ADMIN_BOOTSTRAP_EMAIL ?? "").trim().toLowerCase();
  const password = argPass ?? process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid admin e-mail is required.");
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`Admin password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
  }

  const db = createScriptClient();
  try {
    const role = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    if (!role) throw new Error("SUPER_ADMIN role missing. Run `npm run db:seed` first.");

    const passwordHash = await hashPassword(password);
    const user = await db.user.upsert({
      where: { email },
      update: { passwordHash, status: "ACTIVE", failedLoginCount: 0, lockedUntil: null, emailVerifiedAt: new Date() },
      create: { email, passwordHash, name: "Admin", emailVerifiedAt: new Date() },
    });
    await db.userRole.createMany({ data: [{ userId: user.id, roleId: role.id }], skipDuplicates: true });
    console.log(`SUPER_ADMIN ready: ${email}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
