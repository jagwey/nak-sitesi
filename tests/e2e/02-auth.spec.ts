import { test, expect } from "@playwright/test";
import { cleanupE2E, randomEmail, randomPassword, resetAuthThrottles } from "./helpers/db";

test.beforeAll(resetAuthThrottles);
test.afterAll(cleanupE2E);

test("kayıt -> giriş -> çıkış", async ({ page }) => {
  const email = randomEmail("reg");
  const password = randomPassword();

  await page.goto("/kayit");
  await page.getByLabel("Ad soyad (isteğe bağlı)").fill("E2E Kayıt");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/kayit"));

  await page.goto("/hesabim");
  await expect(page.getByRole("button", { name: "Çıkış yap" })).toBeVisible();

  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page.getByRole("button", { name: "Çıkış yap" })).toHaveCount(0);
  await page.goto("/hesabim");
  await page.waitForURL(/\/giris/);

  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await page.waitForURL(/\/hesabim/);
  await expect(page.getByRole("button", { name: "Çıkış yap" })).toBeVisible();
});
