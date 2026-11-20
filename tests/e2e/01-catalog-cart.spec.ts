import { test, expect } from "@playwright/test";

test("desktop: arama -> ürün -> format seç -> sepete ekle -> sunucu toplamları", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Desen, format veya makine ara").fill("cicek vp3");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/koleksiyon\?q=/);

  const card = page.getByRole("link", { name: /Bahçe Gülü Botanik/ }).first();
  await expect(card).toBeVisible();
  await card.click();
  await page.waitForURL(/\/urun\/bahce-gulu/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bahçe Gülü");

  const vp3 = page.getByRole("radio", { name: /VP3/ }).first();
  await expect(vp3).toBeVisible();
  await vp3.click();
  await expect(vp3).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: /sepete ekle/i }).first().click();
  await expect(page.getByText("Sepete eklendi").first()).toBeVisible();

  await page.goto("/sepet");
  await expect(page.getByRole("heading", { name: "Alışveriş Sepeti" })).toBeVisible();
  await expect(page.getByText(/Bahçe Gülü Botanik/).first()).toBeVisible();
  await expect(page.getByText("Genel Toplam")).toBeVisible();
  await expect(page.getByText("195,00 ₺").first()).toBeVisible();
});
