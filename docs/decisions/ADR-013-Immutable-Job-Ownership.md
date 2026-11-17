# ADR-013: Job ownership is immutable after creation

- **Status:** Accepted
- **Date:** 2026-11-18
- **Related:** [ADR-002](../adr/ADR-002-Multi-Tenant-Architecture.md) (multi-tenant architecture), [ADR 0002](../adr/0002-fingerprint-dedup-strategy.md) (job fingerprint deduplication)

## Context

The `jobs` table is a shared catalog (seeded and ingested jobs) that every workspace can read. Manual job entry added a second kind of job: a posting a user pasted in, which must stay private to that workspace.

## Decision

`jobs.owner_organization_id` defines who may see and reference a job:

| Value | Meaning |
| --- | --- |
| `NULL` | Shared catalog job. Visible to, and referenceable by, every workspace. |
| a workspace id | Private job. Visible only to that workspace, and only that workspace's `applications`, `job_matches` and `workspace_job_states` may reference it. |

**The owner is set when the job is created and never changes.** A job cannot move from shared to private, from private to shared, or from one workspace to another by updating the row. Deleting a workspace deletes the private jobs it owns (`ON DELETE CASCADE`); shared jobs are unaffected.

The invariant is enforced in the database, not only in services (migrations `20261118120000_job_owner_integrity_triggers` and `20261118130000_job_owner_immutable`):

- `trg_jobs_owner_immutable` rejects any update that changes the owner.
- `trg_applications_…`, `trg_job_matches_…` and `trg_workspace_job_states_job_visible_to_workspace` reject a row that references another workspace's private job. They read the job under `FOR KEY SHARE`, and reject the write if the job is not visible.
- The application layer applies the same visibility rule on every read path, and never writes the owner column on update. The database remains the backstop for any writer (API, scripts, manual SQL).

## Why in-place changes are prohibited

1. **A race that cannot be closed cheaply.** With a mutable owner, "workspace B references a shared job" and "the job becomes private to workspace A" can both commit. This was reproduced on PostgreSQL 17 with two connections (the previous snapshot-based checks could not see each other's uncommitted rows). Making the owner immutable removes the race by construction. The alternative, locking the job row in every child insert, would make ordinary updates to hot shared rows wait on workspace activity.
2. **Private to shared is a data leak.** It would publish one workspace's pasted job description to every workspace.
3. **No product flow needs it.** Private jobs are created once by manual entry. Catalog ingestion only ever matches shared rows.

## Alternatives considered

- **Mutable owner with row locking (`FOR SHARE` in the child trigger).** Correct, but adds contention on shared rows and preserves an operation nobody needs.
- **Application-level checks only.** Rejected: it does not hold against concurrent transactions or non-API writers.

## Consequences

- Seeds, scripts and ingestion must never set `owner_organization_id` on an existing row. Updates that omit the column, or re-write the same value, are fine.
- **If ownership transfer is ever required**, it needs an explicit, reviewed workflow, not an `UPDATE`: create a new job with the new owner, re-associate the workspace's references through a migration or admin procedure that preserves the tenant invariant, then retire the old row. That workflow needs its own ADR, including how to handle another workspace's data.
- Tests: `apps/api/src/job-owner-integrity.db.spec.ts` (real PostgreSQL, separate connections and transactions) and the ownership cases in `apps/api/src/domain-integrity.db.spec.ts`.
