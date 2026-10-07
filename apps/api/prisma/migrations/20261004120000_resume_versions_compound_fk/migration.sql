-- Stabilization Pass 4 (D2): Enforce compound foreign-key relational integrity
-- between resume_versions and resume_profiles (id, organization_id), as well as
-- foreign-key ownership between resume_versions and organizations (id).
-- This guarantees at the database level that a resume version can NEVER belong to
-- an organization different from its parent resume profile.

-- ── Data cleanup / repair (safety check before adding constraints) ───────────
-- If any resume_version references a resume_profile from a different workspace
-- or a non-existent profile, remove it so the foreign key can be created cleanly.
DELETE FROM "resume_versions" rv
WHERE NOT EXISTS (
  SELECT 1 FROM "resume_profiles" rp
  WHERE rp."id" = rv."resume_profile_id"
    AND rp."organization_id" = rv."organization_id"
);

-- If any resume_version references a non-existent organization, remove it.
DELETE FROM "resume_versions" rv
WHERE NOT EXISTS (
  SELECT 1 FROM "organizations" o
  WHERE o."id" = rv."organization_id"
);

-- ── Schema changes ───────────────────────────────────────────────────────────
-- Drop legacy simple foreign key
ALTER TABLE "resume_versions" DROP CONSTRAINT IF EXISTS "resume_versions_resume_profile_id_fkey";

-- Create unique index on (id, organization_id) for resume_profiles to allow compound foreign key
CREATE UNIQUE INDEX IF NOT EXISTS "resume_profiles_id_organization_id_key" ON "resume_profiles"("id", "organization_id");

-- Create unique index on (id, organization_id) for resume_versions
CREATE UNIQUE INDEX IF NOT EXISTS "resume_versions_id_organization_id_key" ON "resume_versions"("id", "organization_id");

-- Add foreign key from resume_versions.organization_id to organizations.id
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add compound foreign key from resume_versions(resume_profile_id, organization_id) to resume_profiles(id, organization_id)
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_resume_profile_id_organization_id_fkey" FOREIGN KEY ("resume_profile_id", "organization_id") REFERENCES "resume_profiles"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
