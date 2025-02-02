-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderType" VARCHAR(50) NOT NULL DEFAULT 'offline',
ADD COLUMN     "reference" VARCHAR(100);

-- CreateIndex
CREATE INDEX "Order_orderType_idx" ON "Order"("orderType");
