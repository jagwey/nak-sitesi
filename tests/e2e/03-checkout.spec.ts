import { test, expect } from "@playwright/test";
import { cleanupE2E, createCustomer, lastOrderOf, resetAuthThrottles } from "./helpers/db";
import { loginViaApi } from "./helpers/auth";

test.beforeAll(resetAuthThrottles);
test.afterAll(cleanupE2E);

test("giriş yapmış kullanıcı fiziksel ürün sipariş eder: ödeme bekleniyor, ödenmiş DEĞİL", async ({ page }) => {
  const c = await createCustomer("co");
  await loginViaApi(page, c.email, c.password);

  await page.goto("/urun/botanik-islemeli-ham-kanvas-atolye-cantasi");
  await page.getByRole("button", { name: /sepete ekle/i }).first().click();
  await expect(page.getByText("Sepete eklendi").first()).toBeVisible();

  await page.goto("/odeme");
  await page.getByLabel("Ad soyad").fill("E2E Müşteri");
  await page.getByLabel("Telefon").nth(0).fill("05321234567");
  await page.getByLabel("Telefon").nth(1).fill("05321234567");
  await page.getByLabel("Adres", { exact: true }).fill("Test Mah. Deneme Sok. No 1");
  await page.getByLabel("İlçe").fill("Kadıköy");
  await page.getByLabel("İl", { exact: true }).fill("İstanbul");
  await page.getByRole("button", { name: "Siparişi oluştur" }).click();

  await expect(page.getByText("Siparişiniz oluşturuldu")).toBeVisible();
  await expect(page.getByText("Durum: Ödeme bekleniyor.")).toBeVisible();

  const order = await lastOrderOf(c.id);
  expect(order.status).toBe("PENDING_PAYMENT");
  expect(order.paymentStatus).not.toBe("PAID");
});

test("geliştirme simülasyonu: dijital sipariş ödenir -> indirmelerde hak görünür", async ({ page }) => {
  const c = await createCustomer("sim");
  await loginViaApi(page, c.email, c.password);

  await page.goto("/urun/bahce-gulu-botanik-nakis-deseni-vp3");
  await page.getByRole("radio", { name: /VP3/ }).first().click();
  await page.getByRole("button", { name: /sepete ekle/i }).first().click();
  await expect(page.getByText("Sepete eklendi").first()).toBeVisible();

  await page.goto("/odeme");
  await page.getByRole("button", { name: "Siparişi oluştur" }).click();
  await expect(page.getByText("Siparişiniz oluşturuldu")).toBeVisible();
  await page.getByRole("button", { name: "Ödemeyi başarılı say" }).click();
  await expect(page.getByText("Durum: Ödeme bekleniyor.")).toHaveCount(0);

  await page.goto("/hesabim?tab=indirmeler");
  await page.getByRole("tab", { name: "Dijital İndirmelerim" }).or(page.getByRole("button", { name: "Dijital İndirmelerim" })).first().click();
  await expect(page.getByText(/Kalan indirme hakkı: \d+/)).toBeVisible();
});
