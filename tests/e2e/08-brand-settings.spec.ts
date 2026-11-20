import { expect, test } from "@playwright/test";
import { loginViaApi } from "./helpers/auth";
import { cleanupE2E, createAdmin, resetAuthThrottles } from "./helpers/db";

test.beforeAll(resetAuthThrottles);
test.afterAll(cleanupE2E);

test("Ayarlar'da kaydedilen mağaza kimliği üst bilgiye, alt bilgiye ve başlığa yansır", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const admin = createAdmin("brand");
  await loginViaApi(page, admin.email, admin.password);
  const settingsUrl = "/api/admin/settings";
  const original = await page.request.get(settingsUrl);
  expect(original.ok()).toBe(true);
  const settings = await original.json();

  await page.goto("/");
  await expect(page.locator("header").getByRole("link", { name: `${settings.site.storeName} Ana Sayfa` })).toBeVisible();

  const newName = "Test Nakış Atölyesi";
  const owner = "Test İşletme";
  const email = "test-brand@example.com";
  const logo = "/images/atelier-workbench.webp";
  try {
    await page.goto("/admin/ayarlar");
    const name = page.getByLabel("Mağaza adı", { exact: true });
    await expect(name).toHaveValue(settings.site.storeName);
    await name.fill(newName);
    await page.getByLabel("Yayınlanacak işletme sahibi veya unvan").fill(owner);
    await page.getByLabel("İletişim e-postası").fill(email);
    await page.getByLabel("Logo adresi").fill(logo);
    await page.getByRole("button", { name: "Kaydet", exact: true }).press("Enter");
    await expect(page.getByText("Ayarlar kaydedildi.")).toBeVisible();

    await page.goto("/");
    for (const landmark of ["header", "footer"]) {
      const brand = page.locator(landmark).getByRole("link", { name: `${newName} Ana Sayfa` });
      await expect(brand).toBeVisible();
      await expect(brand.locator("img")).toHaveAttribute("src", logo);
    }
    const loadedLogo = page.locator("header").getByRole("link", { name: `${newName} Ana Sayfa` }).locator("img");
    await expect.poll(() => loadedLogo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(page).toHaveTitle(new RegExp(`^${newName} \\|`));
    await expect(page.locator("footer").getByText(owner, { exact: true })).toBeVisible();
    await expect(page.locator("footer").getByRole("link", { name: email })).toHaveAttribute("href", `mailto:${email}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

    await page.goto("/urun/bahce-gulu-botanik-nakis-deseni-vp3");
    await expect(page).toHaveTitle(new RegExp(`\\| ${newName}$`));
  } finally {
    const restored = await page.request.put(settingsUrl, {
      data: settings,
      headers: { origin: "http://localhost:3000" },
    });
    expect(restored.ok()).toBe(true);
  }
});
