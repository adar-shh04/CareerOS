-- Stabilization Pass 2: make Job Radar state consistent with the Application
-- (the single source of truth for "applied" and pipeline stages).
--
-- Invariant after this migration (maintained by the API from here on):
--   workspace_job_states.status is DERIVED:
--     'applied'   if the workspace's application for the job is in an applied
--                 stage (applied/screening/interview/offer/rejected, or
--                 withdrawn after an applied date)
--     'dismissed' else if is_dismissed
--     'saved'     else if is_saved
--     'discovered' otherwise
--   workspace_job_states.applied_at = that application's applied_at, else NULL.
--
-- Non-destructive: before re-deriving, any "applied"/pipeline state that exists
-- only on the Job Radar row (possible before Pass 1, e.g. via the old
-- /jobs/:id/apply or /state endpoints) is preserved by creating the missing
-- Application, with a history entry explaining where it came from.

WITH orphaned AS (
  SELECT s."organization_id", s."job_id",
         CASE WHEN s."status" IN ('interview', 'offer', 'rejected') THEN s."status"
              ELSE 'applied' END AS "status",
         s."applied_at"
  FROM "workspace_job_states" s
  WHERE (s."status" IN ('applied', 'interview', 'offer', 'rejected') OR s."applied_at" IS NOT NULL)
    AND NOT EXISTS (
      SELECT 1 FROM "applications" a
      WHERE a."organization_id" = s."organization_id" AND a."job_id" = s."job_id"
    )
),
created AS (
  INSERT INTO "applications" ("id", "organization_id", "job_id", "status", "applied_at", "created_at", "updated_at")
  SELECT gen_random_uuid(), o."organization_id", o."job_id", o."status", o."applied_at", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM orphaned o
  RETURNING "id", "status"
)
INSERT INTO "application_status_history" ("id", "application_id", "status", "notes", "created_at")
SELECT gen_random_uuid(), c."id", c."status",
       'Backfilled from Job Radar state (stabilization migration).', CURRENT_TIMESTAMP
FROM created c;

-- Applications in an applied stage must have a Job Radar row to mirror them.
INSERT INTO "workspace_job_states" ("id", "organization_id", "job_id", "status", "is_saved", "is_dismissed", "applied_at", "created_at", "updated_at")
SELECT gen_random_uuid(), a."organization_id", a."job_id", 'applied', false, false, a."applied_at", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "applications" a
WHERE (a."status" IN ('applied', 'screening', 'interview', 'offer', 'rejected')
       OR (a."status" = 'withdrawn' AND a."applied_at" IS NOT NULL))
  AND NOT EXISTS (
    SELECT 1 FROM "workspace_job_states" s
    WHERE s."organization_id" = a."organization_id" AND s."job_id" = a."job_id"
  );

-- Re-derive status and applied_at for every Job Radar row.
UPDATE "workspace_job_states" s
SET "status" = CASE
      WHEN x."applied" THEN 'applied'
      WHEN s."is_dismissed" THEN 'dismissed'
      WHEN s."is_saved" THEN 'saved'
      ELSE 'discovered'
    END,
    "applied_at" = CASE WHEN x."applied" THEN x."applied_at" ELSE NULL END
FROM (
  SELECT s2."id",
         COALESCE(
           a."status" IN ('applied', 'screening', 'interview', 'offer', 'rejected')
           OR (a."status" = 'withdrawn' AND a."applied_at" IS NOT NULL),
           false
         ) AS "applied",
         a."applied_at"
  FROM "workspace_job_states" s2
  LEFT JOIN "applications" a
    ON a."organization_id" = s2."organization_id" AND a."job_id" = s2."job_id"
) x
WHERE x."id" = s."id";
