-- AlterTable
ALTER TABLE "invitations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "job_matches" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "members" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workspace_job_states" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'saved',
    "notes" TEXT,
    "applied_at" TIMESTAMP(3),
    "resume_profile_id" UUID,
    "resume_version_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_history" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "applications_organization_id_idx" ON "applications"("organization_id");

-- CreateIndex
CREATE INDEX "applications_job_id_idx" ON "applications"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_organization_id_job_id_key" ON "applications"("organization_id", "job_id");

-- CreateIndex
CREATE INDEX "application_status_history_application_id_idx" ON "application_status_history"("application_id");

-- RenameForeignKey
ALTER TABLE "invitations" RENAME CONSTRAINT "invitations_user_id_fkey" TO "invitations_inviter_id_fkey";

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "byok_credentials_workspace_id_provider_key" RENAME TO "byok_credentials_organization_id_provider_key";

-- RenameIndex
ALTER INDEX "job_matches_workspace_id_idx" RENAME TO "job_matches_organization_id_idx";

-- RenameIndex
ALTER INDEX "job_matches_workspace_job_profile_key" RENAME TO "job_matches_organization_id_job_id_resume_profile_id_key";

-- RenameIndex
ALTER INDEX "master_career_profiles_workspace_id_key" RENAME TO "master_career_profiles_organization_id_key";

-- RenameIndex
ALTER INDEX "resume_profiles_workspace_id_idx" RENAME TO "resume_profiles_organization_id_idx";

-- RenameIndex
ALTER INDEX "resume_versions_workspace_id_idx" RENAME TO "resume_versions_organization_id_idx";

-- RenameIndex
ALTER INDEX "workspace_job_states_workspace_id_idx" RENAME TO "workspace_job_states_organization_id_idx";

-- RenameIndex
ALTER INDEX "workspace_job_states_workspace_id_job_id_key" RENAME TO "workspace_job_states_organization_id_job_id_key";
