// Admin visual review: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/shoot-admin.mjs [outDir] [baseUrl]
// Logs in through /giris and captures key admin routes at 1440 and 390 widths.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "screenshots/phase3-admin";
const base = process.argv[3] ?? "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required."); process.exit(1); }
const routes = (process.env.ROUTES ?? "/admin,/admin/urunler,/admin/urunler/yeni,/admin/toplu-islem").split(",");
const widths = (process.env.WIDTHS ?? "1440,390").split(",").map(Number);

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const report = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + "/giris?next=/admin", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/giris"), { timeout: 20000 }).catch(() => {}), page.keyboard.press("Enter")]);
  for (const r of routes) {
    errors.length = 0;
    await page.goto(base + r, { waitUntil: "networkidle" }).catch((e) => errors.push(String(e)));
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const name = r.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 60);
    await page.screenshot({ path: join(outDir, `${name}-${w}.png`), fullPage: true });
    report.push({ route: r, width: w, url: page.url().replace(base, ""), overflow, errors: [...errors] });
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(report.map((x) => `${x.width} ${x.route} -> ${x.url} overflow=${x.overflow} errors=${x.errors.length}${x.errors.length ? " " + x.errors[0].slice(0, 160) : ""}`).join("\n"));
