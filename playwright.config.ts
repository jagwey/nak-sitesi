import { defineConfig } from "@playwright/test";

const DEFAULT_CHROME = "C:/Users/Osman/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const executablePath = process.env.CHROME_PATH || (process.platform === "win32" ? DEFAULT_CHROME : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
