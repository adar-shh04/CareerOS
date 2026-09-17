# ADR 0003: Automatic Job Matching Orchestration and Ranking

**Status:** Accepted  
**Date:** 2026-08-18  
**Related:** Job Radar, Job Matching Engine, Resume Intelligence

## Context

Job Radar aims to present users with opportunities automatically matched and ranked according to their `MasterCareerProfile`.

Previously:
1. Job listings (`GET /workspaces/:workspaceId/jobs`) returned canonical jobs without matching unless a client explicitly called `POST .../jobs/:jobId/match`.
2. Matching logic could inadvertently be coupled inside the storage query layer (`listByWorkspace`), creating latency issues and preventing future asynchronous offloading.
3. If thousands of jobs exist in the system, auto-matching all unmatched jobs in a single request could trigger unbounded CPU load and request timeouts.
4. When a user updates their profile, stored matches could become silently stale without an explainable freshness mechanism.

## Decision

We establish the `ensureJobMatches()` orchestration pattern:

1. **Boundary Separation:**
   - Matching logic lives behind `ensureJobMatches(workspaceId, jobs, maxBatchSize)` in `JobsService`, completely separated from repository listing queries.
   - `GET /workspaces/:workspaceId/jobs` calls `ensureJobMatches()` synchronously before returning, but the boundary allows transparent offloading to background workers (e.g., Trigger.dev) in future phases without breaking API contracts.

2. **Explicit Batch Bounds:**
   - Auto-matching is bounded by `maxBatchSize` (matching the pagination limit, default 50). Unmatched jobs beyond the active page limit are processed lazily on demand.

3. **Freshness Tracking via Existing Profile Versioning:**
   - `JobMatch` records store `profileVersion` matching `MasterCareerProfile.version`.
   - When a user updates their Master Career Profile (incrementing its version), existing matches are identified as stale by `ensureJobMatches()` and recomputed automatically. No parallel versioning cache is needed.

4. **Deterministic Ranking and Tie-Breaking:**
   - Jobs returned by `GET /jobs` are automatically sorted by `match.overallScore` descending.
   - Deterministic tie-breaking orders by `postedAt` descending, `createdAt` descending, and `id` ascending.

## Consequences

**What we gained:**
- Instant, zero-click personalized Job Radar for newly onboarded and returning users.
- Bounded, safe computational complexity on `GET /jobs`.
- Stale matches are automatically refreshed when users update their skills or experience.
- Stable API boundary ready for future background worker offloading.
