// Interaction smoke test: node scripts/interact.mjs <outDir>
// Exercises hero search, chips, search overlay keyboard, add-to-cart and mobile menu.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? "screenshots/after/interactions";
const base = process.env.BASE ?? "http://localhost:3000";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const results = [];
const check = (name, ok, info = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${info ? " — " + info : ""}`);

// Desktop
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.locator('main input[type="search"]').first().fill("vp3 çiçek");
  await page.locator('main input[type="search"]').first().press("Enter");
  await page.waitForURL(/koleksiyon/);
  const h1 = await page.locator("h1").first().innerText();
  check("hero search → catalog", /vp3 çiçek/i.test(decodeURIComponent(page.url().replaceAll("+", " "))) && /sonuç/.test(h1), h1);

  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /10×10 kasnağa sığan/ }).first().click();
  await page.waitForURL(/kasnak/);
  const count = await page.locator("text=/ürün gösteriliyor/").first().innerText();
  check("hoop chip filters catalog", /4/.test(count), count);
  await page.screenshot({ path: join(out, "hoop-chip-1440.png") });

  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ürün veya desen ara" }).first().click();
  const overlayInput = page.locator('[role="dialog"] input, [role="combobox"]').first();
  await overlayInput.waitFor();
  await overlayInput.fill("bebek");
  await page.waitForTimeout(300);
  const options = await page.locator('[role="option"]').count();
  await overlayInput.press("ArrowDown");
  await page.screenshot({ path: join(out, "overlay-1440.png") });
  check("overlay suggestions", options > 0, `${options} options`);
  await overlayInput.press("Escape");

  await page.goto(base + "/urun/bahce-gulu-botanik-nakis-deseni-vp3", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "PES" }).first().click();
  await page.getByRole("button", { name: /Sepete Ekle/i }).first().click();
  await page.waitForTimeout(500);
  const cartLen = await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      try { const v = JSON.parse(localStorage.getItem(k)); if (Array.isArray(v?.cart ?? v) && (v.cart ?? v).some?.((i) => i.slug)) return (v.cart ?? v).length; } catch {}
    }
    return document.body.innerText.includes("Sepette") || document.body.innerText.includes("Sepete eklendi") ? 1 : 0;
  });
  await page.screenshot({ path: join(out, "pdp-added-1440.png") });
  check("digital add-to-cart", cartLen > 0);
  await page.goto(base + "/sepet", { waitUntil: "networkidle" });
  const cartText = await page.locator("main").innerText();
  check("cart shows item + format", /Bahçe Gülü/.test(cartText) && /PES/.test(cartText));
  await page.screenshot({ path: join(out, "cart-1440.png"), fullPage: true });
  check("desktop console clean", errors.length === 0, errors[0]?.slice(0, 160));
  await ctx.close();
}

// Mobile
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /menü/i }).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, "menu-375.png") });
  check("mobile menu opens", (await page.locator('[role="dialog"], nav[aria-label]').count()) > 0);
  await page.keyboard.press("Escape");

  await page.goto(base + "/urun/kisiye-ozel-monogramli-organik-banyo-havlusu", { waitUntil: "networkidle" });
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button, a, input, select")]
      .filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && el.closest("main") && (r.height < 44 || r.width < 44) && el.tagName !== "INPUT"; })
      .map((el) => `${el.tagName}:${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`)
  );
  check("PDP touch targets ≥44px (main)", small.length === 0, small.slice(0, 6).join(" | "));
  await page.screenshot({ path: join(out, "pdp-physical-375.png") });
  check("mobile console clean", errors.length === 0, errors[0]?.slice(0, 160));
  await ctx.close();
}

await browser.close();
console.log(results.join("\n"));
