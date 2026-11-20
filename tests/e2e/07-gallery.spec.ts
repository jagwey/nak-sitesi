import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`galeri yakınlaştırması ${width}px genişlikte görselin dışında ve klavyeyle çalışıyor`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/urun/bahce-gulu-botanik-nakis-deseni-vp3");

    const image = page.getByRole("main").getByRole("img").first();
    const zoom = page.getByRole("button", { name: /^Dikişi yakınlaştır/ });
    await expect(image).toBeVisible();
    await expect(zoom).toBeVisible();
    const imageBox = (await image.boundingBox())!;
    const zoomBox = (await zoom.boundingBox())!;
    expect(zoomBox.y).toBeGreaterThanOrEqual(imageBox.y + imageBox.height);

    await zoom.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(zoom).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(zoom).toHaveAttribute("aria-pressed", "true");
    await expect(image).toHaveAttribute("style", /scale\(2\.15\)/);
    await page.keyboard.press("Space");
    await expect(zoom).toHaveAttribute("aria-pressed", "false");
  });
}
