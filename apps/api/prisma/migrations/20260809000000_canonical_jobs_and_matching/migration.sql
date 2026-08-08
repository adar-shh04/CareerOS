-- Add canonical jobs table (global, not workspace-owned)
CREATE TABLE "jobs" (
    "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_id"         TEXT,
    "source"              TEXT NOT NULL DEFAULT 'manual',
    "source_url"          TEXT,
    "company"             TEXT NOT NULL,
    "title"               TEXT NOT NULL,
    "location"            TEXT NOT NULL,
    "is_remote"           BOOLEAN NOT NULL DEFAULT false,
    "remote_policy"       TEXT,
    "employment_type"     TEXT,
    "salary_min"          DOUBLE PRECISION,
    "salary_max"          DOUBLE PRECISION,
    "salary_currency"     TEXT,
    "salary_range"        TEXT,
    "description"         TEXT,
    "required_skills"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "preferred_skills"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "posted_at"           TIMESTAMP(3),
    "expires_at"          TIMESTAMP(3),
    "raw_metadata"        JSONB,
    "normalized_metadata" JSONB,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- Deduplicate jobs across ingestion runs: unique on (source, external_id) when external_id is not null
CREATE UNIQUE INDEX "jobs_source_external_id_key"
    ON "jobs"("source", "external_id")
    WHERE "external_id" IS NOT NULL;

CREATE INDEX "jobs_company_idx" ON "jobs"("company");
CREATE INDEX "jobs_title_idx"   ON "jobs"("title");

-- Workspace-specific interaction state for a canonical job
CREATE TABLE "workspace_job_states" (
    "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "job_id"       UUID NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'discovered',
    "is_saved"     BOOLEAN NOT NULL DEFAULT false,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "notes"        TEXT,
    "applied_at"   TIMESTAMP(3),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_job_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_job_states_workspace_id_job_id_key"
    ON "workspace_job_states"("workspace_id", "job_id");
CREATE INDEX "workspace_job_states_workspace_id_idx" ON "workspace_job_states"("workspace_id");
CREATE INDEX "workspace_job_states_job_id_idx"       ON "workspace_job_states"("job_id");

ALTER TABLE "workspace_job_states"
    ADD CONSTRAINT "workspace_job_states_workspace_id_fkey"
        FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_job_states"
    ADD CONSTRAINT "workspace_job_states_job_id_fkey"
        FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Persisted match result: one record per (workspace, job, resume_profile)
CREATE TABLE "job_matches" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id"           UUID NOT NULL,
    "workspace_id"     UUID NOT NULL,
    "resume_profile_id" UUID,
    "overall_score"    DOUBLE PRECISION NOT NULL,
    "skill_score"      DOUBLE PRECISION NOT NULL,
    "role_score"       DOUBLE PRECISION NOT NULL,
    "experience_score" DOUBLE PRECISION NOT NULL,
    "location_score"   DOUBLE PRECISION NOT NULL,
    "seniority_score"  DOUBLE PRECISION NOT NULL,
    "matched_skills"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "missing_skills"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "confidence"       DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "explanation"      TEXT NOT NULL,
    "evidence"         JSONB,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_matches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_matches_workspace_job_profile_key"
    ON "job_matches"("workspace_id", "job_id", "resume_profile_id")
    WHERE "resume_profile_id" IS NOT NULL;

-- Separate partial index for rows where resume_profile_id IS NULL (profile-agnostic match)
CREATE UNIQUE INDEX "job_matches_workspace_job_no_profile_key"
    ON "job_matches"("workspace_id", "job_id")
    WHERE "resume_profile_id" IS NULL;

CREATE INDEX "job_matches_workspace_id_idx" ON "job_matches"("workspace_id");
CREATE INDEX "job_matches_job_id_idx"       ON "job_matches"("job_id");

ALTER TABLE "job_matches"
    ADD CONSTRAINT "job_matches_job_id_fkey"
        FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_matches"
    ADD CONSTRAINT "job_matches_workspace_id_fkey"
        FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_matches"
    ADD CONSTRAINT "job_matches_resume_profile_id_fkey"
        FOREIGN KEY ("resume_profile_id") REFERENCES "resume_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
