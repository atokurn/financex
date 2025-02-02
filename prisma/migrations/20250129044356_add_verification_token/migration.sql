/*
  Warnings:

  - A unique constraint covering the columns `[orderId,sku]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropIndex
DROP INDEX "Order_orderId_key";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "orderId" SET DATA TYPE TEXT,
ALTER COLUMN "sku" SET DEFAULT 'NO SKU',
ALTER COLUMN "sku" SET DATA TYPE TEXT,
ALTER COLUMN "customer" SET DATA TYPE TEXT,
ALTER COLUMN "productName" SET DATA TYPE TEXT,
ALTER COLUMN "quantity" DROP DEFAULT,
ALTER COLUMN "totalOrder" DROP DEFAULT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "regency" SET DATA TYPE TEXT,
ALTER COLUMN "province" SET DATA TYPE TEXT,
ALTER COLUMN "platform" SET DATA TYPE TEXT,
ALTER COLUMN "orderType" DROP DEFAULT,
ALTER COLUMN "orderType" SET DATA TYPE TEXT,
ALTER COLUMN "reference" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderId_sku_key" ON "Order"("orderId", "sku");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
