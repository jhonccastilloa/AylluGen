/*
  Warnings:

  - A unique constraint covering the columns `[userId,crotal]` on the table `animals` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "animals_crotal_idx";

-- DropIndex
DROP INDEX "animals_crotal_key";

-- CreateIndex
CREATE UNIQUE INDEX "animals_userId_crotal_key" ON "animals"("userId", "crotal");
