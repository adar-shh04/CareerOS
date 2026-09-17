# ADR-004: No automatic application submission

- **Status:** Accepted
- **Date:** 2026-07-21

## Context

Company portals vary and applications carry personal, legal, and strategic consequences. Automating submission can produce low-quality applications and create policy risks.

## Decision

CareerOS prepares the job, recommended resume, tailored cover letter, application checklist, and application link. The user reviews and submits through the employer’s portal, then records the outcome.

## Alternatives considered

- **Browser-driven auto-apply:** Rejected due to user-control, quality, reliability, and policy concerns.
- **Application-only tracking:** Rejected because it misses the opportunity to reduce preparation work.

## Consequences

The product must make handoff frictionless and track application status without claiming a submission happened unless the user confirms it.
