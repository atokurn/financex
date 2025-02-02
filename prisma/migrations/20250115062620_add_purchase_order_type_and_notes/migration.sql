-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discountType" VARCHAR(50) NOT NULL DEFAULT 'nominal',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "orderType" VARCHAR(50) NOT NULL DEFAULT 'offline';

-- CreateIndex
CREATE INDEX "Purchase_orderType_idx" ON "Purchase"("orderType");
