/*
  Warnings:

  - You are about to drop the column `invoiceNumber` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `ExpenseItem` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `ExpenseItem` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `ExpenseItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_userId_fkey";

-- DropIndex
DROP INDEX "Expense_category_idx";

-- DropIndex
DROP INDEX "Expense_createdAt_idx";

-- DropIndex
DROP INDEX "Expense_invoiceNumber_idx";

-- DropIndex
DROP INDEX "Expense_invoiceNumber_key";

-- DropIndex
DROP INDEX "Expense_status_idx";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "invoiceNumber",
DROP COLUMN "status",
DROP COLUMN "subtotal",
ADD COLUMN     "attachments" TEXT[],
ADD COLUMN     "dueTime" TEXT,
ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT 'cash',
ALTER COLUMN "payee" DROP NOT NULL,
ALTER COLUMN "payee" SET DATA TYPE TEXT,
ALTER COLUMN "reference" SET DATA TYPE TEXT,
ALTER COLUMN "category" SET DATA TYPE TEXT,
ALTER COLUMN "total" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ExpenseItem" DROP COLUMN "quantity",
DROP COLUMN "totalPrice",
DROP COLUMN "unit",
ALTER COLUMN "description" SET DATA TYPE TEXT,
ALTER COLUMN "price" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
