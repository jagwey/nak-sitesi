import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetEnvForTests, getEnv } from "@/server/env";

const KEYS = ["PAYMENT_SIMULATION_ENABLED", "PAYMENT_SIMULATION_SECRET", "PAYMENT_PROVIDER", "ADMIN_NOTIFY_EMAIL", "DOWNLOAD_EXPIRY_DAYS", "REFUND_REVOKES_DOWNLOADS", "UPLOAD_MAX_MB", "SHOPIER_OSB_USERNAME", "SHOPIER_OSB_KEY", "SHOPIER_STORE_URL"] as const;
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  __resetEnvForTests();
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  __resetEnvForTests();
});

describe("env validation", () => {
  it("fails fast when simulation is enabled without a secret", () => {
    process.env.PAYMENT_SIMULATION_ENABLED = "true";
    process.env.PAYMENT_SIMULATION_SECRET = "";
    expect(() => getEnv()).toThrow(/PAYMENT_SIMULATION_SECRET/);
  });
  it("accepts simulation with a long enough secret and parses the new knobs", () => {
    process.env.PAYMENT_SIMULATION_ENABLED = "true";
    process.env.PAYMENT_SIMULATION_SECRET = "x".repeat(20);
    process.env.DOWNLOAD_EXPIRY_DAYS = "30";
    process.env.REFUND_REVOKES_DOWNLOADS = "false";
    process.env.ADMIN_NOTIFY_EMAIL = "ops@example.com";
    const e = getEnv();
    expect(e.DOWNLOAD_EXPIRY_DAYS).toBe(30);
    expect(e.REFUND_REVOKES_DOWNLOADS).toBe(false);
    expect(e.ADMIN_NOTIFY_EMAIL).toBe("ops@example.com");
  });
  it("requires Shopier OSB credentials when that provider is selected", () => {
    process.env.PAYMENT_PROVIDER = "shopier";
    process.env.SHOPIER_OSB_USERNAME = "";
    process.env.SHOPIER_OSB_KEY = "";
    expect(() => getEnv()).toThrow(/SHOPIER_OSB_USERNAME/);
    process.env.SHOPIER_OSB_USERNAME = "jagnakis";
    process.env.SHOPIER_OSB_KEY = "osb-secret";
    process.env.SHOPIER_STORE_URL = "https://www.shopier.com/Jagnakis";
    __resetEnvForTests();
    expect(getEnv().PAYMENT_PROVIDER).toBe("shopier");
    expect(getEnv().SHOPIER_STORE_URL).toBe("https://www.shopier.com/Jagnakis");
  });
  it("rejects a malformed ADMIN_NOTIFY_EMAIL and a negative expiry", () => {
    process.env.ADMIN_NOTIFY_EMAIL = "not-an-email";
    expect(() => getEnv()).toThrow(/ADMIN_NOTIFY_EMAIL/);
    process.env.ADMIN_NOTIFY_EMAIL = "";
    process.env.DOWNLOAD_EXPIRY_DAYS = "-1";
    __resetEnvForTests();
    expect(() => getEnv()).toThrow(/DOWNLOAD_EXPIRY_DAYS/);
  });
});
