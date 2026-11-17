-- Tenant integrity for workspace-owned (private) jobs.
--
-- jobs.owner_organization_id (added in 20261117120000_job_owner_organization)
-- marks a job as private to one workspace; NULL means shared catalog. The API
-- enforces visibility, but a foreign key only proves the job exists. These
-- triggers make the database itself refuse any Application, JobMatch or
-- WorkspaceJobState row that ties a PRIVATE job to a DIFFERENT workspace, for
-- every writer (API, scripts, manual SQL). Shared catalog jobs (owner NULL)
-- remain referenceable by every workspace.
--
-- Non-destructive: adds functions and triggers only. They validate future
-- writes; no existing row is read, rewritten or rejected by this migration.
-- Prisma does not model triggers, so `prisma migrate` neither diffs nor drops
-- them (same approach as 20260926115300_resume_reference_same_workspace).
-- Requires PostgreSQL (PL/pgSQL).

-- 1) Child side: a row may only reference a shared job or its own
--    workspace's private job.
CREATE OR REPLACE FUNCTION "careeros_assert_job_visible_to_workspace"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only validate references that are being set or changed.
  IF TG_OP = 'INSERT'
     OR NEW."job_id" IS DISTINCT FROM OLD."job_id"
     OR NEW."organization_id" IS DISTINCT FROM OLD."organization_id" THEN
    IF EXISTS (
      SELECT 1 FROM "jobs"
      WHERE "id" = NEW."job_id"
        AND "owner_organization_id" IS NOT NULL
        AND "owner_organization_id" <> NEW."organization_id"
    ) THEN
      RAISE EXCEPTION 'job % is private to another workspace and cannot be referenced by workspace %',
        NEW."job_id", NEW."organization_id"
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "trg_applications_job_visible_to_workspace"
BEFORE INSERT OR UPDATE OF "job_id", "organization_id"
ON "applications"
FOR EACH ROW
EXECUTE FUNCTION "careeros_assert_job_visible_to_workspace"();

CREATE TRIGGER "trg_job_matches_job_visible_to_workspace"
BEFORE INSERT OR UPDATE OF "job_id", "organization_id"
ON "job_matches"
FOR EACH ROW
EXECUTE FUNCTION "careeros_assert_job_visible_to_workspace"();

CREATE TRIGGER "trg_workspace_job_states_job_visible_to_workspace"
BEFORE INSERT OR UPDATE OF "job_id", "organization_id"
ON "workspace_job_states"
FOR EACH ROW
EXECUTE FUNCTION "careeros_assert_job_visible_to_workspace"();

-- 2) Parent side: a job cannot be made private to a workspace while another
--    workspace already references it (that would strand foreign rows on a job
--    they may no longer see).
CREATE OR REPLACE FUNCTION "careeros_assert_job_owner_matches_references"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."owner_organization_id" IS NOT NULL
     AND NEW."owner_organization_id" IS DISTINCT FROM OLD."owner_organization_id"
     AND (
       EXISTS (SELECT 1 FROM "applications"
               WHERE "job_id" = NEW."id"
                 AND "organization_id" <> NEW."owner_organization_id")
       OR EXISTS (SELECT 1 FROM "job_matches"
                  WHERE "job_id" = NEW."id"
                    AND "organization_id" <> NEW."owner_organization_id")
       OR EXISTS (SELECT 1 FROM "workspace_job_states"
                  WHERE "job_id" = NEW."id"
                    AND "organization_id" <> NEW."owner_organization_id")
     ) THEN
    RAISE EXCEPTION 'job % is referenced by other workspaces and cannot become private to workspace %',
      NEW."id", NEW."owner_organization_id"
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "trg_jobs_owner_matches_references"
BEFORE UPDATE OF "owner_organization_id"
ON "jobs"
FOR EACH ROW
EXECUTE FUNCTION "careeros_assert_job_owner_matches_references"();
