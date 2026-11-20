import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { db, type DbClient } from "../../db";
import { writeAudit } from "../../audit";
import { getEnv } from "../../env";
import { SHIPPING_FALLBACK, refundRevokesDownloads, downloadExpiryDays } from "../../commerce-config";
import {
  LEGAL_KEYS,
  SITE_DEFAULTS,
  policySettingsSchema,
  settingsPatchSchema,
  shippingSettingsSchema,
  siteSettingsSchema,
  type LegalKey,
  type PolicySettings,
  type SiteSettings,
} from "./schema";
import type { z } from "zod";

export const SETTINGS_TAG = "site-settings";

async function readKey(client: DbClient, key: string): Promise<Record<string, unknown>> {
  const row = await client.siteSettings.findUnique({ where: { key } });
  return row && row.value && typeof row.value === "object" && !Array.isArray(row.value) ? (row.value as Record<string, unknown>) : {};
}

async function writeKey(client: DbClient, key: string, value: object) {
  await client.siteSettings.upsert({ where: { key }, create: { key, value }, update: { value } });
}

function bust() {
  try {
    revalidateTag(SETTINGS_TAG, { expire: 0 });
  } catch {
    /* outside Next runtime (tests/CLI) */
  }
}

export async function loadSite(client: DbClient = db): Promise<SiteSettings> {
  const v = await readKey(client, "site");
  const settings = { ...SITE_DEFAULTS };
  for (const key of Object.keys(siteSettingsSchema.shape) as (keyof SiteSettings)[]) {
    const field = siteSettingsSchema.shape[key].safeParse(v[key]);
    if (field.success) Object.assign(settings, { [key]: field.data });
  }
  settings.storeName ||= SITE_DEFAULTS.storeName;
  return settings;
}

const cachedSiteSettings = unstable_cache(() => loadSite(), ["public-site-settings"], { tags: [SETTINGS_TAG], revalidate: 300 });

/** Storefront read: shared within a render, invalidated after an admin save. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return await cachedSiteSettings();
  } catch {
    return loadSite().catch(() => SITE_DEFAULTS);
  }
});

export async function loadShipping(client: DbClient = db) {
  const v = await readKey(client, "studio");
  return {
    standardShippingKurus: Number.isInteger(v.standardShippingKurus) ? (v.standardShippingKurus as number) : SHIPPING_FALLBACK.standardShippingKurus,
    freeShippingThresholdKurus: Number.isInteger(v.freeShippingThresholdKurus) ? (v.freeShippingThresholdKurus as number) : SHIPPING_FALLBACK.freeShippingThresholdKurus,
  };
}

/** Admin-editable policy with env fallback (existing behaviour unchanged until saved). */
export async function loadPolicy(client: DbClient = db): Promise<PolicySettings> {
  const v = await readKey(client, "policy");
  const env = getEnv();
  return {
    downloadLimit: Number.isInteger(v.downloadLimit) ? (v.downloadLimit as number) : env.DOWNLOAD_LIMIT_DEFAULT,
    downloadExpiryDays: Number.isInteger(v.downloadExpiryDays) ? (v.downloadExpiryDays as number) : (downloadExpiryDays() ?? 0),
    refundRevokesDownloads: typeof v.refundRevokesDownloads === "boolean" ? v.refundRevokesDownloads : refundRevokesDownloads(),
  };
}

export async function getAllSettings() {
  return { site: await loadSite(), shipping: await loadShipping(), policy: await loadPolicy() };
}

type Patch = z.infer<typeof settingsPatchSchema>;

export async function saveSettings(patch: Patch, actorUserId: string, ip?: string | null) {
  const changed: string[] = [];
  await db.$transaction(async (tx) => {
    if (patch.site) {
      const next = siteSettingsSchema.parse({ ...(await loadSite(tx)), ...patch.site });
      await writeKey(tx, "site", next);
      changed.push(...Object.keys(patch.site));
    }
    if (patch.shipping) {
      const next = shippingSettingsSchema.parse({ ...(await loadShipping(tx)), ...patch.shipping });
      const prev = await readKey(tx, "studio");
      await writeKey(tx, "studio", { ...prev, ...next });
      changed.push(...Object.keys(patch.shipping));
    }
    if (patch.policy) {
      const next = policySettingsSchema.parse({ ...(await loadPolicy(tx)), ...patch.policy });
      await writeKey(tx, "policy", next);
      changed.push(...Object.keys(patch.policy));
    }
    await writeAudit({ actorUserId, action: "settings.update", entity: "SiteSettings", diff: { keys: changed }, ip }, tx);
  });
  bust();
  return getAllSettings();
}

// ---- Legal / CMS texts ----
export async function loadLegal(client: DbClient = db): Promise<Record<LegalKey, string>> {
  const v = await readKey(client, "legal");
  const out = {} as Record<LegalKey, string>;
  for (const k of LEGAL_KEYS) out[k] = typeof v[k] === "string" ? (v[k] as string) : "";
  return out;
}

export async function getLegalText(key: LegalKey): Promise<string> {
  try {
    const all = await unstable_cache(() => loadLegal(), ["legal-texts"], { tags: [SETTINGS_TAG], revalidate: 300 })();
    return all[key];
  } catch {
    return (await loadLegal())[key];
  }
}

export async function saveLegal(key: LegalKey, body: string, actorUserId: string, ip?: string | null) {
  await db.$transaction(async (tx) => {
    const cur = await readKey(tx, "legal");
    await writeKey(tx, "legal", { ...cur, [key]: body });
    await writeAudit({ actorUserId, action: "cms.legal_update", entity: "SiteSettings", entityId: key, diff: { key, length: body.length }, ip }, tx);
  });
  bust();
}
