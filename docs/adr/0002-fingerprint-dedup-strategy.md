# ADR 0002: Canonical Job Fingerprint Deduplication Strategy

**Status:** Accepted  
**Date:** 2026-08-18  
**Related:** Job Engine, Ingestion Pipeline, Multi-tenancy

## Context

CareerOS ingests job postings across multiple source adapters (e.g., manual entry, LinkedIn/Apify scrapers, future job board plugins). In a multi-source ecosystem, the same real-world job opportunity may be published with different external IDs across sources, or re-posted without an external ID.

Without a canonical identity mechanism:
1. Duplicate opportunities clutter the user's Job Radar.
2. Multiple match calculations and workspace state entries are created for the same role.
3. User interactions (saved, dismissed, notes) become fragmented across duplicate rows.

## Decision

We introduce a deterministic **SHA-256 fingerprint** strategy for canonical jobs:

1. **Fingerprint Definition:**
   - Canonical job identity is computed from normalized core attributes: `clean(company) | clean(title) | clean(location)`.
   - String cleaning lowercases, removes all non-alphanumeric characters, and trims whitespace.
   - The result is hashed via SHA-256 to produce a 64-character hex digest.

2. **Schema and Uniqueness:**
   - The `Job` model contains an indexed `fingerprint String? @unique` field alongside `@@unique([source, externalId])`.
   - Ingestion checks both `(source, externalId)` and `fingerprint`.
   - When a job matching an existing fingerprint is encountered, the existing canonical record is updated rather than inserting a duplicate.

3. **Conservative Deduplication:**
   - Semantic title changes (e.g., "Sr. Engineer" vs "Senior Engineer") produce distinct fingerprints by design in Phase 1 to prevent false-positive merges without human review.
   - Fuzzy semantic deduplication is deferred to future AI-assisted pipelines.

## Consequences

**What we gained:**
- Idempotent ingestion across multiple scrapers and manual imports.
- Re-running scrapers or fetching live market data never creates duplicate cards in Job Radar.
- Preserves workspace interaction state (`WorkspaceJobState`) attached to one canonical job ID.

**Trade-offs:**
- Intentional minor differences in titles across job boards (e.g. "Software Engineer II" vs "Software Engineer 2") will not merge automatically without exact normalized character match.
