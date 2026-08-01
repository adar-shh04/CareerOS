-- CreateEnum
CREATE TYPE "ResumeOutputFormat" AS ENUM ('HTML', 'LATEX', 'PDF');

-- CreateTable
CREATE TABLE "resume_profiles" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role_focus" TEXT,
    "visible_sections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "section_order" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary_guidance" TEXT,
    "highlight_rules" JSONB NOT NULL DEFAULT '[]',
    "priority_project_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "priority_skill_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "priority_experience_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "priority_achievement_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "priority_certification_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "template_id" TEXT,
    "style_settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_versions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "resume_profile_id" UUID NOT NULL,
    "target_company" TEXT,
    "target_role" TEXT,
    "master_profile_snapshot" JSONB NOT NULL,
    "selected_record_ids" JSONB NOT NULL,
    "template_version" TEXT,
    "output_format" "ResumeOutputFormat" NOT NULL DEFAULT 'HTML',
    "job_analysis_evidence" JSONB,
    "match_result" JSONB,
    "confidence" DOUBLE PRECISION,
    "explanation" TEXT,
    "artifact_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resume_profiles_workspace_id_idx" ON "resume_profiles"("workspace_id");

-- CreateIndex
CREATE INDEX "resume_versions_workspace_id_idx" ON "resume_versions"("workspace_id");

-- CreateIndex
CREATE INDEX "resume_versions_resume_profile_id_idx" ON "resume_versions"("resume_profile_id");

-- AddForeignKey
ALTER TABLE "resume_profiles" ADD CONSTRAINT "resume_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_resume_profile_id_fkey" FOREIGN KEY ("resume_profile_id") REFERENCES "resume_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
