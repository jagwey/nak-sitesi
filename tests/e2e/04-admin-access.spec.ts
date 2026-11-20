import { test, expect } from "@playwright/test";
import { cleanupE2E, createAdmin, createCustomer, resetAuthThrottles } from "./helpers/db";
import { loginViaApi } from "./helpers/auth";

test.beforeAll(resetAuthThrottles);
test.afterAll(cleanupE2E);

test("müşteri /admin açamaz (404)", async ({ page }) => {
  const c = await createCustomer("plain");
  await loginViaApi(page, c.email, c.password);
  for (const path of ["/admin", "/admin/urunler"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
});

test("yönetici /admin ve /admin/urunler açabilir", async ({ page }) => {
  const a = await createAdmin("adm");
  await loginViaApi(page, a.email, a.password);
  const r1 = await page.goto("/admin");
  expect(r1?.status()).toBe(200);
  const r2 = await page.goto("/admin/urunler");
  expect(r2?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /Ürün/ }).first()).toBeVisible();
});
