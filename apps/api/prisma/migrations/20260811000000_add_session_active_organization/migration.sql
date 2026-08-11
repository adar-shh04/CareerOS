-- Better Auth's organization() plugin requires a nullable
-- `activeOrganizationId` field on the session model to track which
-- organization (workspace, in this schema) a session has selected as
-- active. This column never existed in any prior migration, which is
-- why every attempt to set/read an active organization on a session
-- failed at the Prisma layer with "Unknown argument `activeOrganizationId`".

-- AlterTable
ALTER TABLE "sessions"
ADD COLUMN "active_organization_id" UUID;

-- AddForeignKey
ALTER TABLE "sessions"
ADD CONSTRAINT "sessions_active_organization_id_fkey"
FOREIGN KEY ("active_organization_id") REFERENCES "workspaces"("id")
ON DELETE SET NULL ON UPDATE CASCADE;