-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "fingerprint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "jobs_fingerprint_key" ON "jobs"("fingerprint");

-- AlterTable
ALTER TABLE "job_matches" ADD COLUMN "profile_version" INTEGER;
