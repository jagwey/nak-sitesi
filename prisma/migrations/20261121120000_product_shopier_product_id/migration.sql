ALTER TABLE "Product" ADD COLUMN "shopierProductId" TEXT;

CREATE UNIQUE INDEX "Product_shopierProductId_key" ON "Product"("shopierProductId");
