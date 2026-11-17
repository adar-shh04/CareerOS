-- Manual job entry: let a workspace own a private job.
--
-- Non-destructive and additive: one nullable column, one index, one FK.
-- Every existing row gets owner_organization_id = NULL, which means
-- "shared catalog job" and keeps today's behaviour (visible to all workspaces).
-- Owned jobs are deleted with their organization (they are that workspace's
-- private data); shared catalog jobs are never affected.

ALTER TABLE "jobs" ADD COLUMN "owner_organization_id" UUID;

CREATE INDEX "jobs_owner_organization_id_idx" ON "jobs"("owner_organization_id");

ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_owner_organization_id_fkey"
  FOREIGN KEY ("owner_organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
