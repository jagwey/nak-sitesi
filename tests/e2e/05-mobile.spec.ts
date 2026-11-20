import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("mobil: ana sayfa -> menü -> koleksiyon -> filtre -> fiziksel ürün -> sepet çekmecesi", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page.getByRole("link", { name: /koleksiyon/i }).first().click();
  await page.waitForURL(/\/koleksiyon/);

  await page.getByRole("button", { name: /Filtre/i }).first().click();
  const panel = page.getByRole("dialog").first();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();

  await page.evaluate(() => window.scrollTo(0, 600));
  await expect
    .poll(() => page.locator("header").first().evaluate((h) => Math.round(h.getBoundingClientRect().top)))
    .toBe(0);

  await page.goto("/urun/botanik-islemeli-ham-kanvas-atolye-cantasi");
  await page.getByRole("button", { name: /sepete ekle/i }).first().click();
  await expect(page.getByText("Sepete eklendi").first()).toBeVisible();

  // Adding opens the cart drawer on its own.
  await expect(page.getByRole("dialog", { name: /sepet/i })).toBeVisible();
});
