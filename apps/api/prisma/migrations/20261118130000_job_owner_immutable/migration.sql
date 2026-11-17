-- Close a concurrency hole in the workspace-private job integrity triggers
-- (20261118120000_job_owner_integrity_triggers) and make job ownership
-- immutable.
--
-- THE DEFECT (reproduced on PostgreSQL 17.10 with two connections):
--   T1: BEGIN; INSERT workspace_job_states (org B -> shared job);   -- valid now
--   T2: BEGIN; UPDATE jobs SET owner_organization_id = A;           -- no wait
--   T2: COMMIT; T1: COMMIT;
--   => a committed row of workspace B references a job private to workspace A.
-- Why: the child trigger read `jobs` with a plain SELECT and the foreign-key
-- check only takes FOR KEY SHARE on the job row. An UPDATE of a non-key column
-- takes FOR NO KEY UPDATE, which does not conflict with KEY SHARE, so nothing
-- serialized the two transactions; and the parent-side trigger looked for
-- children with a snapshot read, so it could not see T1's uncommitted row.
--
-- WHY IMMUTABILITY (instead of only adding row locks):
--   * No application flow ever changes a job's owner: private jobs are inserted
--     once by the manual-entry path and never updated into another owner, and
--     catalog ingestion only ever matches shared rows (owner NULL). The only
--     writer that touches the column re-writes the same value.
--   * Locking the job row FOR SHARE in the child trigger would also close the
--     race, but it would make every child insert block ordinary updates of hot
--     shared catalog rows, and would preserve an operation nobody needs.
--   * Private -> shared would silently publish one workspace's pasted job
--     description to every workspace, so it should not be possible at all.
--   * With an immutable owner there is no state transition left to race
--     against: the value the child trigger reads can never change afterwards.
--
-- THE CHILD CHECK (applications, job_matches, workspace_job_states) now reads
-- the job row with FOR KEY SHARE (the same lock the foreign key takes, so it
-- adds no new contention) and fails closed when the row is not visible to the
-- trigger's snapshot. The latter closes the tiny window in which a job
-- committed between the trigger's read and the foreign-key check could be
-- referenced without its owner ever being inspected. In every legitimate flow
-- the job already exists and is visible, so valid writes are unaffected.
--
-- Non-destructive: replaces trigger functions, swaps one trigger, and aborts
-- (rather than rewriting data) if existing rows already break the invariant.
-- Previously applied migrations are untouched. Requires PostgreSQL (PL/pgSQL).

-- 0) Refuse to proceed over existing violations; never rewrite tenant data.
DO $$
DECLARE
  violations bigint;
BEGIN
  SELECT count(*) INTO violations FROM (
    SELECT a."id" FROM "applications" a
      JOIN "jobs" j ON j."id" = a."job_id"
     WHERE j."owner_organization_id" IS NOT NULL
       AND j."owner_organization_id" <> a."organization_id"
    UNION ALL
    SELECT m."id" FROM "job_matches" m
      JOIN "jobs" j ON j."id" = m."job_id"
     WHERE j."owner_organization_id" IS NOT NULL
       AND j."owner_organization_id" <> m."organization_id"
    UNION ALL
    SELECT s."id" FROM "workspace_job_states" s
      JOIN "jobs" j ON j."id" = s."job_id"
     WHERE j."owner_organization_id" IS NOT NULL
       AND j."owner_organization_id" <> s."organization_id"
  ) v;
  IF violations > 0 THEN
    RAISE EXCEPTION '% existing row(s) reference another workspace''s private job; resolve them before applying this migration',
      violations
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- 1) Child side: locked read, fail closed. Same trigger names as before, so
--    no trigger needs to be recreated on the child tables.
CREATE OR REPLACE FUNCTION "careeros_assert_job_visible_to_workspace"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  job_owner uuid;
BEGIN
  -- Only validate references that are being set or changed.
  IF TG_OP = 'INSERT'
     OR NEW."job_id" IS DISTINCT FROM OLD."job_id"
     OR NEW."organization_id" IS DISTINCT FROM OLD."organization_id" THEN
    SELECT "owner_organization_id" INTO job_owner
      FROM "jobs"
     WHERE "id" = NEW."job_id"
       FOR KEY SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'job % does not exist or is not visible to this transaction',
        NEW."job_id"
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF job_owner IS NOT NULL AND job_owner <> NEW."organization_id" THEN
      RAISE EXCEPTION 'job % is private to another workspace and cannot be referenced by workspace %',
        NEW."job_id", NEW."organization_id"
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Parent side: the snapshot-based "any foreign references?" trigger cannot
--    be made race-free by itself; replace it with immutability.
DROP TRIGGER IF EXISTS "trg_jobs_owner_matches_references" ON "jobs";
DROP FUNCTION IF EXISTS "careeros_assert_job_owner_matches_references"();

CREATE OR REPLACE FUNCTION "careeros_forbid_job_owner_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."owner_organization_id" IS DISTINCT FROM OLD."owner_organization_id" THEN
    RAISE EXCEPTION 'jobs.owner_organization_id is immutable (job %): a job cannot change between shared and private or between workspaces',
      OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "trg_jobs_owner_immutable"
BEFORE UPDATE OF "owner_organization_id"
ON "jobs"
FOR EACH ROW
EXECUTE FUNCTION "careeros_forbid_job_owner_change"();
