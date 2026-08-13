-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviter_id" UUID NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "members_organization_id_user_id_key" ON "members"("organization_id", "user_id");

-- Data Migration from legacy workspaces to organizations if workspaces exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspaces') THEN
        INSERT INTO "organizations" ("id", "name", "slug", "logo", "created_at")
        SELECT "id", "name", "slug", "logo", "created_at" FROM "workspaces"
        ON CONFLICT ("id") DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_members') THEN
        INSERT INTO "members" ("id", "organization_id", "user_id", "role", "created_at")
        SELECT "id", "workspace_id", "user_id", "role", "created_at" FROM "workspace_members"
        ON CONFLICT ("organization_id", "user_id") DO NOTHING;
    END IF;
END $$;

-- Drop ForeignKey Constraints if they exist on old workspace tables
ALTER TABLE IF EXISTS "sessions" DROP CONSTRAINT IF EXISTS "sessions_active_organization_id_fkey";
ALTER TABLE IF EXISTS "byok_credentials" DROP CONSTRAINT IF EXISTS "byok_credentials_workspace_id_fkey";
ALTER TABLE IF EXISTS "master_career_profiles" DROP CONSTRAINT IF EXISTS "master_career_profiles_workspace_id_fkey";
ALTER TABLE IF EXISTS "resume_profiles" DROP CONSTRAINT IF EXISTS "resume_profiles_workspace_id_fkey";
ALTER TABLE IF EXISTS "workspace_job_states" DROP CONSTRAINT IF EXISTS "workspace_job_states_workspace_id_fkey";
ALTER TABLE IF EXISTS "job_matches" DROP CONSTRAINT IF EXISTS "job_matches_workspace_id_fkey";
ALTER TABLE IF EXISTS "workspaces" DROP CONSTRAINT IF EXISTS "workspaces_owner_id_fkey";
ALTER TABLE IF EXISTS "workspace_members" DROP CONSTRAINT IF EXISTS "workspace_members_user_id_fkey";
ALTER TABLE IF EXISTS "workspace_members" DROP CONSTRAINT IF EXISTS "workspace_members_workspace_id_fkey";

-- Rename workspace_id column to organization_id where applicable if column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='byok_credentials' AND column_name='workspace_id') THEN
        ALTER TABLE "byok_credentials" RENAME COLUMN "workspace_id" TO "organization_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='master_career_profiles' AND column_name='workspace_id') THEN
        ALTER TABLE "master_career_profiles" RENAME COLUMN "workspace_id" TO "organization_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resume_profiles' AND column_name='workspace_id') THEN
        ALTER TABLE "resume_profiles" RENAME COLUMN "workspace_id" TO "organization_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resume_versions' AND column_name='workspace_id') THEN
        ALTER TABLE "resume_versions" RENAME COLUMN "workspace_id" TO "organization_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspace_job_states' AND column_name='workspace_id') THEN
        ALTER TABLE "workspace_job_states" RENAME COLUMN "workspace_id" TO "organization_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_matches' AND column_name='workspace_id') THEN
        ALTER TABLE "job_matches" RENAME COLUMN "workspace_id" TO "organization_id";
    END IF;
END $$;

-- Drop old tables
DROP TABLE IF EXISTS "workspace_members";
DROP TABLE IF EXISTS "workspaces";

-- Add Foreign Keys
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_user_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "byok_credentials" ADD CONSTRAINT "byok_credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "master_career_profiles" ADD CONSTRAINT "master_career_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "resume_profiles" ADD CONSTRAINT "resume_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_job_states" ADD CONSTRAINT "workspace_job_states_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
