/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNumber]` on the table `Purchase` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "invoiceNumber" VARCHAR(100) NOT NULL DEFAULT 'INV/PO/000000/000',
ADD COLUMN     "itemDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "itemDiscountType" VARCHAR(50) NOT NULL DEFAULT 'percentage',
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unit" VARCHAR(50) NOT NULL DEFAULT 'pcs';

-- CreateTable
CREATE TABLE "AdditionalCost" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdditionalCost_purchaseId_idx" ON "AdditionalCost"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_invoiceNumber_key" ON "Purchase"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Purchase_invoiceNumber_idx" ON "Purchase"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "AdditionalCost" ADD CONSTRAINT "AdditionalCost_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
