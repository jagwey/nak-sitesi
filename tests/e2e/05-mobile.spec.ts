import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("mobil katalogda ürün türü tek satırda ve kartlar aynı yükseklikte", async ({ page }) => {
  await page.goto("/koleksiyon");

  const cards = page.getByRole("region", { name: "Ürün listesi" }).locator("article");
  await expect(cards.nth(1)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const layout = await cards.evaluateAll((items) => items.map((card) => {
    const type = card.querySelector("p")!;
    const typeBounds = type.getBoundingClientRect();
    const cardBounds = card.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(type);
    return {
      height: cardBounds.height,
      typeOffset: typeBounds.top - cardBounds.top,
      typeLines: range.getClientRects().length,
      fits: type.scrollWidth <= type.clientWidth &&
        card.scrollWidth <= card.clientWidth &&
        cardBounds.right <= window.innerWidth,
    };
  }));
  for (const card of layout) {
    expect(card.height).toBeCloseTo(layout[0].height, 0);
    expect(card.typeOffset).toBeCloseTo(layout[0].typeOffset, 0);
    expect(card.typeLines).toBe(1);
    expect(card.fits).toBe(true);
  }
});

test("mobil: ana sayfa -> menü -> koleksiyon -> filtre -> fiziksel ürün -> sepet çekmecesi", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Nakış Desenleri" }).first();
  // The menu button may be clicked before hydration; retry until the menu is open.
  await expect(async () => {
    await page.getByRole("button", { name: "Menüyü aç" }).click();
    await expect(link).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await link.click();
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
