-- Stabilization Pass 2: database-level workspace ownership for resume
-- references. A foreign key only proves the referenced row exists; this trigger
-- also rejects references to a resume profile/version owned by another
-- workspace, for every writer (API, scripts, manual SQL).
--
-- Prisma does not model triggers, so `prisma migrate` neither diffs nor drops
-- it. Requires PostgreSQL (PL/pgSQL).

CREATE OR REPLACE FUNCTION "careeros_assert_resume_refs_same_workspace"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only references that are being set or changed are validated. This matters
  -- for ON DELETE SET NULL cascades: deleting a resume profile nulls
  -- applications.resume_profile_id while its versions are being deleted too, so
  -- re-checking the (unchanged, about-to-be-nulled) version would fail.
  IF NEW."resume_profile_id" IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR NEW."resume_profile_id" IS DISTINCT FROM OLD."resume_profile_id"
          OR NEW."organization_id" IS DISTINCT FROM OLD."organization_id")
     AND NOT EXISTS (
    SELECT 1 FROM "resume_profiles"
    WHERE "id" = NEW."resume_profile_id"
      AND "organization_id" = NEW."organization_id"
  ) THEN
    RAISE EXCEPTION 'resume profile % does not belong to workspace %',
      NEW."resume_profile_id", NEW."organization_id"
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Nested IF: job_matches has no resume_version_id column, so this branch must
  -- only be evaluated for applications.
  IF TG_TABLE_NAME = 'applications' THEN
    IF NEW."resume_version_id" IS NOT NULL
       AND (TG_OP = 'INSERT'
            OR NEW."resume_version_id" IS DISTINCT FROM OLD."resume_version_id"
            OR NEW."organization_id" IS DISTINCT FROM OLD."organization_id")
       AND NOT EXISTS (
      SELECT 1 FROM "resume_versions"
      WHERE "id" = NEW."resume_version_id"
        AND "organization_id" = NEW."organization_id"
    ) THEN
      RAISE EXCEPTION 'resume version % does not belong to workspace %',
        NEW."resume_version_id", NEW."organization_id"
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "trg_applications_resume_refs_same_workspace"
BEFORE INSERT OR UPDATE OF "resume_profile_id", "resume_version_id", "organization_id"
ON "applications"
FOR EACH ROW
EXECUTE FUNCTION "careeros_assert_resume_refs_same_workspace"();

CREATE TRIGGER "trg_job_matches_resume_profile_same_workspace"
BEFORE INSERT OR UPDATE OF "resume_profile_id", "organization_id"
ON "job_matches"
FOR EACH ROW
EXECUTE FUNCTION "careeros_assert_resume_refs_same_workspace"();
