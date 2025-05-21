-- CreateTable
CREATE TABLE "BackupHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "format" VARCHAR(10) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackupHistory_userId_idx" ON "BackupHistory"("userId");

-- CreateIndex
CREATE INDEX "BackupHistory_createdAt_idx" ON "BackupHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "BackupHistory" ADD CONSTRAINT "BackupHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
