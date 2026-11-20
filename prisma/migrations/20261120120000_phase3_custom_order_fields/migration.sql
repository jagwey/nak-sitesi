-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AlterTable
ALTER TABLE "CustomOrder" ADD COLUMN     "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "accessTokenHash" TEXT,
ADD COLUMN     "budgetKurus" INTEGER,
ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "deadline" TEXT,
ADD COLUMN     "initials" TEXT,
ADD COLUMN     "prepDays" INTEGER,
ADD COLUMN     "productType" TEXT,
ADD COLUMN     "quoteValidUntil" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "anonymizedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "CustomOrder_accessTokenHash_key" ON "CustomOrder"("accessTokenHash");


-- Data migration: move the D2 SiteSettings workaround rows into the real columns, then delete them.
UPDATE "CustomOrder" co SET
  "productType"     = s."value"->>'productType',
  "deadline"        = s."value"->>'deadline',
  "budgetKurus"     = CASE WHEN jsonb_typeof(s."value"->'budgetKurus') = 'number' THEN (s."value"->>'budgetKurus')::int END,
  "prepDays"        = CASE WHEN jsonb_typeof(s."value"->'prepDays') = 'number' THEN (s."value"->>'prepDays')::int END,
  "quoteValidUntil" = s."value"->>'validUntil',
  "consentAt"       = NULLIF(s."value"->>'consentAt', '')::timestamp,
  "initials"        = s."value"->>'initials'
FROM "SiteSettings" s
WHERE s."key" = 'co.meta:' || co."id";

-- One token per custom order (the latest by expiry wins; older quote links are dropped).
UPDATE "CustomOrder" co SET
  "accessTokenHash"      = t.hash,
  "accessTokenExpiresAt" = t.expires
FROM (
  SELECT DISTINCT ON (s."value"->>'customOrderId')
         s."value"->>'customOrderId' AS co_id,
         substring(s."key" from 10)   AS hash,
         (s."value"->>'expiresAt')::timestamp AS expires
  FROM "SiteSettings" s
  WHERE s."key" LIKE 'co.token:%'
  ORDER BY s."value"->>'customOrderId', (s."value"->>'expiresAt')::timestamp DESC
) t
WHERE co."id" = t.co_id;

DELETE FROM "SiteSettings" WHERE "key" LIKE 'co.meta:%' OR "key" LIKE 'co.token:%';
