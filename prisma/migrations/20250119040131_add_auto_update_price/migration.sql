/*
  Warnings:

  - You are about to drop the column `isDynamicPrice` on the `Material` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Material" DROP COLUMN "isDynamicPrice";

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "autoUpdatePrice" BOOLEAN NOT NULL DEFAULT false;
