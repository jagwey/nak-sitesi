import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** UI login on /giris. */
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/giris"));
}

/** Fast API login; the session cookie lands in the page's browser context. */
export async function loginViaApi(page: Page, email: string, password: string) {
  const res = await page.request.post("/api/auth/login", {
    data: { email, password },
    headers: { origin: "http://localhost:3000" },
  });
  expect(res.status(), await res.text()).toBe(200);
}
