/*
  Warnings:

  - You are about to drop the column `itemDiscount` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `itemDiscountType` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `materialId` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Purchase` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_materialId_fkey";

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_productId_fkey";

-- DropIndex
DROP INDEX "Purchase_materialId_idx";

-- DropIndex
DROP INDEX "Purchase_productId_idx";

-- DropIndex
DROP INDEX "Purchase_type_idx";

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "itemDiscount",
DROP COLUMN "itemDiscountType",
DROP COLUMN "materialId",
DROP COLUMN "price",
DROP COLUMN "productId",
DROP COLUMN "quantity",
DROP COLUMN "totalPrice",
DROP COLUMN "type",
DROP COLUMN "unit";

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "materialId" TEXT,
    "productId" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'pcs',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itemDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itemDiscountType" VARCHAR(50) NOT NULL DEFAULT 'percentage',
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_materialId_idx" ON "PurchaseItem"("materialId");

-- CreateIndex
CREATE INDEX "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

-- CreateIndex
CREATE INDEX "PurchaseItem_type_idx" ON "PurchaseItem"("type");

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
