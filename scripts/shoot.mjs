// Visual review helper: node scripts/shoot.mjs <outDir> [baseUrl]
// Captures key routes at desktop + mobile widths and checks horizontal overflow + console errors.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "screenshots/after";
const base = process.argv[3] ?? "http://localhost:3000";
const routes = (process.env.ROUTES ?? "/,/koleksiyon,/koleksiyon?q=vp3%20%C3%A7i%C3%A7ek,/urun/bahce-gulu-botanik-nakis-deseni-vp3,/urun/kisiye-ozel-monogramli-organik-banyo-havlusu,/sepet,/kisiye-ozel")
  .split(",");
const widths = (process.env.WIDTHS ?? "1440,390").split(",").map(Number);
const full = process.env.FULL !== "0";

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const report = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const r of routes) {
    errors.length = 0;
    await page.goto(base + r, { waitUntil: "networkidle" }).catch((e) => errors.push(String(e)));
    // Scroll through the page so lazy images load before a full-page capture.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 120)); }
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const name = (r === "/" ? "home" : r.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-")).slice(0, 60);
    await page.screenshot({ path: join(outDir, `${name}-${w}.png`), fullPage: full });
    report.push({ route: r, width: w, overflow, errors: [...errors] });
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(report.map((x) => `${x.width} ${x.route} overflow=${x.overflow} errors=${x.errors.length}${x.errors.length ? " " + x.errors[0].slice(0, 160) : ""}`).join("\n"));
