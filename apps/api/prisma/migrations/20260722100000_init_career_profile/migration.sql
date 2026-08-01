-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_career_profiles" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "headline" TEXT,
    "location" TEXT,
    "email" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "master_career_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_entries" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field_of_study" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "source_reference" TEXT,

    CONSTRAINT "education_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_entries" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "bullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "source_reference" TEXT,

    CONSTRAINT "experience_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_entries" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "repository_url" TEXT,
    "bullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "source_reference" TEXT,

    CONSTRAINT "project_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_entries" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TEXT,
    "source" TEXT,
    "source_reference" TEXT,

    CONSTRAINT "achievement_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_entries" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "proficiency" TEXT,
    "source" TEXT,
    "source_reference" TEXT,

    CONSTRAINT "skill_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technology_entries" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "source" TEXT,
    "source_reference" TEXT,

    CONSTRAINT "technology_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_entries" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "date" TEXT,
    "url" TEXT,
    "source" TEXT,
    "source_reference" TEXT,

    CONSTRAINT "publication_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hackathon_entries" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "organizer" TEXT,
    "date" TEXT,
    "achievement" TEXT,
    "source" TEXT,
    "source_reference" TEXT,

    CONSTRAINT "hackathon_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_entries" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "issue_date" TEXT,
    "expiration_date" TEXT,
    "credential_url" TEXT,
    "source" TEXT,
    "source_reference" TEXT,

    CONSTRAINT "certification_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_links" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT,
    "source_reference" TEXT,

    CONSTRAINT "career_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_career_profiles_workspace_id_key" ON "master_career_profiles"("workspace_id");

-- CreateIndex
CREATE INDEX "education_entries_profile_id_idx" ON "education_entries"("profile_id");

-- CreateIndex
CREATE INDEX "experience_entries_profile_id_idx" ON "experience_entries"("profile_id");

-- CreateIndex
CREATE INDEX "project_entries_profile_id_idx" ON "project_entries"("profile_id");

-- CreateIndex
CREATE INDEX "achievement_entries_profile_id_idx" ON "achievement_entries"("profile_id");

-- CreateIndex
CREATE INDEX "skill_entries_profile_id_idx" ON "skill_entries"("profile_id");

-- CreateIndex
CREATE INDEX "technology_entries_profile_id_idx" ON "technology_entries"("profile_id");

-- CreateIndex
CREATE INDEX "publication_entries_profile_id_idx" ON "publication_entries"("profile_id");

-- CreateIndex
CREATE INDEX "hackathon_entries_profile_id_idx" ON "hackathon_entries"("profile_id");

-- CreateIndex
CREATE INDEX "certification_entries_profile_id_idx" ON "certification_entries"("profile_id");

-- CreateIndex
CREATE INDEX "career_links_profile_id_idx" ON "career_links"("profile_id");

-- AddForeignKey
ALTER TABLE "master_career_profiles" ADD CONSTRAINT "master_career_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_entries" ADD CONSTRAINT "education_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "master_career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_entries" ADD CONSTRAINT "experience_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "master_career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_entries" ADD CONSTRAINT "project_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "master_career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_entries" ADD CONSTRAINT "achievement_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "master_career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_entries" ADD CONSTRAINT "skill_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "master_career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_entries" ADD CONSTRAINT "technology_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "master_career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_entries" ADD CONSTRAINT "publication_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "master_career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hackathon_entries" ADD CONSTRAINT "hackathon_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "master_career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_entries" ADD CONSTRAINT "certification_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "master_career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_links" ADD CONSTRAINT "career_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "master_career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

