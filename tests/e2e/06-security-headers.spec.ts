import { test, expect } from "@playwright/test";

test("güvenlik başlıkları var ve sayfalar CSP ihlali olmadan render olur", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/content security policy|violates the following/i.test(m.text())) violations.push(m.text());
  });

  const res = await page.goto("/");
  const h = res!.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");

  await page.goto("/koleksiyon");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/urun/bahce-gulu-botanik-nakis-deseni-vp3");
  await expect(page.getByRole("radio", { name: /VP3/ }).first()).toBeVisible();
  expect(violations).toEqual([]);
});
