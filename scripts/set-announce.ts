// Dev helper: npx tsx scripts/set-announce.ts on|off
import { createAdmin, cleanupE2E } from "../tests/e2e/helpers/db";
const base = "http://localhost:3000";
const on = process.argv[2] === "on";
async function main() {
const admin = await createAdmin("announce");
try {
  const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ email: admin.email, password: admin.password }) });
  const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const site = on ? { announcementEnabled: true, announcementText: "Kargo bilgisi için sipariş sayfasını inceleyin.", announcementLink: "/bilgi/kargo-ve-teslimat" } : { announcementEnabled: false, announcementText: "", announcementLink: "" };
  const r = await fetch(`${base}/api/admin/settings`, { method: "PUT", headers: { "content-type": "application/json", origin: base, cookie }, body: JSON.stringify({ site }) });
  console.log("login", login.status, "put", r.status);
} finally {
  await cleanupE2E();
}
}
main().then(() => process.exit(0));
