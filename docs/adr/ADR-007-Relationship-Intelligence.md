# ADR-007: Relationship Intelligence is a core, user-owned graph

- **Status:** Accepted
- **Date:** 2026-07-21

## Context

Networking, alumni relationships, referrals, and thoughtful follow-ups materially improve job-search outcomes but are hard to organize across companies and roles.

## Decision

CareerOS maintains tenant-scoped people, companies, roles, affiliations, interactions, referrals, notes, and follow-up relationships. It can recommend ethical next actions and draft messages for user review.

## Alternatives considered

- **Flat contact list:** Rejected because it cannot represent relationship context or build useful follow-up workflows.
- **Automated prospecting and mass outreach:** Rejected because it violates the product’s quality, consent, and user-control principles.

## Consequences

Relationship data needs provenance, privacy controls, and clear user edits. Scoring must prioritize relevance and context, never private-data harvesting.
