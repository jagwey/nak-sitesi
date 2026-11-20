ALTER TABLE "DigitalFile" ADD COLUMN "downloadLabel" TEXT NOT NULL DEFAULT '';

CREATE INDEX "DigitalFile_productId_formatId_downloadLabel_idx"
ON "DigitalFile"("productId", "formatId", "downloadLabel");
